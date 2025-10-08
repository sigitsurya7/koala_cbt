import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { buildOrderBy, buildSearchWhere, pageToSkipTake, parsePageQuery } from "@/lib/pagination";
import { requirePermission } from "@/lib/acl";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/SCHOOLS" });
  if (deny) return deny;
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all");
  if (all === "1") {
    const schools = await prisma.school.findMany({
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, code: true, logoUrl: true, isActive: true },
    });
    return NextResponse.json({ schools });
  }

  const { page, perPage, q, sort, order } = parsePageQuery(req);
  const where = {
    ...(buildSearchWhere(["name", "code"], q) as any),
  } as any;
  const total = await prisma.school.count({ where });
  const { skip, take } = pageToSkipTake(page, perPage);
  const schools = await prisma.school.findMany({
    where,
    orderBy: buildOrderBy(sort, order, { name: "name", code: "code", isActive: "isActive", createdAt: "createdAt" }) || [{ name: "asc" }],
    select: { id: true, name: true, code: true, logoUrl: true, isActive: true },
    skip,
    take,
  });
  return NextResponse.json({ data: schools, page, perPage, total, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/SCHOOLS" });
  if (deny) return deny;
  try {
    const body = await req.json();
    const { name, code, logoUrl = null, isActive = true } = body ?? {};
    if (!name || !code) return NextResponse.json({ message: "Nama dan kode wajib" }, { status: 400 });
    const created = await prisma.school.create({
      data: { name, code, logoUrl, isActive },
      select: { id: true },
    });
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal membuat sekolah" }, { status: 500 });
  }
}
