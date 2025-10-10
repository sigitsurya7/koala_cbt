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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/|favicon.ico|api/).*)", // run on pages except Next assets and api
  ],
};
