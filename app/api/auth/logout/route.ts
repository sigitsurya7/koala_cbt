import { NextResponse } from "next/server";
export const runtime = "nodejs";
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions, revokeRefreshToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // @ts-ignore - NextRequest type not used here, access via headers is enough
    const cookies = (req as any).cookies || undefined;
    // best-effort revoke
    const cookieHeader = (req.headers.get("cookie") || "");
    const refreshMatch = /(?:^|; )refresh_token=([^;]+)/.exec(cookieHeader);
    if (refreshMatch) {
      try { await revokeRefreshToken(decodeURIComponent(refreshMatch[1])); } catch {}
    }
  } catch {}
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
