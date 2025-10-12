import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { ACTIVE_SCHOOL_COOKIE } from "@/lib/app";
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions, issueTokens, revokeRefreshToken, verifyAccessToken } from "@/lib/auth";
import { buildSessionContext } from "@/lib/session";

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value || null;
  const payload = accessToken ? await verifyAccessToken(accessToken) : null;
  if (!payload) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json();
  const schoolId: string | null = body?.schoolId ? String(body.schoolId) : null;

  try {
    const session = await buildSessionContext(payload.sub, {
      schoolId,
    });

    const res = NextResponse.json({
      ok: true,
      activeSchoolId: session.activeSchoolId,
      roles: session.roles,
      roleKey: session.roleKey,
      permissions: session.permissions,
      menus: session.menus,
    });

    const previousRefresh = req.cookies.get(REFRESH_COOKIE)?.value || null;
    if (previousRefresh) {
      try {
        await revokeRefreshToken(previousRefresh);
      } catch {}
    }

    const { accessToken: newAccess, refreshToken: newRefresh } = await issueTokens(session.jwtPayload);

    res.cookies.set(ACCESS_COOKIE, newAccess, { ...cookieOptions, maxAge: 60 * 60 * 4 });
    res.cookies.set(REFRESH_COOKIE, newRefresh, { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 });

    if (session.activeSchoolId) {
      res.cookies.set(ACTIVE_SCHOOL_COOKIE, session.activeSchoolId, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
    } else {
      res.cookies.set(ACTIVE_SCHOOL_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    }

    return res;
  } catch (e: any) {
    if (e?.message === "Invalid school selection") {
      return NextResponse.json({ message: "Sekolah tidak valid" }, { status: 400 });
    }
    return NextResponse.json({ message: "Gagal mengatur sekolah aktif" }, { status: 400 });
  }
}
