import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import { resolveSchoolContext } from "@/lib/tenant";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/QUESTIONS" });
  if (deny) return deny;
  const ctx = await resolveSchoolContext(req);
  if (ctx instanceof NextResponse) return ctx;
  const it = await prisma.question.findUnique({ where: { id: params.id } });
  if (!it || it.schoolId !== ctx.schoolId) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ item: it });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/QUESTIONS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ctx = await resolveSchoolContext(req);
    if (ctx instanceof NextResponse) return ctx;
    const schema = z.object({
      subjectId: z.string().trim().min(1).optional(),
      type: z.enum(["MCQ", "ESSAY"]).optional(),
      text: z.string().trim().min(1).optional(),
      options: z.array(z.object({ key: z.string(), text: z.string() })).optional(),
      correctKey: z.string().optional(),
      points: z.number().int().min(0).optional(),
      difficulty: z.number().int().min(0).max(10).optional(),
    });
    const body = zparse(schema, await req.json());
    const it = await prisma.question.findUnique({ where: { id: params.id } });
    if (!it || it.schoolId !== ctx.schoolId) return NextResponse.json({ message: "Not found" }, { status: 404 });
    await prisma.question.update({ where: { id: params.id }, data: body as any });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "DELETE", resource: "API/QUESTIONS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ctx = await resolveSchoolContext(req);
    if (ctx instanceof NextResponse) return ctx;
    const it = await prisma.question.findUnique({ where: { id: params.id } });
    if (!it || it.schoolId !== ctx.schoolId) return NextResponse.json({ message: "Not found" }, { status: 404 });
    await prisma.question.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return handleApiError(e);
  }
}
