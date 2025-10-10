import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import { enforceActiveSchool } from "@/lib/tenant";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/auth";

type Item = {
  subjectId: string;
  type: "MCQ" | "ESSAY";
  text: string;
  options?: Array<{ key: string; text: string }>;
  correctKey?: string;
  points?: number;
  difficulty?: number;
};

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/QUESTIONS" });
  if (deny) return deny;
  const ensured = await enforceActiveSchool(req);
  if (ensured instanceof NextResponse) return ensured;
  const body = await req.json();
  const items: Item[] = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) return NextResponse.json({ message: "items kosong" }, { status: 400 });
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  const payload = token ? await verifyAccessToken(token) : null;

  try {
    let failureIndex = -1;
    const count = await prisma.$transaction(async (tx) => {
      let inserted = 0;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        failureIndex = i;
        const subj = await tx.subject.findUnique({ where: { id: it.subjectId } });
        if (!subj || subj.schoolId !== ensured.schoolId) throw new Error("Subject tidak valid untuk sekolah aktif");
        await tx.question.create({
          data: {
            schoolId: subj.schoolId,
            subjectId: it.subjectId,
            type: it.type,
            text: it.text,
            options: it.options as any,
            correctKey: it.correctKey,
            points: it.points ?? 1,
            difficulty: it.difficulty ?? 1,
            createdById: payload?.sub || undefined,
          },
        });
        inserted++;
      }
      return inserted;
    }, { timeout: 120_000, maxWait: 10_000 });
    return NextResponse.json({ ok: true, inserted: count, failed: 0 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "Gagal import", failedIndex: (typeof failureIndex === 'number' && failureIndex >= 0) ? failureIndex : null }, { status: 400 });
  }
}
