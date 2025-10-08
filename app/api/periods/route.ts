import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { parsePageQuery, pageToSkipTake } from "@/lib/pagination";
import { requirePermission } from "@/lib/acl";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/PERIODS" });
  if (deny) return deny;
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId") || undefined;
  const academicYearId = searchParams.get("academicYearId") || undefined;
  if (!schoolId) return NextResponse.json({ data: [], page: 1, perPage: 10, total: 0, totalPages: 0 });
  const { page, perPage } = parsePageQuery(req);
  const where: any = { schoolId, ...(academicYearId ? { academicYearId } : {}) };
  const total = await prisma.period.count({ where });
  const { skip, take } = pageToSkipTake(page, perPage);
  const data = await prisma.period.findMany({ where, orderBy: [{ startDate: "desc" }], skip, take });
  return NextResponse.json({ data, page, perPage, total, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/PERIODS" });
  if (deny) return deny;
  try {
    const body = await req.json();
    const { schoolId, academicYearId, type, startDate, endDate, isActive = false } = body ?? {};
    if (!schoolId || !academicYearId || !type || !startDate || !endDate)
      return NextResponse.json({ message: "schoolId, academicYearId, type, startDate, endDate wajib" }, { status: 400 });
    const created = await prisma.period.create({ data: { schoolId, academicYearId, type, startDate: new Date(startDate), endDate: new Date(endDate), isActive } });
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal membuat periode" }, { status: 500 });
  }
}

