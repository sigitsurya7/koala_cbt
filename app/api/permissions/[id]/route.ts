import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/PERMISSIONS" });
  if (deny) return deny;
  const perm = await prisma.permission.findUnique({ where: { id: params.id }, include: { rolePermissions: { include: { role: true } } } });
  if (!perm) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({
    id: perm.id,
    name: perm.name,
    action: perm.action,
    resource: perm.resource,
    roles: perm.rolePermissions.map((rp) => ({ id: rp.role.id, name: rp.role.name, key: rp.role.key })),
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/PERMISSIONS" });
  if (deny) return deny;
  try {
    const body = await req.json();
    const { name, action, resource } = body ?? {};
    await prisma.permission.update({ where: { id: params.id }, data: { name, action, resource } });
    return NextResponse.json({ id: params.id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal update permission" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "DELETE", resource: "API/PERMISSIONS" });
  if (deny) return deny;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { permissionId: params.id } });
      await tx.permission.delete({ where: { id: params.id } });
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal hapus permission" }, { status: 500 });
  }
}

