import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { buildOrderBy, buildSearchWhere, pageToSkipTake, parsePageQuery } from "@/lib/pagination";
import { requirePermission } from "@/lib/acl";
import { enforceActiveSchool, getUserFromRequest } from "@/lib/tenant";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/USERS" });
  if (deny) return deny;
  const user = await getUserFromRequest(req);
  const { searchParams } = new URL(req.url);
  const filterSchoolId = searchParams.get("schoolId") || undefined;
  let ensuredSchoolId: string | null = null;
  if (!user?.isSuperAdmin) {
    const ensured = await enforceActiveSchool(req);
    if (ensured instanceof NextResponse) return ensured;
    ensuredSchoolId = ensured.schoolId;
  } else {
    ensuredSchoolId = filterSchoolId || null; // superadmin boleh tanpa filter
  }
  const { page, perPage, q, sort, order } = parsePageQuery(req);
  const base: any = { ...(buildSearchWhere(["name", "email"], q) as any) };
  const where: any = ensuredSchoolId ? { ...base, schools: { some: { schoolId: ensuredSchoolId } } } : base;
  const total = await prisma.user.count({ where });
  const { skip, take } = pageToSkipTake(page, perPage);
  const users = await prisma.user.findMany({
    where,
    orderBy: buildOrderBy(sort, order, { name: "name", email: "email", type: "type", createdAt: "createdAt" }) || [{ createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
      isSuperAdmin: true,
      schools: { include: { school: { select: { name: true, code: true } } }, take: 1 },
    },
    skip,
    take,
  });
  const rows = users.map((u) => ({ id: u.id, name: u.name, email: u.email, type: u.type, isSuperAdmin: u.isSuperAdmin, schoolName: u.schools[0]?.school?.name ?? null, schoolCode: u.schools[0]?.school?.code ?? null }));
  return NextResponse.json({ data: rows, page, perPage, total, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/USERS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const schema = z.object({
      name: z.string().trim().min(1),
      email: z.string().email(),
      username: z.string().regex(/^[a-z0-9](?:[a-z0-9_]{1,30}[a-z0-9])?$/i).optional(),
      password: z.string().min(6),
      type: z.enum(["SISWA","GURU","STAFF","ADMIN"]).optional(),
      isSuperAdmin: z.boolean().optional(),
      detailSchoolId: z.string().optional(),
    });
    const { name, email, username, password, type = "SISWA", isSuperAdmin = false, detailSchoolId } = zparse(schema, await req.json());
    // Username validation if provided
    if (username) {
      const exist = await prisma.user.findUnique({ where: { username } });
      if (exist) return NextResponse.json({ message: "Username sudah digunakan" }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({ data: { name, email, username: username || null, passwordHash, type, isSuperAdmin } });
    // Create base UserDetail with fullName defaulting to name
    await prisma.userDetail.create({ data: { userId: created.id, fullName: name } });
    // Optionally create typed detail if school provided
    if (!isSuperAdmin && detailSchoolId && typeof detailSchoolId === "string") {
      if (type === "SISWA") {
        await prisma.studentDetail.create({ data: { userId: created.id, schoolId: detailSchoolId } });
        await prisma.userSchool.create({ data: { userId: created.id, schoolId: detailSchoolId, classId: null } });
      } else if (type === "GURU") {
        await prisma.teacherDetail.create({ data: { userId: created.id, schoolId: detailSchoolId } });
        await prisma.userSchool.create({ data: { userId: created.id, schoolId: detailSchoolId, classId: null } });
      } else if (type === "STAFF") {
        await prisma.staffDetail.create({ data: { userId: created.id, schoolId: detailSchoolId } });
        await prisma.userSchool.create({ data: { userId: created.id, schoolId: detailSchoolId, classId: null } });
      }
    }
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return handleApiError(e);
  }
}
