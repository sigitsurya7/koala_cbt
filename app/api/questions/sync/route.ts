import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/auth";
import { enforceActiveSchool } from "@/lib/tenant";

const OptionSchema = z.object({ key: z.string().min(1), text: z.string().min(1) });
const ItemSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["MCQ", "ESSAY"]),
  text: z.string().min(1),
  options: z.array(OptionSchema).optional(),
  correctKey: z.string().optional(),
  points: z.number().int().min(0).default(1),
  difficulty: z.number().int().min(0).max(10).default(1),
});

const Schema = z.object({ subjectId: z.string().min(1), items: z.array(ItemSchema) });

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/QUESTIONS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ensured = await enforceActiveSchool(req);
    if (ensured instanceof NextResponse) return ensured;
    const { subjectId, items } = zparse(Schema, await req.json());
    const subj = await prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true, schoolId: true } });
    if (!subj || subj.schoolId !== ensured.schoolId) return NextResponse.json({ message: "Subject tidak valid untuk sekolah aktif" }, { status: 400 });

    const token = req.cookies.get(ACCESS_COOKIE)?.value;
    const payload = token ? await verifyAccessToken(token) : null;
    const existing = await prisma.question.findMany({ where: { subjectId, schoolId: ensured.schoolId } });
    const existingIds = new Set(existing.map((q) => q.id));
    const desiredIds = new Set(items.filter((i) => i.id).map((i) => i.id as string));

    const toDelete = Array.from(existingIds).filter((id) => !desiredIds.has(id));
    const toUpdate = items.filter((i) => i.id && existingIds.has(i.id));
    const toCreate = items.filter((i) => !i.id);

    await prisma.$transaction(async (tx) => {
      if (toDelete.length) await tx.question.deleteMany({ where: { id: { in: toDelete } } });
      for (const it of toUpdate) {
        await tx.question.update({
          where: { id: it.id },
          data: { type: it.type, text: it.text, options: it.options as any, correctKey: it.correctKey, points: it.points, difficulty: it.difficulty },
        });
      }
      for (const it of toCreate) {
        await tx.question.create({
          data: { schoolId: subj.schoolId, subjectId, type: it.type, text: it.text, options: it.options as any, correctKey: it.correctKey, points: it.points, difficulty: it.difficulty, createdById: payload?.sub || undefined },
        });
      }
    }, { timeout: 120_000, maxWait: 10_000 });

    return NextResponse.json({ ok: true, created: toCreate.length, updated: toUpdate.length, deleted: toDelete.length });
  } catch (e: any) {
    return handleApiError(e);
  }
}
