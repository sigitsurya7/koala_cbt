import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/auth";
import { resolveSchoolContext } from "@/lib/tenant";
import { parsePageQuery, pageToSkipTake } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/EXAMS" });
  if (deny) return deny;
  const ctx = await resolveSchoolContext(req);
  if (ctx instanceof NextResponse) return ctx;

  const { page, perPage } = parsePageQuery(req);
  const { skip, take } = pageToSkipTake(page, perPage);

  const [total, exams] = await Promise.all([
    prisma.exam.count({ where: { schoolId: ctx.schoolId } }),
    prisma.exam.findMany({
      where: { schoolId: ctx.schoolId },
      orderBy: [{ startAt: "desc" }],
      skip,
      take,
      include: {
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        period: { select: { id: true, type: true } },
        academicYear: { select: { id: true, label: true } },
      },
    }),
  ]);

  const data = exams.map((e) => ({
    id: e.id,
    title: e.title,
    startAt: e.startAt,
    endAt: e.endAt,
    durationMinutes: e.durationMinutes,
    totalQuestions: e.totalQuestions,
    published: e.published,
    subjectName: e.subject.name,
    className: e.class.name,
    periodType: e.period.type,
    academicYearLabel: e.academicYear.label,
  }));

  return NextResponse.json({ data, page, perPage, total, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/EXAMS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const token = req.cookies.get(ACCESS_COOKIE)?.value;
    const payload = token ? await verifyAccessToken(token) : null;
    if (!payload?.sub) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const bodySchema = z.object({
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
      // superadmin only
      schoolId: z.string().trim().optional(),
    });
    const parsed = zparse(bodySchema, await req.json());
    const ctx = await resolveSchoolContext(req, { overrideSchoolId: parsed.schoolId ?? null });
    if (ctx instanceof NextResponse) return ctx;

    const startAt = new Date(parsed.startAt);
    const endAt = new Date(parsed.endAt);
    if (!(startAt instanceof Date) || isNaN(startAt as any) || !(endAt instanceof Date) || isNaN(endAt as any)) {
      return NextResponse.json({ message: "Invalid datetime" }, { status: 400 });
    }
    if (endAt <= startAt) {
      return NextResponse.json({ message: "endAt must be after startAt" }, { status: 400 });
    }

    const created = await prisma.exam.create({
      data: {
        schoolId: ctx.schoolId,
        title: parsed.title,
        subjectId: parsed.subjectId,
        classId: parsed.classId,
        academicYearId: parsed.academicYearId,
        periodId: parsed.periodId,
        startAt,
        endAt,
        durationMinutes: parsed.durationMinutes,
        totalQuestions: parsed.totalQuestions,
        randomizeQs: parsed.randomizeQs ?? true,
        randomizeOpts: parsed.randomizeOpts ?? true,
        createdById: payload.sub,
        published: parsed.published ?? false,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return handleApiError(e);
  }
}
