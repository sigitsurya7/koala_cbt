import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import { enforceActiveSchool } from "@/lib/tenant";

type Row = {
  // Inggris
  type?: string; text?: string; correctKey?: string; points?: number | string; difficulty?: number | string;
  // Indonesia
  tipe?: string; teks?: string; kunci?: string; poin?: number | string; kesulitan?: number | string;
  A?: string; B?: string; C?: string; D?: string; E?: string;
};

function norm(s?: string | null) { return (s ?? "").toString().trim(); }

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/QUESTIONS" });
  if (deny) return deny;
  const body = await req.json();
  const subjectId: string = body?.subjectId;
  const rawRows: any[] = Array.isArray(body?.rows) ? body.rows : [];
  const rows: Row[] = rawRows as Row[];
  if (!subjectId || rows.length === 0) return NextResponse.json({ message: "subjectId dan rows wajib" }, { status: 400 });
  const ensured = await enforceActiveSchool(req);
  if (ensured instanceof NextResponse) return ensured;
  const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { schoolId: true } });
  if (!subject || subject.schoolId !== ensured.schoolId) return NextResponse.json({ message: "Subject tidak valid untuk sekolah aktif" }, { status: 400 });

  const errors: Array<{ row: number; message: string }> = [];
  const prepared: any[] = [];

  rows.forEach((r0, idx) => {
    const r = r0 || {};
    const type = (norm(r.tipe) || norm(r.type)).toUpperCase();
    const text = norm(r.teks) || norm(r.text);
    const points = Number((r.poin ?? r.points) ?? 1) || 1;
    const difficulty = Math.max(0, Math.min(10, Number((r.kesulitan ?? r.difficulty) ?? 1) || 1));
    if (!text) { errors.push({ row: idx + 2, message: "text wajib" }); return; }
    if (!(type === "MCQ" || type === "ESSAY")) { errors.push({ row: idx + 2, message: "type harus MCQ/ESSAY" }); return; }

    if (type === "MCQ") {
      const opts = ["A","B","C","D","E"].map((k) => ({ key: k, text: norm((r as any)[k]) })).filter((o) => !!o.text);
      if (opts.length < 2) { errors.push({ row: idx + 2, message: "MCQ butuh minimal 2 opsi" }); return; }
      const ck = (norm(r.kunci) || norm(r.correctKey) || "A").toUpperCase();
      if (!opts.find((o) => o.key === ck)) { errors.push({ row: idx + 2, message: `correctKey '${ck}' tidak ada pada opsi` }); return; }
      prepared.push({ subjectId, type, text, options: opts, correctKey: ck, points, difficulty });
      return;
    }

    // ESSAY
    prepared.push({ subjectId, type, text, points, difficulty });
  });

  const ok = errors.length === 0;
  return NextResponse.json({ ok, errors, items: prepared });
}
