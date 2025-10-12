import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { buildOrderBy, buildSearchWhere, pageToSkipTake, parsePageQuery } from "@/lib/pagination";
import { requirePermission } from "@/lib/acl";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/ROLES" });
  if (deny) return deny;
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId") || undefined;
  // support non-paginated list for selects
  const all = searchParams.get("all");
  if (all === "1") {
    const roles = await prisma.role.findMany({
      where: schoolId
        ? {
            OR: [
              { schoolId },
              { schoolId: null },
            ],
          }
        : undefined,
      orderBy: [{ name: "asc" }],
      include: { school: { select: { name: true } } },
    });
    return NextResponse.json({
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        key: r.key,
        scope: r.scope,
        schoolId: r.schoolId,
        schoolName: r.school?.name ?? null,
      })),
    });
  }

  const { page, perPage, q, sort, order } = parsePageQuery(req);
  const where = {
    ...(buildSearchWhere(["name", "key"], q) as any),
    ...(schoolId
      ? {
          OR: [
            { schoolId },
            { schoolId: null },
          ],
        }
      : {}),
  } as any;
  const total = await prisma.role.count({ where });
  const { skip, take } = pageToSkipTake(page, perPage);
  const roles = await prisma.role.findMany({
    where,
    orderBy: buildOrderBy(sort, order, { name: "name", key: "key", scope: "scope" }) || [{ name: "asc" }],
    include: { school: { select: { name: true } } },
    skip,
    take,
  });
  return NextResponse.json({
    data: roles.map((r) => ({
      id: r.id,
      name: r.name,
      key: r.key,
      scope: r.scope,
      schoolId: r.schoolId,
      schoolName: r.school?.name ?? null,
    })),
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/ROLES" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const schema = z.object({
      name: z.string().trim().min(1),
      key: z.string().trim().min(1).optional(),
      scope: z.enum(["GLOBAL", "SCHOOL"]).optional(),
      schoolId: z.string().trim().nullable().optional(),
      isSystem: z.boolean().optional(),
    });
    let { name, key, scope = "SCHOOL", schoolId = null, isSystem = false } = zparse(schema, await req.json());
    if (!key) {
      key = String(name)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .join("_");
    }
    const created = await prisma.role.create({
      data: { name, key, scope, schoolId, isSystem },
      select: { id: true },
    });
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return handleApiError(e);
  }
}
