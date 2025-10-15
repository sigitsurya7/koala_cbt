import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { pageToSkipTake, parsePageQuery } from "@/lib/pagination";
import { requirePermission } from "@/lib/acl";
import { resolveSchoolContext } from "@/lib/tenant";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/ATTEMPTS" });
  if (deny) return deny;
  const ctx = await resolveSchoolContext(req);
  if (ctx instanceof NextResponse) return ctx;
  const { page, perPage } = parsePageQuery(req);
  const { searchParams } = new URL(req.url);
  const examId = searchParams.get("examId") || undefined;
  const where: any = { schoolId: ctx.schoolId, ...(examId ? { examId } : {}) };
  const total = await prisma.attempt.count({ where });
  const { skip, take } = pageToSkipTake(page, perPage);
  const data = await prisma.attempt.findMany({
    where,
    orderBy: [{ startedAt: "desc" }],
    skip,
    take,
    select: { id: true, examId: true, studentId: true, status: true, finalScore: true },
  });
  return NextResponse.json({ data, page, perPage, total, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/ATTEMPTS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ctx = await resolveSchoolContext(req);
    if (ctx instanceof NextResponse) return ctx;
    const token = req.cookies.get(ACCESS_COOKIE)?.value;
    const payload = token ? await verifyAccessToken(token) : null;
    const schema = z.object({ examId: z.string().trim().min(1) });
    const { examId } = zparse(schema, await req.json());
    // naif: langsung buat attempt jika belum ada ongoing
    if (!payload?.sub) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    const existing = await prisma.attempt.findFirst({ where: { schoolId: ctx.schoolId, examId, studentId: payload.sub, status: "ONGOING" } });
    if (existing) return NextResponse.json({ id: existing.id });
    const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { endAt: true } });
    const fallbackEnds = new Date(Date.now() + 60 * 60 * 1000);
    const created = await prisma.attempt.create({ data: { schoolId: ctx.schoolId, examId, studentId: payload.sub, status: "ONGOING", startedAt: new Date(), endsAt: exam?.endAt ?? fallbackEnds }, select: { id: true } });
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return handleApiError(e);
  }
}

