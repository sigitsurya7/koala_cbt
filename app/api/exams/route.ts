import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { buildSearchWhere, pageToSkipTake, parsePageQuery } from "@/lib/pagination";
import { requirePermission } from "@/lib/acl";
import { enforceActiveSchool } from "@/lib/tenant";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/EXAMS" });
  if (deny) return deny;
  const ensured = await enforceActiveSchool(req);
  if (ensured instanceof NextResponse) return ensured;
  const { q, page, perPage } = parsePageQuery(req);
  const where: any = { schoolId: ensured.schoolId, ...(buildSearchWhere(["title"], q) as any) };
  const total = await prisma.exam.count({ where });
  const { skip, take } = pageToSkipTake(page, perPage);
  const data = await prisma.exam.findMany({ where, orderBy: [{ createdAt: "desc" }], skip, take, select: { id: true, title: true, periodId: true, isPublished: true } });
  return NextResponse.json({ data, page, perPage, total, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/EXAMS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ensured = await enforceActiveSchool(req);
    if (ensured instanceof NextResponse) return ensured;
    const schema = z.object({ title: z.string().trim().min(1), periodId: z.string().trim().min(1), isPublished: z.boolean().optional() });
    const { title, periodId, isPublished = false } = zparse(schema, await req.json());
    const token = req.cookies.get(ACCESS_COOKIE)?.value;
    const payload = token ? await verifyAccessToken(token) : null;
    const created = await prisma.exam.create({ data: { schoolId: ensured.schoolId, title, periodId, isPublished, createdById: payload?.sub || undefined }, select: { id: true } });
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return handleApiError(e);
  }
}

