import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import { enforceActiveSchool } from "@/lib/tenant";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/DEPARTMENTS" });
  if (deny) return deny;
  const ensured = await enforceActiveSchool(req);
  if (ensured instanceof NextResponse) return ensured;
  const it = await prisma.department.findUnique({ where: { id: params.id } });
  if (!it || it.schoolId !== ensured.schoolId) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ item: it });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/DEPARTMENTS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ensured = await enforceActiveSchool(req);
    if (ensured instanceof NextResponse) return ensured;
    const it = await prisma.department.findUnique({ where: { id: params.id } });
    if (!it || it.schoolId !== ensured.schoolId) return NextResponse.json({ message: "Not found" }, { status: 404 });
    const schema = z.object({ name: z.string().trim().min(1).optional(), level: z.string().trim().nullable().optional(), isActive: z.boolean().optional() });
    const data = zparse(schema, await req.json());
    await prisma.department.update({ where: { id: params.id }, data: data as any });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "DELETE", resource: "API/DEPARTMENTS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ensured = await enforceActiveSchool(req);
    if (ensured instanceof NextResponse) return ensured;
    const it = await prisma.department.findUnique({ where: { id: params.id } });
    if (!it || it.schoolId !== ensured.schoolId) return NextResponse.json({ message: "Not found" }, { status: 404 });
    await prisma.department.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return handleApiError(e);
  }
}
