import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { buildSearchWhere, pageToSkipTake, parsePageQuery } from "@/lib/pagination";
import { requirePermission } from "@/lib/acl";
import { resolveSchoolContext } from "@/lib/tenant";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/auth";
import { prisma as _prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/QUESTIONS" });
  if (deny) return deny;
  const ctx = await resolveSchoolContext(req);
  if (ctx instanceof NextResponse) return ctx;
  const { q, page, perPage } = parsePageQuery(req);
  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId") || undefined;
  const academicYearId = searchParams.get("academicYearId") || undefined;
  const periodId = searchParams.get("periodId") || undefined;
  const where: any = {
    schoolId: ctx.schoolId,
    ...(subjectId ? { subjectId } : {}),
    ...(academicYearId ? { academicYearId } : {}),
    ...(periodId ? { periodId } : {}),
    ...(buildSearchWhere(["text"], q) as any),
  };
  const total = await prisma.question.count({ where });
  const { skip, take } = pageToSkipTake(page, perPage);
  const data = await prisma.question.findMany({ where, orderBy: [{ createdAt: "asc" }], skip, take, select: ({ id: true, type: true, text: true, points: true, difficulty: true, options: true, correctKey: true, subjectId: true, attachmentUrl: true, attachmentType: true, audioUrl: true } as any) });
  return NextResponse.json({ data, page, perPage, total, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/QUESTIONS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ctx = await resolveSchoolContext(req);
    if (ctx instanceof NextResponse) return ctx;
    const schema = z.object({
      subjectId: z.string().trim().min(1),
      type: z.enum(["MCQ", "ESSAY"]),
      text: z.string().trim().min(1),
      options: z.array(z.object({ key: z.string(), text: z.string() })).optional(),
      correctKey: z.string().optional(),
      points: z.number().int().min(0).default(1),
      difficulty: z.number().int().min(0).max(10).default(1),
      academicYearId: z.string().trim().optional().nullable(),
      periodId: z.string().trim().optional().nullable(),
      attachmentUrl: z.string().url().optional().nullable(),
      attachmentType: z.string().optional().nullable(),
      audioUrl: z.string().url().optional().nullable(),
    });
    const body = zparse(schema, await req.json());
    const token = req.cookies.get(ACCESS_COOKIE)?.value;
    const payload = token ? await verifyAccessToken(token) : null;
    if (!payload?.sub) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    // tenant check: subject must belong to active school
    const subj = await prisma.subject.findUnique({ where: { id: body.subjectId }, select: { schoolId: true } });
    if (!subj || subj.schoolId !== ctx.schoolId) return NextResponse.json({ message: "Subject tidak valid untuk sekolah aktif" }, { status: 400 });
    // optional: validate AY/Period
    if (body.academicYearId) {
      const ay = await prisma.academicYear.findUnique({ where: { id: body.academicYearId }, select: { schoolId: true } });
      if (!ay || ay.schoolId !== ctx.schoolId) return NextResponse.json({ message: "Tahun ajaran tidak valid" }, { status: 400 });
    }
    if (body.periodId) {
      const period = await prisma.period.findUnique({ where: { id: body.periodId }, select: { schoolId: true, academicYearId: true } });
      if (!period || period.schoolId !== ctx.schoolId) return NextResponse.json({ message: "Periode tidak valid" }, { status: 400 });
      if (body.academicYearId && period.academicYearId !== body.academicYearId) return NextResponse.json({ message: "Periode tidak sesuai tahun ajaran" }, { status: 400 });
    }
    const created = await prisma.question.create({
      data: ({
        schoolId: ctx.schoolId,
        subjectId: body.subjectId,
        type: body.type,
        text: body.text,
        options: body.options as any,
        correctKey: body.correctKey,
        points: body.points,
        difficulty: body.difficulty,
        createdById: payload.sub,
        academicYearId: body.academicYearId ?? null,
        periodId: body.periodId ?? null,
        attachmentUrl: (body as any).attachmentUrl ?? null,
        attachmentType: (body as any).attachmentType ?? null,
        audioUrl: (body as any).audioUrl ?? null,
      } as any),
      select: { id: true },
    });
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return handleApiError(e);
  }
}

