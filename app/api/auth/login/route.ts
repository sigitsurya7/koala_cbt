import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions, issueTokens } from "@/lib/auth";
import { ACTIVE_SCHOOL_COOKIE } from "@/lib/app";
import { buildSessionContext } from "@/lib/session";
import { getClientKey, rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(`login:${getClientKey(req)}`, 10, 60_000);
    if (!rl.ok) return NextResponse.json({ message: "Terlalu banyak percobaan. Coba lagi nanti." }, { status: 429 });
    const body = await req.json();
    const identifier: string = body?.identifier?.toString() ?? body?.email?.toString() ?? "";
    const password: string = body?.password?.toString() ?? "";
    const schoolId: string | null = body?.schoolId ? String(body.schoolId) : null;

    if (!identifier || !password) {
      return NextResponse.json({ message: "Identitas dan password wajib" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: identifier }] },
      select: { id: true, email: true, name: true, type: true, passwordHash: true, isSuperAdmin: true, isActive: true },
    });
    if (!user) {
      return NextResponse.json({ message: "Kredensial salah" }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ message: "Akun tidak aktif" }, { status: 403 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ message: "Kredensial salah" }, { status: 401 });
    }

    const session = await buildSessionContext(user.id, {
      schoolId,
    });

    const { accessToken, refreshToken } = await issueTokens(session.jwtPayload);

    const res = NextResponse.json({
      user: session.user,
      schools: session.schools,
      activeSchoolId: session.activeSchoolId,
      roles: session.roles,
      roleKey: session.roleKey,
      permissions: session.permissions,
      menus: session.menus,
    });

    res.cookies.set(ACCESS_COOKIE, accessToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 4, // 4h
    });
    res.cookies.set(REFRESH_COOKIE, refreshToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 7, // 7d
    });

    if (session.activeSchoolId) {
      res.cookies.set(ACTIVE_SCHOOL_COOKIE, session.activeSchoolId, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
    } else {
      res.cookies.set(ACTIVE_SCHOOL_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    }

    return res;
  } catch (e: any) {
    if (e?.message === "User has no school memberships") {
      return NextResponse.json({ message: "Akun belum terhubung ke sekolah" }, { status: 403 });
    }
    if (e?.message === "Invalid school selection") {
      return NextResponse.json({ message: "Sekolah tidak valid" }, { status: 400 });
    }
    return NextResponse.json({ message: "Terjadi kesalahan" }, { status: 500 });
  }
}
