import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import { resolveSchoolContext } from "@/lib/tenant";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/SCHOOL_SETTINGS" });
  if (deny) return deny;
  const ctx = await resolveSchoolContext(req);
  if (ctx instanceof NextResponse) return ctx;
  const it = await prisma.schoolSetting.findUnique({ where: { id: params.id } });
  if (!it || it.schoolId !== ctx.schoolId) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ item: it });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/SCHOOL_SETTINGS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ctx = await resolveSchoolContext(req);
    if (ctx instanceof NextResponse) return ctx;
    const it = await prisma.schoolSetting.findUnique({ where: { id: params.id } });
    if (!it || it.schoolId !== ctx.schoolId) return NextResponse.json({ message: "Not found" }, { status: 404 });
    const schema = z.object({ key: z.string().trim().min(1).optional(), type: z.enum(["STRING","NUMBER","BOOLEAN","JSON"]).optional(), value: z.any().optional() });
    const body = zparse(schema, await req.json());
    const data: any = { ...body };
    if (data.value !== undefined) data.value = String(data.value ?? "");
    await prisma.schoolSetting.update({ where: { id: params.id }, data });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "DELETE", resource: "API/SCHOOL_SETTINGS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ctx = await resolveSchoolContext(req);
    if (ctx instanceof NextResponse) return ctx;
    const it = await prisma.schoolSetting.findUnique({ where: { id: params.id } });
    if (!it || it.schoolId !== ctx.schoolId) return NextResponse.json({ message: "Not found" }, { status: 404 });
    await prisma.schoolSetting.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return handleApiError(e);
  }
}
