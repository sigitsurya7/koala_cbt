import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/ROLE_MENUS" });
  if (deny) return deny;
  const roleId = params.id;
  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { id: true, name: true } });
  if (!role) return NextResponse.json({ message: "Role tidak ditemukan" }, { status: 404 });

  const allMenus = await prisma.menu.findMany({
    orderBy: [{ parentId: "asc" }, { order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, parentId: true, path: true, icon: true, isActive: true, order: true },
  });
  const roleMenuLinks = await prisma.roleMenu.findMany({ where: { roleId }, select: { menuId: true } });
  const checkedIds = new Set(roleMenuLinks.map((x) => x.menuId));

  return NextResponse.json({
    role,
    menus: allMenus.map((m) => ({
      id: m.id,
      name: m.name,
      parentId: m.parentId,
      path: m.path,
      icon: m.icon,
      isActive: m.isActive,
      order: m.order,
      checked: checkedIds.has(m.id),
    })),
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/ROLE_MENUS" });
  if (deny) return deny;
  try {
    const roleId = params.id;
    const body = await req.json();
    const menuIds: string[] = Array.isArray(body?.menuIds) ? body.menuIds : [];

    await prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({ where: { roleId } });
      if (menuIds.length > 0) {
        await tx.roleMenu.createMany({ data: menuIds.map((mid) => ({ roleId, menuId: mid })), skipDuplicates: true });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal menyimpan role menu" }, { status: 500 });
  }
}
