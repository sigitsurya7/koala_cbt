import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions, rotateRefreshToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh) return NextResponse.json({ message: "No refresh token" }, { status: 401 });
  const rotated = await rotateRefreshToken(refresh);
  if (!rotated) return NextResponse.json({ message: "Invalid refresh token" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, rotated.accessToken, { ...cookieOptions, maxAge: 60 * 60 * 4 });
  res.cookies.set(REFRESH_COOKIE, rotated.refreshToken, { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 });
  return res;
}
