import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/DEPARTMENTS" });
  if (deny) return deny;
  try {
    const body = await req.json();
    const { name, level, isActive } = body ?? {};
    await prisma.department.update({ where: { id: params.id }, data: { name, level, isActive } });
    return NextResponse.json({ id: params.id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal update jurusan" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "DELETE", resource: "API/DEPARTMENTS" });
  if (deny) return deny;
  try {
    await prisma.department.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal hapus jurusan" }, { status: 500 });
  }
}

