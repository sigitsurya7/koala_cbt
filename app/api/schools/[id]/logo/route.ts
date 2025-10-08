import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import fs from "fs/promises";
import path from "path";

function getPngWidth(buf: Uint8Array): number | null {
  // PNG signature 8 bytes
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < sig.length; i++) if (buf[i] !== sig[i]) return null;
  // IHDR chunk starts at byte 8+8; width at offset 16-19 (big-endian)
  const view = new DataView(buf.buffer);
  const width = view.getUint32(16, false);
  return width || null;
}

function parseSvgViewBoxWidth(text: string): number | null {
  const m = text.match(/viewBox\s*=\s*"([^"]+)"/i);
  if (!m) return null;
  const parts = m[1].trim().split(/[ ,]+/).map(Number);
  if (parts.length === 4 && Number.isFinite(parts[2])) return parts[2];
  return null;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/SCHOOLS" });
  if (deny) return deny;
  try {
    const schoolId = params.id;
    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true } });
    if (!school) return NextResponse.json({ message: "Sekolah tidak ditemukan" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ message: "File tidak ditemukan" }, { status: 400 });

    const extByType: Record<string, string> = {
      "image/png": "png",
      "image/svg+xml": "svg",
    };
    const ext = extByType[file.type as keyof typeof extByType] || (file.name?.toLowerCase().endsWith(".png") ? "png" : file.name?.toLowerCase().endsWith(".svg") ? "svg" : "");
    if (ext !== "png" && ext !== "svg") {
      return NextResponse.json({ message: "Format harus PNG atau SVG" }, { status: 400 });
    }

    const arrayBuf = new Uint8Array(await file.arrayBuffer());
    // Validate width
    const minW = 64;
    const maxW = 1024;
    if (ext === "png") {
      const w = getPngWidth(arrayBuf);
      if (!w || w < minW || w > maxW) {
        return NextResponse.json({ message: `Lebar PNG harus antara ${minW}-${maxW}px` }, { status: 400 });
      }
    } else if (ext === "svg") {
      const text = new TextDecoder().decode(arrayBuf);
      const w = parseSvgViewBoxWidth(text);
      if (w && (w < minW || w > maxW)) {
        return NextResponse.json({ message: `Lebar SVG (viewBox) harus antara ${minW}-${maxW}` }, { status: 400 });
      }
    }

    // Save file
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "schools", schoolId);
    await fs.mkdir(uploadsDir, { recursive: true });
    const filename = `${schoolId}_logo_sekolah.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    await fs.writeFile(filepath, arrayBuf);
    const publicUrl = `/uploads/schools/${schoolId}/${filename}`;

    await prisma.school.update({ where: { id: schoolId }, data: { logoUrl: publicUrl } });
    return NextResponse.json({ url: publicUrl });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal upload logo" }, { status: 500 });
  }
}
