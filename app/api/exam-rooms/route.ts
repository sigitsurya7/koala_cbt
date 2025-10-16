import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import { assertCsrf } from "@/lib/csrf";
import { resolveSchoolContext } from "@/lib/tenant";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/EXAMS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ctx = await resolveSchoolContext(req);
    if (ctx instanceof NextResponse) return ctx;
    const schema = z.object({
      roomId: z.string().min(1),
      classIds: z.array(z.string().min(1)).min(1),
      academicYearId: z.string().min(1),
      periodId: z.string().min(1),
    });
    const { roomId, classIds, academicYearId, periodId } = zparse(schema, await req.json());
    // Validate belongs to school
    const [room, ay, period, classes] = await Promise.all([
      prisma.room.findUnique({ where: { id: roomId }, select: { schoolId: true } }),
      prisma.academicYear.findUnique({ where: { id: academicYearId }, select: { schoolId: true } }),
      prisma.period.findUnique({ where: { id: periodId }, select: { schoolId: true, academicYearId: true } }),
      prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true, schoolId: true } }),
    ]);
    if (!room || room.schoolId !== ctx.schoolId) return NextResponse.json({ message: "Ruangan tidak valid" }, { status: 400 });
    if (!ay || ay.schoolId !== ctx.schoolId) return NextResponse.json({ message: "Tahun ajaran tidak valid" }, { status: 400 });
    if (!period || period.schoolId !== ctx.schoolId || period.academicYearId !== academicYearId) return NextResponse.json({ message: "Periode tidak valid" }, { status: 400 });
    if (classes.length !== classIds.length || classes.some((c) => c.schoolId !== ctx.schoolId)) return NextResponse.json({ message: "Kelas tidak valid" }, { status: 400 });

    const created = await prisma.$transaction(async (tx) => {
      const er = await tx.examRoom.create({ data: { roomId, academicYearId, periodId } });
      if (classIds.length) {
        await tx.examRoomClass.createMany({ data: classIds.map((cid) => ({ examRoomId: er.id, classId: cid })) });
      }
      return er;
    });
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return handleApiError(e);
  }
}

