import { SignJWT, jwtVerify } from "jose";

export type JwtPayload = {
  sub: string; // user id
  email: string;
  name?: string;
  type?: string;
};

const enc = new TextEncoder();
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "4h";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

function getAccessSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  return enc.encode(secret);
}

function getRefreshSecret() {
  const secret = process.env.REFRESH_SECRET;
  if (!secret) throw new Error("REFRESH_SECRET not set");
  return enc.encode(secret);
}

export async function signAccessToken(payload: JwtPayload) {
  return await new SignJWT(payload as unknown as Record<string, any>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRES_IN)
    .sign(getAccessSecret());
}

export async function signRefreshToken(payload: JwtPayload) {
  return await new SignJWT(payload as unknown as Record<string, any>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRES_IN)
    .sign(getRefreshSecret());
}

export async function verifyAccessToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAccessSecret());
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getRefreshSecret());
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

export const cookieOptions = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
