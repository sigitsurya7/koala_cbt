import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";

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
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const schema = z.object({ name: z.string().trim().min(1).optional(), code: z.string().trim().min(1).optional(), logoUrl: z.string().url().nullable().optional(), isActive: z.boolean().optional() });
    const body = zparse(schema, await req.json());
    await prisma.school.update({ where: { id: params.id }, data: body });
    return NextResponse.json({ id: params.id });
  } catch (e: any) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "DELETE", resource: "API/SCHOOLS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    await prisma.school.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return handleApiError(e);
  }
}
