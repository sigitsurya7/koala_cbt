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

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/EXAMS" });
  if (deny) return deny;
  const ctx = await resolveSchoolContext(req);
  if (ctx instanceof NextResponse) return ctx;
  const { q, page, perPage } = parsePageQuery(req);
  const where: any = { schoolId: ctx.schoolId, ...(buildSearchWhere(["title"], q) as any) };
  const total = await prisma.exam.count({ where });
  const { skip, take } = pageToSkipTake(page, perPage);
  const data = await prisma.exam.findMany({ where, orderBy: [{ createdAt: "desc" }], skip, take, select: { id: true, title: true, periodId: true, published: true } });
  return NextResponse.json({ data, page, perPage, total, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/EXAMS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    // This simplified endpoint is not sufficient for full exam creation.
    // Use /api/exams/schedule to create with full required fields.
    return NextResponse.json({ message: "Use /api/exams/schedule to create an exam." }, { status: 400 });
  } catch (e: any) {
    return handleApiError(e);
  }
}

