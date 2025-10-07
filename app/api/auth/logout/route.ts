import { NextResponse } from "next/server";
export const runtime = "nodejs";
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
