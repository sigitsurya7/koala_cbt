import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/PERIODS" });
  if (deny) return deny;
  const period = await prisma.period.findUnique({ where: { id: params.id } });
  if (!period) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ period });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/PERIODS" });
  if (deny) return deny;
  try {
    const body = await req.json();
    const { academicYearId, type, startDate, endDate, isActive } = body ?? {};
    await prisma.period.update({ where: { id: params.id }, data: { academicYearId, type, startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined, isActive } });
    return NextResponse.json({ id: params.id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal update periode" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "DELETE", resource: "API/PERIODS" });
  if (deny) return deny;
  try {
    await prisma.period.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal hapus periode" }, { status: 500 });
  }
}

