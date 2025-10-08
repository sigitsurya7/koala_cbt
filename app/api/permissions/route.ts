import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { buildOrderBy, buildSearchWhere, pageToSkipTake, parsePageQuery } from "@/lib/pagination";
import { requirePermission } from "@/lib/acl";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/PERMISSIONS" });
  if (deny) return deny;

  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all");
  if (all === "1") {
    const permissions = await prisma.permission.findMany({ orderBy: [{ resource: "asc" }, { action: "asc" }] });
    return NextResponse.json({ permissions });
  }

  const { page, perPage, q, sort, order } = parsePageQuery(req);
  const where = {
    ...(buildSearchWhere(["name", "action", "resource"], q) as any),
  } as any;
  const total = await prisma.permission.count({ where });
  const { skip, take } = pageToSkipTake(page, perPage);
  const permissions = await prisma.permission.findMany({ where, orderBy: buildOrderBy(sort, order, { name: "name", resource: "resource", action: "action" }) || [{ resource: "asc" }, { action: "asc" }], skip, take });
  return NextResponse.json({ data: permissions, page, perPage, total, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/PERMISSIONS" });
  if (deny) return deny;
  try {
    const body = await req.json();
    const { name, action, resource } = body ?? {};
    if (!name || !action || !resource) return NextResponse.json({ message: "name, action, resource wajib" }, { status: 400 });
    const created = await prisma.permission.create({ data: { name, action, resource }, select: { id: true } });
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal membuat permission" }, { status: 500 });
  }
}
