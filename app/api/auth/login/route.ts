import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  cookieOptions,
  signAccessToken,
  signRefreshToken,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email: string = body?.email?.toString() ?? "";
    const password: string = body?.password?.toString() ?? "";

    if (!email || !password) {
      return NextResponse.json({ message: "Email dan password wajib" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ message: "Kredensial salah" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ message: "Kredensial salah" }, { status: 401 });
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      type: user.type,
    };

    const accessToken = await signAccessToken(payload);
    const refreshToken = await signRefreshToken(payload);

    const res = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, type: user.type },
    });

    res.cookies.set(ACCESS_COOKIE, accessToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 4, // 4h
    });
    res.cookies.set(REFRESH_COOKIE, refreshToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 7, // 7d
    });

    return res;
  } catch (e) {
    return NextResponse.json({ message: "Terjadi kesalahan" }, { status: 500 });
  }
}
