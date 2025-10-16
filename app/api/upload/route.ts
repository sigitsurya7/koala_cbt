import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { requirePermission } from "@/lib/acl";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";

const ALLOWED = new Set<string>([
  // images
  "image/jpeg","image/png","image/gif","image/webp","image/svg+xml",
  // pdf
  "application/pdf",
  // audio (broad)
  "audio/mpeg","audio/mp3","audio/wav","audio/ogg","audio/webm","audio/aac","audio/flac","audio/midi","audio/x-midi","audio/x-wav","audio/3gpp","audio/3gpp2","audio/mp4","audio/x-m4a",
]);

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9_\.-]/g, "_");
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/QUESTIONS" });
  if (deny) return deny;
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ message: "file wajib" }, { status: 400 });
    const mime = (file as any).type || "";
    if (!mime || (!ALLOWED.has(mime) && !(mime.startsWith("image/") || mime.startsWith("audio/")))) {
      return NextResponse.json({ message: "Tipe file tidak didukung" }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const now = new Date();
    const basedir = path.join(process.cwd(), "public", "uploads", String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"));
    await fs.mkdir(basedir, { recursive: true });
    const uuid = randomUUID();
    const original = sanitizeName((file as any).name || "file");
    const filename = `${uuid}_${original}`;
    const full = path.join(basedir, filename);
    await fs.writeFile(full, buf);
    const rel = ["/uploads", String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"), filename].join("/");
    return NextResponse.json({ ok: true, url: rel, name: original, mime, size: buf.length });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Upload gagal" }, { status: 500 });
  }
}

