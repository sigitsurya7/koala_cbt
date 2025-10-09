import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import { requirePermission } from "@/lib/acl";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/USERS" });
  if (deny) return deny;
  try {
    const userId = params.id;
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ message: "File tidak ditemukan" }, { status: 400 });
    const ext = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : file.name.toLowerCase().endsWith(".svg") ? "svg" : "";
    if (!ext) return NextResponse.json({ message: "Hanya PNG/JPG/SVG" }, { status: 400 });
    const data = new Uint8Array(await file.arrayBuffer());
    const dir = path.join(process.cwd(), "public", "uploads", "users", userId);
    await fs.mkdir(dir, { recursive: true });
    const filename = `${userId}_avatar.${ext}`;
    const filepath = path.join(dir, filename);
    await fs.writeFile(filepath, data);
    const url = `/uploads/users/${userId}/${filename}`;
    await prisma.userDetail.upsert({ where: { userId }, update: { avatarUrl: url }, create: { userId, fullName: "", avatarUrl: url } });
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal upload avatar" }, { status: 400 });
  }
}

