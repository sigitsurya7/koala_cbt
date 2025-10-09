import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/USERS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const schema = z.object({
      name: z.string().trim().min(1).optional(),
      email: z.string().email().optional(),
      password: z.string().min(6).optional(),
      type: z.enum(["SISWA","GURU","STAFF","ADMIN"]).optional(),
      isSuperAdmin: z.boolean().optional(),
    });
    const { name, email, password, type, isSuperAdmin } = zparse(schema, await req.json());
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (type !== undefined) data.type = type;
    if (isSuperAdmin !== undefined) data.isSuperAdmin = isSuperAdmin;
    if (password) data.passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: params.id }, data });
    return NextResponse.json({ id: params.id });
  } catch (e: any) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "DELETE", resource: "API/USERS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const id = params.id;
    await prisma.$transaction(async (tx) => {
      // Hard checks: prevent deletion if user is author of Questions/Exams
      const [qCount, eCount] = await Promise.all([
        tx.question.count({ where: { createdById: id } }),
        tx.exam.count({ where: { createdById: id } }),
      ]);
      if (qCount > 0 || eCount > 0) {
        throw new Error(
          `Tidak dapat menghapus user: memiliki ${qCount} pertanyaan dan ${eCount} ujian terkait. Arsipkan/alihtugaskan terlebih dahulu.`,
        );
      }

      // Clean related details and mappings
      await Promise.all([
        tx.userDetail.deleteMany({ where: { userId: id } }),
        tx.studentDetail.deleteMany({ where: { userId: id } }),
        tx.teacherDetail.deleteMany({ where: { userId: id } }),
        tx.staffDetail.deleteMany({ where: { userId: id } }),
        tx.userRole.deleteMany({ where: { userId: id } }),
        tx.userSchool.deleteMany({ where: { userId: id } }),
        tx.examSupervisor.deleteMany({ where: { userId: id } }),
        tx.attempt.deleteMany({ where: { studentId: id } }),
        tx.auditLog.deleteMany({ where: { actorId: id } }),
      ]);

      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return handleApiError(e);
  }
}
