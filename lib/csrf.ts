import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function parseOrigin(url?: string | null) {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
}

export function getAllowedOrigin(req: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";
  const configured = parseOrigin(envUrl);
  if (configured) return configured;
  try {
    return new URL(req.url).origin;
  } catch {
    return null;
  }
}

export function assertCsrf(req: NextRequest): NextResponse | null {
  const method = (req.method || "GET").toUpperCase();
  const mutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  if (!mutating) return null;

  const allowed = getAllowedOrigin(req);
  const origin = parseOrigin(req.headers.get("origin"));
  const referer = parseOrigin(req.headers.get("referer"));

  if (!allowed) return null; // no configured origin -> skip (dev fallback)
  if (origin === allowed) return null;
  if (referer === allowed) return null;

  return NextResponse.json({ message: "Invalid CSRF origin" }, { status: 403 });
}

