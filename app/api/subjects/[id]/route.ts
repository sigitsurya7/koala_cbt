import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import { resolveSchoolContext } from "@/lib/tenant";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/SUBJECTS" });
  if (deny) return deny;
  const ctx = await resolveSchoolContext(req);
  if (ctx instanceof NextResponse) return ctx;
  const it = await prisma.subject.findUnique({ where: { id: params.id }, include: { department: { select: { id: true, name: true } } } });
  if (!it || it.schoolId !== ctx.schoolId) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ id: it.id, name: it.name, grade: it.grade, departmentId: it.departmentId, departmentName: it.department?.name ?? null, schoolId: it.schoolId });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/SUBJECTS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ctx = await resolveSchoolContext(req);
    if (ctx instanceof NextResponse) return ctx;
    const it = await prisma.subject.findUnique({ where: { id: params.id } });
    if (!it || it.schoolId !== ctx.schoolId) return NextResponse.json({ message: "Not found" }, { status: 404 });
    const schema = z.object({ name: z.string().trim().min(1).optional(), departmentId: z.string().trim().nullable().optional(), grade: z.number().int().nullable().optional() });
    const body = zparse(schema, await req.json());
    await prisma.subject.update({ where: { id: params.id }, data: body as any });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "DELETE", resource: "API/SUBJECTS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ctx = await resolveSchoolContext(req);
    if (ctx instanceof NextResponse) return ctx;
    const it = await prisma.subject.findUnique({ where: { id: params.id } });
    if (!it || it.schoolId !== ctx.schoolId) return NextResponse.json({ message: "Not found" }, { status: 404 });
    // Optional guard: prevent delete if referenced by questions/exams
    const qCount = await prisma.question.count({ where: { subjectId: params.id } });
    if (qCount > 0) return NextResponse.json({ message: "Tidak dapat menghapus: ada soal terkait" }, { status: 400 });
    await prisma.subject.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return handleApiError(e);
  }
}
