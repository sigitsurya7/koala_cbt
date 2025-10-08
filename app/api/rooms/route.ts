import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { buildOrderBy, buildSearchWhere, pageToSkipTake, parsePageQuery } from "@/lib/pagination";
import { requirePermission } from "@/lib/acl";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/ROOMS" });
  if (deny) return deny;
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId") || undefined;
  if (!schoolId) return NextResponse.json({ data: [], page: 1, perPage: 10, total: 0, totalPages: 0 });
  const { page, perPage, q, sort, order } = parsePageQuery(req);
  const where: any = { schoolId, ...(buildSearchWhere(["name"], q) as any) };
  const total = await prisma.room.count({ where });
  const { skip, take } = pageToSkipTake(page, perPage);
  const data = await prisma.room.findMany({ where, orderBy: buildOrderBy(sort, order, { name: "name", capacity: "capacity", isActive: "isActive" }) || [{ name: "asc" }], skip, take });
  return NextResponse.json({ data, page, perPage, total, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/ROOMS" });
  if (deny) return deny;
  try {
    const body = await req.json();
    const { schoolId, name, capacity = null, isActive = true } = body ?? {};
    if (!schoolId || !name) return NextResponse.json({ message: "schoolId dan name wajib" }, { status: 400 });
    const created = await prisma.room.create({ data: { schoolId, name, capacity, isActive } });
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal membuat ruangan" }, { status: 500 });
  }
}
