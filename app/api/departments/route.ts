import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { buildOrderBy, buildSearchWhere, pageToSkipTake, parsePageQuery } from "@/lib/pagination";
import { requirePermission } from "@/lib/acl";
import { enforceActiveSchool } from "@/lib/tenant";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/DEPARTMENTS" });
  if (deny) return deny;
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId") || (await (async () => {
    const ensured = await enforceActiveSchool(req);
    if (ensured instanceof NextResponse) return undefined;
    return ensured.schoolId;
  })());
  const all = searchParams.get("all");
  if (!schoolId) return NextResponse.json({ data: [], page: 1, perPage: 10, total: 0, totalPages: 0 });
  if (all === "1") {
    const items = await prisma.department.findMany({ where: { schoolId }, orderBy: [{ name: "asc" }] });
    return NextResponse.json({ items });
  }
  const { page, perPage, q, sort, order } = parsePageQuery(req);
  const where: any = { schoolId, ...(buildSearchWhere(["name", "level"], q) as any) };
  const total = await prisma.department.count({ where });
  const { skip, take } = pageToSkipTake(page, perPage);
  const data = await prisma.department.findMany({ where, orderBy: buildOrderBy(sort, order, { name: "name", level: "level", isActive: "isActive" }) || [{ name: "asc" }], skip, take });
  return NextResponse.json({ data, page, perPage, total, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/DEPARTMENTS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ensured = await enforceActiveSchool(req);
    if (ensured instanceof NextResponse) return ensured;
    const schema = z.object({ name: z.string().trim().min(1), level: z.string().trim().nullable().optional(), isActive: z.boolean().optional() });
    const { name, level = null, isActive = true } = zparse(schema, await req.json());
    const created = await prisma.department.create({ data: { schoolId: ensured.schoolId, name, level, isActive } });
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return handleApiError(e);
  }
}
