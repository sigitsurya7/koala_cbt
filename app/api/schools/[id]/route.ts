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
    const schoolId = params.id;
    await prisma.$transaction(async (tx) => {
      // Attempts and answers
      await tx.answer.deleteMany({ where: { attempt: { schoolId } } });
      await tx.attempt.deleteMany({ where: { schoolId } });

      // Exam related graph: supervisors/tokens/rooms/questions, then exams
      await tx.examSupervisor.deleteMany({ where: { examRoom: { exam: { schoolId } } } });
      await tx.examToken.deleteMany({ where: { examRoom: { exam: { schoolId } } } });
      await tx.examRoom.deleteMany({ where: { exam: { schoolId } } });
      await tx.examQuestion.deleteMany({ where: { exam: { schoolId } } });
      await tx.exam.deleteMany({ where: { schoolId } });

      // Question collaborators and examQuestions referencing school questions
      await tx.examQuestion.deleteMany({ where: { question: { schoolId } } });
      await tx.questionCollaborator.deleteMany({ where: { question: { schoolId } } });
      await tx.question.deleteMany({ where: { schoolId } });

      // Subjects, Classes, Rooms
      await tx.subject.deleteMany({ where: { schoolId } });
      await tx.class.deleteMany({ where: { schoolId } });
      await tx.room.deleteMany({ where: { schoolId } });

      // Periods and Academic Years (period depends on AY)
      await tx.period.deleteMany({ where: { schoolId } });
      await tx.academicYear.deleteMany({ where: { schoolId } });

      // User Details bound to this school
      await tx.teacherSubject.deleteMany({ where: { OR: [ { teacher: { schoolId } }, { subject: { schoolId } }, { class: { schoolId } } ] } });
      await tx.studentDetail.deleteMany({ where: { schoolId } });
      await tx.teacherDetail.deleteMany({ where: { schoolId } });
      await tx.staffDetail.deleteMany({ where: { schoolId } });

      // School settings
      await tx.schoolSetting.deleteMany({ where: { schoolId } });

      // Roles and attachments
      await tx.userRole.deleteMany({ where: { OR: [ { schoolId }, { role: { schoolId } } ] } });
      await tx.rolePermission.deleteMany({ where: { role: { schoolId } } });
      await tx.roleMenu.deleteMany({ where: { role: { schoolId } } });
      await tx.role.deleteMany({ where: { schoolId } });

      // Membership
      await tx.userSchool.deleteMany({ where: { schoolId } });

      // Audit Logs
      await tx.auditLog.deleteMany({ where: { schoolId } });

      // Departments lastly (safe anytime, no FKs out of school now)
      await tx.department.deleteMany({ where: { schoolId } });

      // Finally delete the school
      await tx.school.delete({ where: { id: schoolId } });
    }, { timeout: 120_000, maxWait: 10_000 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return handleApiError(e);
  }
}
