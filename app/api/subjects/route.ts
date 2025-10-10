import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import { parsePageQuery, pageToSkipTake, buildSearchWhere } from "@/lib/pagination";
import { enforceActiveSchool } from "@/lib/tenant";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/SUBJECTS" });
  if (deny) return deny;
  const { searchParams } = new URL(req.url);

  // resolve schoolId: explicit or from active school
  const schoolId = searchParams.get("schoolId") || (await (async () => {
    const ensured = await enforceActiveSchool(req);
    if (ensured instanceof NextResponse) return undefined;
    return ensured.schoolId;
  })());

  if (!schoolId) return NextResponse.json({ data: [], page: 1, perPage: 10, total: 0, totalPages: 0 });

  // support all=1 for selects
  const all = searchParams.get("all");
  if (all === "1") {
    const items = await prisma.subject.findMany({ where: { schoolId }, orderBy: [{ name: "asc" }] });
    return NextResponse.json({ items });
  }

  const { page, perPage, q, sort, order } = parsePageQuery(req);
  const where: any = { schoolId, ...(buildSearchWhere(["name"], q) as any) };
  const total = await prisma.subject.count({ where });
  const { skip, take } = pageToSkipTake(page, perPage);
  const data = await prisma.subject.findMany({
    where,
    orderBy: [{ name: "asc" }],
    skip,
    take,
    include: { department: { select: { id: true, name: true } } },
  });
  return NextResponse.json({
    data: data.map((s) => ({ id: s.id, name: s.name, grade: s.grade, departmentId: s.departmentId, departmentName: s.department?.name ?? null, schoolId: s.schoolId })),
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/SUBJECTS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ensured = await enforceActiveSchool(req);
    if (ensured instanceof NextResponse) return ensured;
    const schema = z.object({ name: z.string().trim().min(1), departmentId: z.string().trim().nullable().optional(), grade: z.number().int().nullable().optional() });
    const { name, departmentId = null, grade = null } = zparse(schema, await req.json());
    const created = await prisma.subject.create({ data: { schoolId: ensured.schoolId, name, departmentId, grade: grade as any } });
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return handleApiError(e);
  }
}
