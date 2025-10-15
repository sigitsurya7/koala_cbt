import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import { resolveSchoolContext } from "@/lib/tenant";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/auth";

const OptionSchema = z.object({ key: z.string().min(1), text: z.string().min(1) });
const ItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("MCQ"),
    text: z.string().min(1),
    options: z.array(OptionSchema).min(2).max(5),
    correctKey: z.string().min(1),
    points: z.number().int().min(0).default(1),
    difficulty: z.number().int().min(0).max(10).default(1),
  }),
  z.object({
    type: z.literal("ESSAY"),
    text: z.string().min(1),
    points: z.number().int().min(0).default(1),
    difficulty: z.number().int().min(0).max(10).default(1),
  }),
]);

const Schema = z.object({ subjectId: z.string().min(1), academicYearId: z.string().optional().nullable(), periodId: z.string().optional().nullable(), items: z.array(ItemSchema).min(1) });

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/QUESTIONS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ctx = await resolveSchoolContext(req);
    if (ctx instanceof NextResponse) return ctx;
    const { subjectId, items, academicYearId, periodId } = zparse(Schema, await req.json());
    const token = req.cookies.get(ACCESS_COOKIE)?.value;
    const payload = token ? await verifyAccessToken(token) : null;
    if (!payload?.sub) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    // tenant check: subject must belong to active school
    const subj = await prisma.subject.findUnique({ where: { id: subjectId }, select: { schoolId: true } });
    if (!subj || subj.schoolId !== ctx.schoolId) return NextResponse.json({ message: "Subject tidak valid untuk sekolah aktif" }, { status: 400 });

    const count = await prisma.$transaction(async (tx) => {
      let created = 0;
      for (const it of items) {
        await tx.question.create({
          data: {
            schoolId: ctx.schoolId,
            subjectId,
            type: it.type,
            text: it.text,
            options: (it as any).options ?? undefined,
            correctKey: (it as any).correctKey ?? undefined,
            points: (it as any).points ?? 1,
            difficulty: (it as any).difficulty ?? 1,
            createdById: payload.sub,
            academicYearId: academicYearId ?? null,
            periodId: periodId ?? null,
          },
        });
        created++;
      }
      return created;
    }, { timeout: 120_000, maxWait: 10_000 });

    return NextResponse.json({ ok: true, inserted: count });
  } catch (e: any) {
    return handleApiError(e);
  }
}
