import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/USERS" });
  if (deny) return deny;
  try {
    const body = await req.json();
    const { name, email, password, type, isSuperAdmin } = body ?? {};
    const data: any = { name, email, type, isSuperAdmin };
    if (password) data.passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: params.id }, data });
    return NextResponse.json({ id: params.id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal update user" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "DELETE", resource: "API/USERS" });
  if (deny) return deny;
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
    return NextResponse.json({ message: e?.message ?? "Gagal hapus user" }, { status: 400 });
  }
}
