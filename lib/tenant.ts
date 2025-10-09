import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/auth";
import { ACTIVE_SCHOOL_COOKIE } from "@/lib/app";

export async function getUserFromRequest(req: NextRequest) {
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  const payload = token ? await verifyAccessToken(token) : null;
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, isSuperAdmin: true } });
  return user;
}

export function getActiveSchoolId(req: NextRequest): string | null {
  return req.cookies.get(ACTIVE_SCHOOL_COOKIE)?.value || null;
}

export async function assertMembership(req: NextRequest, schoolId: string): Promise<NextResponse | null> {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  if (user.isSuperAdmin) return null;
  const count = await prisma.userSchool.count({ where: { userId: user.id, schoolId } });
  if (count === 0) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  return null;
}

export async function enforceActiveSchool(req: NextRequest): Promise<{ schoolId: string } | NextResponse> {
  const schoolId = getActiveSchoolId(req);
  if (!schoolId) return NextResponse.json({ message: "Active school is required" }, { status: 400 });
  const deny = await assertMembership(req, schoolId);
  if (deny) return deny;
  return { schoolId };
}

