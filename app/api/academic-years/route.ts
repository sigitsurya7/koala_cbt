import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { buildSearchWhere, pageToSkipTake, parsePageQuery } from "@/lib/pagination";
import { requirePermission } from "@/lib/acl";
import { enforceActiveSchool } from "@/lib/tenant";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/ACADEMIC_YEARS" });
  if (deny) return deny;
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId") || (await (async () => {
    const ensured = await enforceActiveSchool(req);
    if (ensured instanceof NextResponse) return undefined;
    return ensured.schoolId;
  })());
  if (!schoolId) return NextResponse.json({ data: [], page: 1, perPage: 10, total: 0, totalPages: 0 });
  const { page, perPage, q } = parsePageQuery(req);
  const where: any = { schoolId, ...(buildSearchWhere(["label"], q) as any) };
  const total = await prisma.academicYear.count({ where });
  const { skip, take } = pageToSkipTake(page, perPage);
  const data = await prisma.academicYear.findMany({ where, orderBy: [{ startDate: "desc" }], skip, take });
  return NextResponse.json({ data, page, perPage, total, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/ACADEMIC_YEARS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ensured = await enforceActiveSchool(req);
    if (ensured instanceof NextResponse) return ensured;
    const schema = z.object({
      label: z.string().trim().min(1),
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      isActive: z.boolean().optional(),
    });
    const { label, startDate, endDate, isActive = false } = zparse(schema, await req.json());
    const created = await prisma.academicYear.create({ data: { schoolId: ensured.schoolId, label, startDate: new Date(startDate), endDate: new Date(endDate), isActive } });
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return handleApiError(e);
  }
}

