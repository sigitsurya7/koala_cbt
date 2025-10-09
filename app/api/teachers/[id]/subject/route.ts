import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { assertCsrf } from "@/lib/csrf";
import { enforceActiveSchool } from "@/lib/tenant";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ensured = await enforceActiveSchool(req);
    if (ensured instanceof NextResponse) return ensured;
    const teacherId = params.id;
    const schema = z.object({ subjectId: z.string().trim().nullable() });
    const { subjectId } = zparse(schema, await req.json());

    const td = await prisma.teacherDetail.findFirst({ where: { userId: teacherId, schoolId: ensured.schoolId } });
    if (!td) return NextResponse.json({ message: "Not found" }, { status: 404 });
    if (subjectId) {
      const subj = await prisma.subject.findUnique({ where: { id: subjectId } });
      if (!subj || subj.schoolId !== ensured.schoolId) return NextResponse.json({ message: "Invalid subject" }, { status: 400 });
    }
    await prisma.teacherDetail.updateMany({ where: { userId: teacherId, schoolId: ensured.schoolId }, data: { subjectId: subjectId ?? null } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return handleApiError(e);
  }
}
