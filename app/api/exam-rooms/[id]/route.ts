import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/EXAMS" });
  if (deny) return deny;
  const { id } = await params;
  const er = await prisma.examRoom.findUnique({
    where: { id },
    include: { room: true, classes: { include: { class: { select: { id: true, name: true } } } } },
  });
  if (!er) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const classIds = er.classes.map((c) => c.classId);
  const capacity = er.room?.capacity ?? 0;
  const existingMembers = await prisma.examRoomMember.findMany({ where: { examRoomId: id }, select: { userId: true } });
  const existingIds = new Set(existingMembers.map((m) => m.userId));
  const candidatesRaw = await prisma.studentDetail.findMany({
    where: { classId: { in: classIds.length ? classIds : ["-"] }, userId: { notIn: Array.from(existingIds) } },
    include: { user: { select: { id: true, name: true, username: true, email: true } }, class: true },
  });
  const randomized = shuffle(candidatesRaw);
  const limited = capacity > 0 ? randomized.slice(0, capacity) : randomized;
  const candidates = limited.map((s) => ({ userId: s.userId, name: s.user?.name, username: s.user?.username, email: s.user?.email, className: s.class?.name || null }));

  return NextResponse.json({ examRoom: { id: er.id, roomName: er.room?.name, capacity: er.room?.capacity ?? null, academicYearId: er.academicYearId, periodId: er.periodId, classIds }, candidates });
}

