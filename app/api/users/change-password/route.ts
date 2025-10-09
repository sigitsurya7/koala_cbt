import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/auth";

function isStrong(pw: string) {
  if (!pw || pw.length < 6) return false;
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pw);
  return hasUpper && hasDigit && hasSpecial;
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(ACCESS_COOKIE)?.value;
    const payload = token ? await verifyAccessToken(token) : null;
    if (!payload) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    const userId = payload.sub;
    const body = await req.json();
    const currentPassword: string = body?.currentPassword ?? "";
    const newPassword: string = body?.newPassword ?? "";
    if (!currentPassword || !newPassword) return NextResponse.json({ message: "Password saat ini dan baru wajib" }, { status: 400 });
    if (!isStrong(newPassword)) return NextResponse.json({ message: "Password tidak cukup kuat (6+, ada huruf besar, angka, karakter khusus)" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 });
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return NextResponse.json({ message: "Password saat ini salah" }, { status: 400 });
    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal update password" }, { status: 400 });
  }
}

