import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/auth";
import { ACTIVE_SCHOOL_COOKIE } from "@/lib/app";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  const payload = token ? await verifyAccessToken(token) : null;
  if (!payload) return NextResponse.json({ user: null }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, type: true, isSuperAdmin: true, userDetail: { select: { avatarUrl: true } } },
  });
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  const schools = await prisma.userSchool.findMany({
    where: { userId: user.id },
    include: { school: { select: { id: true, name: true, code: true } } },
  });
  const schoolList = schools.map((us) => us.school);

  const activeSchoolId = req.cookies.get(ACTIVE_SCHOOL_COOKIE)?.value || schoolList[0]?.id || null;

  const roles = await prisma.userRole.findMany({
    where: { userId: user.id, OR: [{ schoolId: activeSchoolId }, { schoolId: null }] },
    include: { role: true },
  });
  const permissions = await prisma.rolePermission.findMany({
    where: { roleId: { in: roles.map((r) => r.roleId) } },
    include: { permission: true },
  });

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, type: user.type, isSuperAdmin: user.isSuperAdmin, userDetail: user.userDetail },
    schools: schoolList,
    activeSchoolId,
    roles: roles.map((r) => ({ id: r.role.id, name: r.role.name, key: r.role.key, scope: r.role.scope })),
    permissions: permissions.map((rp) => ({ action: rp.permission.action, resource: rp.permission.resource })),
  });
}
