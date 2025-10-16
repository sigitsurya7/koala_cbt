import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import { assertMembership } from "@/lib/tenant";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/CLASSES" });
  if (deny) return deny;
  const { id } = await params;
  const c = await prisma.class.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ message: "Not found" }, { status: 404 });
  const denyM = await assertMembership(req, c.schoolId);
  if (denyM) return denyM;
  return NextResponse.json({ id: c.id, name: c.name, grade: c.grade, schoolId: c.schoolId, departmentId: c.departmentId, isActive: c.isActive });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/CLASSES" });
  if (deny) return deny;
  try {
    const { id } = await params;
    const body = await req.json();
    const { departmentId, name, grade, isActive } = body ?? {};
    const existing = await prisma.class.findUnique({ where: { id }, select: { schoolId: true } });
    if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });
    const denyM = await assertMembership(req, existing.schoolId);
    if (denyM) return denyM;
    await prisma.class.update({ where: { id }, data: { departmentId, name, grade, isActive } });
    return NextResponse.json({ id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal update kelas" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requirePermission(req, { action: "DELETE", resource: "API/CLASSES" });
  if (deny) return deny;
  try {
    const { id } = await params;
    const existing = await prisma.class.findUnique({ where: { id }, select: { schoolId: true } });
    if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });
    const denyM = await assertMembership(req, existing.schoolId);
    if (denyM) return denyM;
    await prisma.class.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal hapus kelas" }, { status: 500 });
  }
}
