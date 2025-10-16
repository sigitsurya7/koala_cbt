import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import { resolveSchoolContext } from "@/lib/tenant";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/USERS" });
  if (deny) return deny;
  const ctx = await resolveSchoolContext(req);
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, username: true, email: true, type: true, isSuperAdmin: true } });
  if (!user) return NextResponse.json({ message: "Not found" }, { status: 404 });
  const [ud, sd, td, stf] = await Promise.all([
    prisma.userDetail.findUnique({ where: { userId: id } }),
    prisma.studentDetail.findUnique({ where: { userId: id }, include: { class: true, department: true, school: { select: { id: true, name: true, code: true } } } }),
    prisma.teacherDetail.findFirst({ where: { userId: id, schoolId: ctx.schoolId }, include: { subject: true, school: { select: { id: true, name: true, code: true } } } }),
    prisma.staffDetail.findFirst({ where: { userId: id, schoolId: ctx.schoolId }, include: { school: { select: { id: true, name: true, code: true } } } }),
  ]);
  return NextResponse.json({ user, userDetail: ud, studentDetail: sd, teacherDetail: td, staffDetail: stf });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/USERS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ctx = await resolveSchoolContext(req);
    if (ctx instanceof NextResponse) return ctx;
    const schema = z.object({
      userDetail: z.any().optional(),
      studentDetail: z.any().optional(),
      teacherDetail: z.any().optional(),
      staffDetail: z.any().optional(),
    });
    const { userDetail, studentDetail, teacherDetail, staffDetail } = zparse(schema, await req.json());
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, type: true } });
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
          where: { userId: id },
          update: ud,
          create: { userId: id, fullName: userDetail.fullName || "" },
        });
      }
      if (user.type === "SISWA" && studentDetail) {
        await tx.studentDetail.upsert({
          where: { userId: id },
          update: studentDetail,
          create: { userId: id, schoolId: studentDetail.schoolId, ...studentDetail },
        });
      }
      if (user.type === "GURU" && teacherDetail) {
        const data = { userId: id, schoolId: teacherDetail.schoolId ?? ctx.schoolId, ...teacherDetail };
        const exists = await tx.teacherDetail.findFirst({ where: { userId: id, schoolId: data.schoolId } });
        if (exists) await tx.teacherDetail.updateMany({ where: { userId: id, schoolId: data.schoolId }, data }); else await tx.teacherDetail.create({ data });
      }
      if (user.type === "STAFF" && staffDetail) {
        const data = { userId: id, schoolId: staffDetail.schoolId ?? ctx.schoolId, ...staffDetail };
        const exists = await tx.staffDetail.findFirst({ where: { userId: id, schoolId: data.schoolId } });
        if (exists) await tx.staffDetail.updateMany({ where: { userId: id, schoolId: data.schoolId }, data }); else await tx.staffDetail.create({ data });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return handleApiError(e);
  }
}
