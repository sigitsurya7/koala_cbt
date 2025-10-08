import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/SCHOOLS" });
  if (deny) return deny;
  const school = await prisma.school.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, code: true, logoUrl: true, isActive: true },
  });
  if (!school) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ school });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/SCHOOLS" });
  if (deny) return deny;
  try {
    const body = await req.json();
    const { name, code, logoUrl, isActive } = body ?? {};
    await prisma.school.update({ where: { id: params.id }, data: { name, code, logoUrl, isActive } });
    return NextResponse.json({ id: params.id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal update sekolah" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "DELETE", resource: "API/SCHOOLS" });
  if (deny) return deny;
  try {
    await prisma.school.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal hapus sekolah" }, { status: 500 });
  }
}
