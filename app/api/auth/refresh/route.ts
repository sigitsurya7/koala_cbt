import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  cookieOptions,
  signAccessToken,
  verifyRefreshToken,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh) return NextResponse.json({ message: "No refresh token" }, { status: 401 });

  const payload = await verifyRefreshToken(refresh);
  if (!payload) return NextResponse.json({ message: "Invalid refresh token" }, { status: 401 });

  const newAccess = await signAccessToken({
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    type: payload.type,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, newAccess, { ...cookieOptions, maxAge: 60 * 60 * 4 });
  return res;
}
