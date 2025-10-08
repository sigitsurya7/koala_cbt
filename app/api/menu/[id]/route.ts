import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { emitMenuUpdated } from "@/lib/events";
import { requirePermission } from "@/lib/acl";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/MENU" });
  if (deny) return deny;
  const id = params.id;
  const menu = await prisma.menu.findUnique({
    where: { id },
    include: { roleMenus: { include: { role: true } } },
  });
  if (!menu) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({
    id: menu.id,
    name: menu.name,
    key: menu.key,
    path: menu.path,
    icon: menu.icon,
    order: menu.order,
    parentId: menu.parentId,
    visibility: menu.visibility,
    isActive: menu.isActive,
    roles: menu.roleMenus.map((rm) => ({ id: rm.role.id, name: rm.role.name, key: rm.role.key })),
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/MENU" });
  if (deny) return deny;
  try {
    const id = params.id;
    const body = await req.json();
    const {
      name,
      key,
      path,
      icon,
      order,
      parentId,
      visibility,
      isActive,
      roleIds,
      menuSuperAdmin,
    } = body ?? {};

    const updated = await prisma.$transaction(async (tx) => {
      const menu = await tx.menu.update({
        where: { id },
        data: { name, key, path, icon, order, parentId, visibility, isActive, menuSuperAdmin },
      });

      if (Array.isArray(roleIds)) {
        // Replace role mappings
        await tx.roleMenu.deleteMany({ where: { menuId: id } });
        if (roleIds.length > 0) {
          await tx.roleMenu.createMany({
            data: roleIds.map((rid: string) => ({ roleId: rid, menuId: id })),
            skipDuplicates: true,
          });
        }
      }
      return menu;
    });

    emitMenuUpdated({ action: "update", id: updated.id });
    return NextResponse.json({ id: updated.id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal update menu" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "DELETE", resource: "API/MENU" });
  if (deny) return deny;
  try {
    const id = params.id;
    await prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({ where: { menuId: id } });
      // Nullify parent for children first (so we don't break FK)
      await tx.menu.updateMany({ where: { parentId: id }, data: { parentId: null } });
      await tx.menu.delete({ where: { id } });
    });
    emitMenuUpdated({ action: "delete", id });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal hapus menu" }, { status: 500 });
  }
}
