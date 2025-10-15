import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";

// Pages allowed without auth
const PUBLIC_ROUTES = ["/login"]; // redirect away if already logged-in

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";

const cookieOptions = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

const enc = new TextEncoder();
const ACCESS_SECRET = enc.encode(process.env.JWT_SECRET || "");
const REFRESH_SECRET = enc.encode(process.env.REFRESH_SECRET || "");
const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES_IN || "4h";

async function verify(token: string, secret: Uint8Array) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as Record<string, any>;
  } catch {
    return null;
  }
}

async function signAccess(payload: Record<string, any>) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_EXPIRES)
    .sign(ACCESS_SECRET);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAuthRoute = PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  const accessPayload = access ? await verify(access, ACCESS_SECRET) : null;
  const isLoggedIn = !!accessPayload;

  // If visiting login while logged-in -> redirect to dashboard
  if (isAuthRoute && isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Protect all routes except PUBLIC_ROUTES
  if (!isAuthRoute && !isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Enforce UI access based on role menus for logged-in users
  // Skip API routes and explicit public routes handled by matcher and PUBLIC_ROUTES
  if (!isAuthRoute && isLoggedIn) {
    // Allow error pages to avoid redirect loops
    if (pathname === "/error" || pathname.startsWith("/error/")) {
      return NextResponse.next();
    }

    // Super admin bypass
    const isSuper = !!(accessPayload as any)?.isSuperAdmin;
    if (isSuper) {
      return NextResponse.next();
    }

    const menus = Array.isArray((accessPayload as any)?.menus) ? (accessPayload as any).menus : [];
    const allowedPaths: string[] = menus
      .map((m: any) => (typeof m?.path === "string" ? m.path : null))
      .filter((p: unknown): p is string => typeof p === "string" && p.length > 0)
      // normalize: ensure leading slash, no trailing slash except root
      .map((p: string) => {
        let s = p.startsWith("/") ? p : `/${p}`;
        if (s.length > 1 && s.endsWith("/")) s = s.replace(/\/+$/, "");
        return s;
      });

    const isAllowedByMenu = (path: string) => {
      if (path === "/") return true; // root redirects to dashboard; allow base
      // normalize request path
      let reqPath = path;
      if (!reqPath.startsWith("/")) reqPath = `/${reqPath}`;
      if (reqPath.length > 1) reqPath = reqPath.replace(/\/+$/, "");
      // match exact or as a prefix child of any allowed path
      return allowedPaths.some((base) => reqPath === base || reqPath.startsWith(base + "/"));
    };

    if (!isAllowedByMenu(pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = "/error/403";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/|favicon.ico|api/|koala-login-illustration\\.png|koala-login-illustration-dark\\.png|sleepy\\.svg|panic\\.svg|find\\.svg|kwala\\.svg).*)",
  ],
};
