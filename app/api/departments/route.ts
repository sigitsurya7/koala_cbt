import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { buildOrderBy, buildSearchWhere, pageToSkipTake, parsePageQuery } from "@/lib/pagination";
import { requirePermission } from "@/lib/acl";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/DEPARTMENTS" });
  if (deny) return deny;
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId") || undefined;
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
  try {
    const body = await req.json();
    const { schoolId, name, level = null, isActive = true } = body ?? {};
    if (!schoolId || !name) return NextResponse.json({ message: "schoolId dan name wajib" }, { status: 400 });
    const created = await prisma.department.create({ data: { schoolId, name, level, isActive } });
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal membuat jurusan" }, { status: 500 });
  }
}
