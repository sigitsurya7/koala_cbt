import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { buildOrderBy, buildSearchWhere, pageToSkipTake, parsePageQuery } from "@/lib/pagination";
import { requirePermission } from "@/lib/acl";
import { resolveSchoolContext } from "@/lib/tenant";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";
import { assertCsrf } from "@/lib/csrf";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/CLASSES" });
  if (deny) return deny;
  const { searchParams } = new URL(req.url);
  const ctx = await resolveSchoolContext(req);
  if (ctx instanceof NextResponse) return ctx;
  const { page, perPage, q, sort, order } = parsePageQuery(req);
  const where: any = { schoolId: ctx.schoolId, ...(buildSearchWhere(["name"], q) as any) };
  const total = await prisma.class.count({ where });
  const { skip, take } = pageToSkipTake(page, perPage);
  const data = await prisma.class.findMany({ where, orderBy: buildOrderBy(sort, order, { name: "name", grade: "grade", isActive: "isActive" }) || [{ grade: "asc" }, { name: "asc" }], include: { department: true }, skip, take });
  return NextResponse.json({
    data: data.map((c) => ({ id: c.id, schoolId: c.schoolId, departmentId: c.departmentId, departmentName: c.department?.name ?? null, name: c.name, grade: c.grade, isActive: c.isActive })),
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/CLASSES" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ctx = await resolveSchoolContext(req);
    if (ctx instanceof NextResponse) return ctx;
    const schema = z.object({
      departmentId: z.string().optional().nullable(),
      name: z.string().trim().min(1),
      grade: z.number().int(),
      isActive: z.boolean().optional(),
    });
    const { departmentId = null, name, grade, isActive = true } = zparse(schema, await req.json());
    const created = await prisma.class.create({ data: { schoolId: ctx.schoolId, departmentId, name, grade, isActive } });
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return handleApiError(e);
  }
}
