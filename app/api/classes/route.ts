import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { buildOrderBy, buildSearchWhere, pageToSkipTake, parsePageQuery } from "@/lib/pagination";
import { requirePermission } from "@/lib/acl";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/CLASSES" });
  if (deny) return deny;
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId") || undefined;
  if (!schoolId) return NextResponse.json({ data: [], page: 1, perPage: 10, total: 0, totalPages: 0 });
  const { page, perPage, q, sort, order } = parsePageQuery(req);
  const where: any = { schoolId, ...(buildSearchWhere(["name"], q) as any) };
  const total = await prisma.class.count({ where });
  const { skip, take } = pageToSkipTake(page, perPage);
  const data = await prisma.class.findMany({ where, orderBy: buildOrderBy(sort, order, { name: "name", grade: "grade", isActive: "isActive" }) || [{ grade: "asc" }, { name: "asc" }], include: { department: true }, skip, take });
  return NextResponse.json({
    data: data.map((c) => ({ id: c.id, schoolId: c.schoolId, departmentId: c.departmentId, departmentName: c.department?.name ?? null, name: c.name, grade: c.grade, isActive: c.isActive })),
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/CLASSES" });
  if (deny) return deny;
  try {
    const body = await req.json();
    const { schoolId, departmentId = null, name, grade, isActive = true } = body ?? {};
    if (!schoolId || !name || typeof grade !== "number") return NextResponse.json({ message: "schoolId, name, grade wajib" }, { status: 400 });
    const created = await prisma.class.create({ data: { schoolId, departmentId, name, grade, isActive } });
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal membuat kelas" }, { status: 500 });
  }
}
