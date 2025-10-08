import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/SCHOOL_SETTINGS" });
  if (deny) return deny;
  const ss = await prisma.schoolSetting.findUnique({ where: { id: params.id } });
  if (!ss) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ setting: ss });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/SCHOOL_SETTINGS" });
  if (deny) return deny;
  try {
    const body = await req.json();
    const { key, type, value } = body ?? {};
    await prisma.schoolSetting.update({ where: { id: params.id }, data: { key, type, value: String(value ?? "") } });
    return NextResponse.json({ id: params.id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal update setting" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "DELETE", resource: "API/SCHOOL_SETTINGS" });
  if (deny) return deny;
  try {
    await prisma.schoolSetting.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal hapus setting" }, { status: 500 });
  }
}

