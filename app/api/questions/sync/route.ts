import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/auth";
import { resolveSchoolContext } from "@/lib/tenant";
import fs from "fs/promises";
import path from "path";

const OptionSchema = z.object({ key: z.string().min(1), text: z.string().min(1) });
const ItemSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["MCQ", "ESSAY"]),
  text: z.string().min(1),
  options: z.array(OptionSchema).optional(),
  correctKey: z.string().optional(),
  points: z.number().int().min(0).default(1),
  difficulty: z.number().int().min(0).max(10).default(1),
  academicYearId: z.string().optional().nullable(),
  periodId: z.string().optional().nullable(),
  attachmentUrl: z.string().url().optional().nullable(),
  attachmentType: z.string().optional().nullable(),
  audioUrl: z.string().url().optional().nullable(),
});

const Schema = z.object({ subjectId: z.string().min(1), items: z.array(ItemSchema) });

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/QUESTIONS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ctx = await resolveSchoolContext(req);
    if (ctx instanceof NextResponse) return ctx;
    const { subjectId, items } = zparse(Schema, await req.json());
    const subj = await prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true, schoolId: true } });
    if (!subj || subj.schoolId !== ctx.schoolId) return NextResponse.json({ message: "Subject tidak valid untuk sekolah aktif" }, { status: 400 });

    const token = req.cookies.get(ACCESS_COOKIE)?.value;
    const payload = token ? await verifyAccessToken(token) : null;
    if (!payload?.sub) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    const existing = await prisma.question.findMany({ where: { subjectId, schoolId: ctx.schoolId } });
    const existingMap = new Map(existing.map((q) => [q.id, q] as const));
    const existingIds = new Set(existing.map((q) => q.id));
    const desiredIds = new Set(items.filter((i) => i.id).map((i) => i.id as string));

    const toDelete = Array.from(existingIds).filter((id) => !desiredIds.has(id));
    const toUpdate = items.filter((i) => i.id && existingIds.has(i.id));
    const toCreate = items.filter((i) => !i.id);

    const deleteUrls: Array<string> = [];

    await prisma.$transaction(async (tx) => {
      if (toDelete.length) await tx.question.deleteMany({ where: { id: { in: toDelete } } });
      // schedule deletion of files for deleted questions
      for (const id of toDelete) {
        const old = existingMap.get(id);
        if (old?.attachmentUrl) deleteUrls.push(old.attachmentUrl);
        if (old?.audioUrl) deleteUrls.push(old.audioUrl);
      }
      for (const it of toUpdate) {
        // optional validate AY/Period per item
        if (it.academicYearId) {
          const ay = await tx.academicYear.findUnique({ where: { id: it.academicYearId }, select: { schoolId: true } });
          if (!ay || ay.schoolId !== ctx.schoolId) throw new Error("Tahun ajaran tidak valid");
        }
        if (it.periodId) {
          const p = await tx.period.findUnique({ where: { id: it.periodId }, select: { schoolId: true, academicYearId: true } });
          if (!p || p.schoolId !== ctx.schoolId) throw new Error("Periode tidak valid");
          if (it.academicYearId && p.academicYearId !== it.academicYearId) throw new Error("Periode tidak sesuai tahun ajaran");
        }
        // schedule deletion if old files are replaced/cleared
        const old = existingMap.get(it.id!);
        if (old) {
          const hasAtt = Object.prototype.hasOwnProperty.call(it as any, 'attachmentUrl');
          const hasAud = Object.prototype.hasOwnProperty.call(it as any, 'audioUrl');
          const newAtt = hasAtt ? ((it as any).attachmentUrl ?? null) : old.attachmentUrl;
          const newAud = hasAud ? ((it as any).audioUrl ?? null) : old.audioUrl;
          if (old.attachmentUrl && old.attachmentUrl !== newAtt) deleteUrls.push(old.attachmentUrl);
          if (old.audioUrl && old.audioUrl !== newAud) deleteUrls.push(old.audioUrl);
        }
        await tx.question.update({
          where: { id: it.id },
          data: ({ type: it.type, text: it.text, options: it.options as any, correctKey: it.correctKey, points: it.points, difficulty: it.difficulty, academicYearId: (it as any).academicYearId ?? null, periodId: (it as any).periodId ?? null, attachmentUrl: (it as any).attachmentUrl ?? null, attachmentType: (it as any).attachmentType ?? null, audioUrl: (it as any).audioUrl ?? null } as any),
        });
      }
      for (const it of toCreate) {
        if (it.academicYearId) {
          const ay = await tx.academicYear.findUnique({ where: { id: it.academicYearId }, select: { schoolId: true } });
          if (!ay || ay.schoolId !== ctx.schoolId) throw new Error("Tahun ajaran tidak valid");
        }
        if (it.periodId) {
          const p = await tx.period.findUnique({ where: { id: it.periodId }, select: { schoolId: true, academicYearId: true } });
          if (!p || p.schoolId !== ctx.schoolId) throw new Error("Periode tidak valid");
          if (it.academicYearId && p.academicYearId !== it.academicYearId) throw new Error("Periode tidak sesuai tahun ajaran");
        }
        await tx.question.create({
          data: ({ schoolId: subj.schoolId, subjectId, type: it.type, text: it.text, options: it.options as any, correctKey: it.correctKey, points: it.points, difficulty: it.difficulty, createdById: payload.sub, academicYearId: (it as any).academicYearId ?? null, periodId: (it as any).periodId ?? null, attachmentUrl: (it as any).attachmentUrl ?? null, attachmentType: (it as any).attachmentType ?? null, audioUrl: (it as any).audioUrl ?? null } as any),
        });
      }
    }, { timeout: 120_000, maxWait: 10_000 });

    // After successful transaction, delete files on disk for collected URLs
    const isLocal = (url: string) => url && url.startsWith("/uploads/");
    const toPath = (url: string) => path.join(process.cwd(), "public", url.replace(/^\//, ""));
    for (const u of deleteUrls) {
      if (!u) continue;
      if (!isLocal(u)) continue;
      try { await fs.unlink(toPath(u)); } catch {}
    }

    return NextResponse.json({ ok: true, created: toCreate.length, updated: toUpdate.length, deleted: toDelete.length });
  } catch (e: any) {
    return handleApiError(e);
  }
}
