import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/auth";
import { assertMembership } from "@/lib/tenant";

async function ensureAccess(req: NextRequest, id: string): Promise<{ schoolId: string } | NextResponse> {
  const exam = await prisma.exam.findUnique({ where: { id }, select: { schoolId: true } });
  if (!exam) return NextResponse.json({ message: "Not found" }, { status: 404 });
  const deny = await assertMembership(req, exam.schoolId);
  if (deny) return deny;
  return { schoolId: exam.schoolId };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const item = await prisma.exam.findUnique({
    where: { id: params.id },
    include: {
      subject: { select: { id: true, name: true } },
      class: { select: { id: true, name: true } },
      period: { select: { id: true, type: true } },
      academicYear: { select: { id: true, label: true } },
    },
  });
  if (!item) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({
    id: item.id,
    title: item.title,
    subjectId: item.subjectId,
    classId: item.classId,
    academicYearId: item.academicYearId,
    periodId: item.periodId,
    startAt: item.startAt,
    endAt: item.endAt,
    durationMinutes: item.durationMinutes,
    totalQuestions: item.totalQuestions,
    randomizeQs: item.randomizeQs,
    randomizeOpts: item.randomizeOpts,
    published: item.published,
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/EXAMS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ensured = await ensureAccess(req, params.id);
    if (ensured instanceof NextResponse) return ensured;

    const schema = z.object({
      title: z.string().trim().min(1),
      subjectId: z.string().trim().min(1),
      classId: z.string().trim().min(1),
      academicYearId: z.string().trim().min(1),
      periodId: z.string().trim().min(1),
      startAt: z.string().datetime(),
      endAt: z.string().datetime(),
      durationMinutes: z.number().int().min(1),
      totalQuestions: z.number().int().min(1),
      randomizeQs: z.boolean().optional(),
      randomizeOpts: z.boolean().optional(),
      published: z.boolean().optional(),
    });
    const body = zparse(schema, await req.json());
    const data: any = {
      title: body.title,
      subjectId: body.subjectId,
      classId: body.classId,
      academicYearId: body.academicYearId,
      periodId: body.periodId,
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
      durationMinutes: body.durationMinutes,
      totalQuestions: body.totalQuestions,
      randomizeQs: body.randomizeQs ?? true,
      randomizeOpts: body.randomizeOpts ?? true,
      published: body.published ?? false,
    };
    await prisma.exam.update({ where: { id: params.id }, data });
    return NextResponse.json({ id: params.id });
  } catch (e: any) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/EXAMS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ensured = await ensureAccess(req, params.id);
    if (ensured instanceof NextResponse) return ensured;

    const schema = z.object({ published: z.boolean() });
    const { published } = zparse(schema, await req.json());
    await prisma.exam.update({ where: { id: params.id }, data: { published } });
    return NextResponse.json({ id: params.id, published });
  } catch (e: any) {
    return handleApiError(e);
  }
}

