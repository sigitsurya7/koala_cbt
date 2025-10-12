import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { generateJti, parseDuration } from "@/lib/tokenUtil";
import { JwtPayload } from "@/types/auth";
import { buildSessionContext } from "@/lib/session";

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

export async function issueTokens(payload: JwtPayload) {
  const accessToken = await signAccessToken(payload);
  const jti = generateJti();
  const refreshToken = await signRefreshToken({ ...payload, jti } as any);
  // persist refresh record
  const ms = parseDuration(REFRESH_TOKEN_EXPIRES_IN);
  const expiresAt = new Date(Date.now() + (ms || 7 * 24 * 60 * 60 * 1000));
  await prisma.refreshToken.create({ data: { userId: payload.sub, jti, expiresAt } });
  return { accessToken, refreshToken, jti, expiresAt };
}

export async function rotateRefreshToken(oldToken: string) {
  const payload = await verifyRefreshToken(oldToken);
  if (!payload || !payload.sub || !(payload as any).jti) return null;
  const jti = String((payload as any).jti);
  const record = await prisma.refreshToken.findUnique({ where: { jti } });
  if (!record || record.revoked || record.userId !== payload.sub || record.expiresAt < new Date()) return null;
  // revoke old
  await prisma.refreshToken.update({ where: { jti }, data: { revoked: true, revokedAt: new Date() } });
  // issue new
  try {
    const session = await buildSessionContext(payload.sub, {
      schoolId: typeof payload.schoolId === "string" ? payload.schoolId : null,
    });
    return await issueTokens(session.jwtPayload);
  } catch {
    return null;
  }
}

export async function revokeRefreshToken(token: string) {
  const payload = await verifyRefreshToken(token);
  if (!payload || !(payload as any).jti) return;
  const jti = String((payload as any).jti);
  try {
    await prisma.refreshToken.update({ where: { jti }, data: { revoked: true, revokedAt: new Date() } });
  } catch {}
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
