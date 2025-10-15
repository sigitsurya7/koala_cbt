import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { parsePageQuery, pageToSkipTake, buildSearchWhere } from "@/lib/pagination";
import { requirePermission } from "@/lib/acl";
import { resolveSchoolContext } from "@/lib/tenant";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/SCHOOL_SETTINGS" });
  if (deny) return deny;
  const { searchParams } = new URL(req.url);
  const ctx = await resolveSchoolContext(req);
  if (ctx instanceof NextResponse) return ctx;
  const { page, perPage, q } = parsePageQuery(req);
  const where: any = { schoolId: ctx.schoolId, ...(buildSearchWhere(["key", "value"], q) as any) };
  const total = await prisma.schoolSetting.count({ where });
  const { skip, take } = pageToSkipTake(page, perPage);
  const data = await prisma.schoolSetting.findMany({ where, orderBy: [{ updatedAt: "desc" }], skip, take });
  return NextResponse.json({ data, page, perPage, total, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/SCHOOL_SETTINGS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ctx = await resolveSchoolContext(req);
    if (ctx instanceof NextResponse) return ctx;
    const schema = z.object({ key: z.string().trim().min(1), type: z.enum(["STRING","NUMBER","BOOLEAN","JSON"]).optional(), value: z.any() });
    const { key, type = "STRING", value } = zparse(schema, await req.json());
    const created = await prisma.schoolSetting.create({ data: { schoolId: ctx.schoolId, key, type: type as any, value: String(value ?? "") } });
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return handleApiError(e);
  }
}

