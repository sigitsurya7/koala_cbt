import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { parsePageQuery, pageToSkipTake } from "@/lib/pagination";
import { requirePermission } from "@/lib/acl";
import { resolveSchoolContext } from "@/lib/tenant";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/PERIODS" });
  if (deny) return deny;
  const { searchParams } = new URL(req.url);
  const ctx = await resolveSchoolContext(req);
  if (ctx instanceof NextResponse) return ctx;
  const academicYearId = searchParams.get("academicYearId") || undefined;
  const { page, perPage } = parsePageQuery(req);
  const where: any = { schoolId: ctx.schoolId, ...(academicYearId ? { academicYearId } : {}) };
  const total = await prisma.period.count({ where });
  const { skip, take } = pageToSkipTake(page, perPage);
  const data = await prisma.period.findMany({ where, orderBy: [{ startDate: "desc" }], skip, take });
  return NextResponse.json({ data, page, perPage, total, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/PERIODS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ctx = await resolveSchoolContext(req);
    if (ctx instanceof NextResponse) return ctx;
    const schema = z.object({
      academicYearId: z.string().trim().min(1),
      type: z.string().trim().min(1),
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      isActive: z.boolean().optional(),
    });
    const { academicYearId, type, startDate, endDate, isActive = false } = zparse(schema, await req.json());
    const created = await prisma.period.create({ data: { schoolId: ctx.schoolId, academicYearId, type: type as any, startDate: new Date(startDate), endDate: new Date(endDate), isActive } });
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return handleApiError(e);
  }
}

