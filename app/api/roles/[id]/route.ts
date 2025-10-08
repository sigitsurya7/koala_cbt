import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/ROLES" });
  if (deny) return deny;
  try {
    const id = params.id;
    const body = await req.json();
    const { name, key, scope, schoolId, isSystem } = body ?? {};
    await prisma.role.update({ where: { id }, data: { name, key, scope, schoolId, isSystem } });
    return NextResponse.json({ id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal update role" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "DELETE", resource: "API/ROLES" });
  if (deny) return deny;
  try {
    const id = params.id;
    await prisma.role.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal hapus role" }, { status: 500 });
  }
}
