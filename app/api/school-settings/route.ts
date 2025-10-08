import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { parsePageQuery, pageToSkipTake, buildSearchWhere } from "@/lib/pagination";
import { requirePermission } from "@/lib/acl";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/SCHOOL_SETTINGS" });
  if (deny) return deny;
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId") || undefined;
  if (!schoolId) return NextResponse.json({ data: [], page: 1, perPage: 10, total: 0, totalPages: 0 });
  const { page, perPage, q } = parsePageQuery(req);
  const where: any = { schoolId, ...(buildSearchWhere(["key", "value"], q) as any) };
  const total = await prisma.schoolSetting.count({ where });
  const { skip, take } = pageToSkipTake(page, perPage);
  const data = await prisma.schoolSetting.findMany({ where, orderBy: [{ updatedAt: "desc" }], skip, take });
  return NextResponse.json({ data, page, perPage, total, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/SCHOOL_SETTINGS" });
  if (deny) return deny;
  try {
    const body = await req.json();
    const { schoolId, key, type = "STRING", value } = body ?? {};
    if (!schoolId || !key) return NextResponse.json({ message: "schoolId dan key wajib" }, { status: 400 });
    const created = await prisma.schoolSetting.create({ data: { schoolId, key, type, value: String(value ?? "") } });
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal membuat setting" }, { status: 500 });
  }
}

