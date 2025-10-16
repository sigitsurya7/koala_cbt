import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requirePermission(req, { action: "DELETE", resource: "API/CLASSES" });
  if (deny) return deny;
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  const payload = token ? await verifyAccessToken(token) : null;
  if (!payload?.sub) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: payload.sub }, select: { isSuperAdmin: true } });
  if (!me?.isSuperAdmin) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const { id: classId } = await params;
  // Collect all students in class
  const students = await prisma.studentDetail.findMany({ where: { classId }, select: { userId: true } });
  const userIds = students.map((s) => s.userId);
  if (userIds.length === 0) return NextResponse.json({ ok: true, deleted: 0 });
  await prisma.$transaction(async (tx) => {
    // Delete answers and attempts
    await tx.answer.deleteMany({ where: { attempt: { studentId: { in: userIds } } } });
    await tx.attempt.deleteMany({ where: { studentId: { in: userIds } } });
    // Clean mappings & details
    await tx.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await tx.userSchool.deleteMany({ where: { userId: { in: userIds } } });
    await tx.userDetail.deleteMany({ where: { userId: { in: userIds } } });
    await tx.studentDetail.deleteMany({ where: { userId: { in: userIds } } });
    await tx.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
    // Finally delete users
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
  }, { timeout: 120_000, maxWait: 10_000 });
  return NextResponse.json({ ok: true, deleted: userIds.length });
}

