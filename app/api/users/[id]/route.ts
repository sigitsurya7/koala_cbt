import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/USERS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const schema = z.object({
      name: z.string().trim().min(1).optional(),
      username: z.string().min(3).optional(),
      email: z.string().email().optional(),
      password: z.string().min(6).optional(),
      type: z.enum(["SISWA", "GURU", "STAFF", "ADMIN"]).optional(),
      isSuperAdmin: z.boolean().optional(),
      isActive: z.boolean().optional(),
      schoolId: z.string().optional().nullable(),
      roleId: z.string().optional().nullable(),
    });
    const payload = zparse(schema, await req.json());
    const { id: userId } = await params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: true,
        schools: true,
      },
    });
    if (!user) return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 });

    const finalIsSuperAdmin = payload.isSuperAdmin ?? user.isSuperAdmin;
    const finalType = finalIsSuperAdmin ? "ADMIN" : payload.type ?? user.type;
    const targetSchoolId =
      finalIsSuperAdmin ? null : payload.schoolId ?? user.schools[0]?.schoolId ?? null;

    let targetRoleId: string | null = null;
    if (!finalIsSuperAdmin) {
      if (!targetSchoolId) {
        return NextResponse.json({ message: "Sekolah wajib dipilih" }, { status: 400 });
      }
      const school = await prisma.school.findUnique({ where: { id: targetSchoolId } });
      if (!school) return NextResponse.json({ message: "Sekolah tidak ditemukan" }, { status: 404 });

      if (finalType === "SISWA") {
        const siswaRole = await prisma.role.findFirst({
          where: { key: "SISWA", schoolId: targetSchoolId },
          select: { id: true },
        });
        if (!siswaRole) {
          return NextResponse.json({ message: "Role SISWA tidak ditemukan di sekolah ini" }, { status: 400 });
        }
        targetRoleId = siswaRole.id;
      } else {
        const candidateRoleId = payload.roleId ?? user.userRoles.find((r) => r.schoolId === targetSchoolId)?.roleId ?? null;
        if (!candidateRoleId) {
          return NextResponse.json({ message: "Role wajib dipilih" }, { status: 400 });
        }
        const role = await prisma.role.findFirst({
          where: {
            id: candidateRoleId,
            OR: [{ schoolId: targetSchoolId }, { schoolId: null }],
          },
          select: { id: true },
        });
        if (!role) return NextResponse.json({ message: "Role tidak valid untuk sekolah ini" }, { status: 400 });
        targetRoleId = role.id;
      }
    }

    const updateData: any = {};
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.email !== undefined) updateData.email = payload.email;
    if (payload.isActive !== undefined) updateData.isActive = payload.isActive;
    updateData.type = finalType;
    updateData.isSuperAdmin = finalIsSuperAdmin;
    if (payload.password) updateData.passwordHash = await bcrypt.hash(payload.password, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: updateData });

      if (finalIsSuperAdmin) {
        await Promise.all([
          tx.userSchool.deleteMany({ where: { userId: userId } }),
          tx.userRole.deleteMany({ where: { userId: userId } }),
          tx.studentDetail.deleteMany({ where: { userId: userId } }),
          tx.teacherDetail.deleteMany({ where: { userId: userId } }),
          tx.staffDetail.deleteMany({ where: { userId: userId } }),
        ]);
        return;
      }

      const ensureMembership = async () => {
        if (!targetSchoolId) return;
        const existing = await tx.userSchool.findFirst({ where: { userId: userId, schoolId: targetSchoolId } });
        if (existing) {
          await tx.userSchool.updateMany({
            where: { userId: userId, schoolId: targetSchoolId },
            data: { isActive: true },
          });
        } else {
          await tx.userSchool.create({
            data: { userId: userId, schoolId: targetSchoolId, classId: null, isActive: true },
          });
        }
        await tx.userSchool.deleteMany({
          where: { userId: userId, schoolId: { not: targetSchoolId } },
        });
      };

      await ensureMembership();

      if (targetSchoolId && targetRoleId) {
        await tx.userRole.deleteMany({ where: { userId: userId, schoolId: targetSchoolId } });
        await tx.userRole.create({
          data: { userId: userId, roleId: targetRoleId, schoolId: targetSchoolId },
        });
      }

      if (finalType === "SISWA") {
        await tx.studentDetail.upsert({
          where: { userId: userId },
          update: { schoolId: targetSchoolId! },
          create: { userId: userId, schoolId: targetSchoolId! },
        });
        await tx.teacherDetail.deleteMany({ where: { userId: userId } });
        await tx.staffDetail.deleteMany({ where: { userId: userId } });
      } else if (finalType === "GURU") {
        await tx.teacherDetail.upsert({
          where: { userId_schoolId: { userId: userId, schoolId: targetSchoolId! } },
          update: { schoolId: targetSchoolId! },
          create: { userId: userId, schoolId: targetSchoolId! },
        });
        await tx.studentDetail.deleteMany({ where: { userId: userId } });
        await tx.staffDetail.deleteMany({ where: { userId: userId } });
      } else if (finalType === "STAFF") {
        await tx.staffDetail.upsert({
          where: { userId_schoolId: { userId: userId, schoolId: targetSchoolId! } },
          update: { schoolId: targetSchoolId! },
          create: { userId: userId, schoolId: targetSchoolId! },
        });
        await tx.studentDetail.deleteMany({ where: { userId: userId } });
        await tx.teacherDetail.deleteMany({ where: { userId: userId } });
      } else {
        await Promise.all([
          tx.studentDetail.deleteMany({ where: { userId: userId } }),
          tx.teacherDetail.deleteMany({ where: { userId: userId } }),
          tx.staffDetail.deleteMany({ where: { userId: userId } }),
        ]);
      }
    });

    return NextResponse.json({ id: userId });
  } catch (e: any) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requirePermission(req, { action: "DELETE", resource: "API/USERS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const { id } = await params;
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
