import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/PERMISSIONS" });
  if (deny) return deny;
  const perm = await prisma.permission.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!perm) return NextResponse.json({ message: "Not found" }, { status: 404 });
  const links = await prisma.rolePermission.findMany({ where: { permissionId: params.id }, include: { role: true } });
  return NextResponse.json({ roles: links.map((l) => ({ id: l.role.id, name: l.role.name, key: l.role.key })) });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/PERMISSIONS" });
  if (deny) return deny;
  try {
    const body = await req.json();
    const roleIds: string[] = Array.isArray(body?.roleIds) ? body.roleIds : [];
    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { permissionId: params.id } });
      if (roleIds.length > 0) {
        await tx.rolePermission.createMany({ data: roleIds.map((rid) => ({ roleId: rid, permissionId: params.id })), skipDuplicates: true });
      }
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal set roles" }, { status: 500 });
  }
}

