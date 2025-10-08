import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { ACTIVE_SCHOOL_COOKIE } from "@/lib/app";
import { cookieOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const schoolId: string | null = body?.schoolId ?? null;
  const res = NextResponse.json({ ok: true, activeSchoolId: schoolId });
  if (schoolId) res.cookies.set(ACTIVE_SCHOOL_COOKIE, schoolId, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
  else res.cookies.set(ACTIVE_SCHOOL_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}

