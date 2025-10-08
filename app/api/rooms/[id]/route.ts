import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/ROOMS" });
  if (deny) return deny;
  try {
    const body = await req.json();
    const { name, capacity, isActive } = body ?? {};
    await prisma.room.update({ where: { id: params.id }, data: { name, capacity, isActive } });
    return NextResponse.json({ id: params.id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal update ruangan" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "DELETE", resource: "API/ROOMS" });
  if (deny) return deny;
  try {
    await prisma.room.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal hapus ruangan" }, { status: 500 });
  }
}

