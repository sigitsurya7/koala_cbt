import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import bcrypt from "bcryptjs";

type Item = {
  fullName: string;
  nis: string;
  email: string;
  username: string;
  passwordPlain: string;
  schoolId: string;
  classId?: string | null;
  departmentId?: string | null;
  entryYear?: number | null;
  gender?: string | null;
  birthPlace?: string | null;
  birthDate?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  guardianJob?: string | null;
  address?: string | null;
  status?: string | null;
};

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/USERS" });
  if (deny) return deny;
  const body = await req.json();
  const items: Item[] = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) return NextResponse.json({ message: "items kosong" }, { status: 400 });

  try {
    let failureIndex = -1;
    const count = await prisma.$transaction(async (tx) => {
      let inserted = 0;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        failureIndex = i;
        const hash = await bcrypt.hash(it.passwordPlain, 10);
        const user = await tx.user.create({
          data: { name: it.fullName, email: it.email, username: it.username, passwordHash: hash, type: "SISWA" },
        });
        await tx.userDetail.create({ data: { userId: user.id, fullName: it.fullName, gender: it.gender ?? undefined, birthPlace: it.birthPlace ?? undefined, birthDate: it.birthDate ? new Date(it.birthDate) : undefined, phone: null, address: it.address ?? undefined, religion: null, avatarUrl: null } });
        await tx.studentDetail.create({
          data: {
            userId: user.id,
            nis: it.nis,
            schoolId: it.schoolId,
            classId: it.classId ?? undefined,
            departmentId: it.departmentId ?? undefined,
            entryYear: it.entryYear ?? undefined,
            status: it.status ?? undefined,
            guardianName: it.guardianName ?? undefined,
            guardianPhone: it.guardianPhone ?? undefined,
            guardianJob: it.guardianJob ?? undefined,
            address: it.address ?? undefined,
          },
        });
        // Create membership mapping to make it appear in user listing per school
        await tx.userSchool.create({ data: { userId: user.id, schoolId: it.schoolId, classId: it.classId ?? null, isActive: true } });
        inserted++;
      }
      return inserted;
    }, { timeout: 120_000, maxWait: 10_000 });
    return NextResponse.json({ ok: true, inserted: count, failed: 0 });
  } catch (e: any) {
    // Failure index is zero-based; csv-like row ~ index + 2 (with header)
    return NextResponse.json({ ok: false, message: e?.message ?? "Gagal import", failedIndex: (typeof failureIndex === 'number' && failureIndex >= 0) ? failureIndex : null }, { status: 400 });
  }
}
