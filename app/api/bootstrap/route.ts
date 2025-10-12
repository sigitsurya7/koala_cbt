import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { ACCESS_COOKIE, cookieOptions, verifyAccessToken } from "@/lib/auth";
import { ACTIVE_SCHOOL_COOKIE } from "@/lib/app";
import { buildSessionContext } from "@/lib/session";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  const payload = token ? await verifyAccessToken(token) : null;
  if (!payload) return NextResponse.json({ user: null }, { status: 401 });

  const requestedSchoolId = req.cookies.get(ACTIVE_SCHOOL_COOKIE)?.value || payload.schoolId || null;

  try {
    const session = await buildSessionContext(payload.sub, {
      schoolId: requestedSchoolId,
    });

    const res = NextResponse.json({
      user: session.user,
      schools: session.schools,
      activeSchoolId: session.activeSchoolId,
      roles: session.roles,
      roleKey: session.roleKey,
      permissions: session.permissions,
      menus: session.menus,
    });

    if (session.activeSchoolId) {
      res.cookies.set(ACTIVE_SCHOOL_COOKIE, session.activeSchoolId, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
    } else {
      res.cookies.set(ACTIVE_SCHOOL_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    }

    return res;
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
