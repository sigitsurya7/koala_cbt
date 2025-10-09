import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/USERS" });
  if (deny) return deny;
  const user = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, name: true, email: true, type: true, isSuperAdmin: true } });
  if (!user) return NextResponse.json({ message: "Not found" }, { status: 404 });
  const [ud, sd, td, stf] = await Promise.all([
    prisma.userDetail.findUnique({ where: { userId: params.id } }),
    prisma.studentDetail.findUnique({ where: { userId: params.id }, include: { class: true, department: true, school: { select: { id: true, name: true, code: true } } } }),
    prisma.teacherDetail.findUnique({ where: { userId: params.id }, include: { subject: true, school: { select: { id: true, name: true, code: true } } } }),
    prisma.staffDetail.findUnique({ where: { userId: params.id }, include: { school: { select: { id: true, name: true, code: true } } } }),
  ]);
  return NextResponse.json({ user, userDetail: ud, studentDetail: sd, teacherDetail: td, staffDetail: stf });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/USERS" });
  if (deny) return deny;
  try {
    const body = await req.json();
    const { userDetail, studentDetail, teacherDetail, staffDetail } = body ?? {};
    const user = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, type: true } });
    if (!user) return NextResponse.json({ message: "Not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      if (userDetail) {
        // sanitize and coerce types (notably birthDate)
        const ud: any = { ...userDetail };
        if (typeof ud.birthDate === "string") {
          ud.birthDate = ud.birthDate ? new Date(ud.birthDate) : null;
        }
        if (ud.birthDate === "") ud.birthDate = null;
        await tx.userDetail.upsert({
          where: { userId: params.id },
          update: ud,
          create: { userId: params.id, fullName: userDetail.fullName || "" },
        });
      }
      if (user.type === "SISWA" && studentDetail) {
        await tx.studentDetail.upsert({
          where: { userId: params.id },
          update: studentDetail,
          create: { userId: params.id, schoolId: studentDetail.schoolId, ...studentDetail },
        });
      }
      if (user.type === "GURU" && teacherDetail) {
        await tx.teacherDetail.upsert({
          where: { userId: params.id },
          update: teacherDetail,
          create: { userId: params.id, schoolId: teacherDetail.schoolId, ...teacherDetail },
        });
      }
      if (user.type === "STAFF" && staffDetail) {
        await tx.staffDetail.upsert({
          where: { userId: params.id },
          update: staffDetail,
          create: { userId: params.id, schoolId: staffDetail.schoolId, ...staffDetail },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal menyimpan detail" }, { status: 500 });
  }
}
