import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { buildOrderBy, buildSearchWhere, pageToSkipTake, parsePageQuery } from "@/lib/pagination";
import { requirePermission } from "@/lib/acl";
import { resolveSchoolContext, getUserFromRequest } from "@/lib/tenant";
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
    const ctx = await resolveSchoolContext(req);
    if (ctx instanceof NextResponse) return ctx;
    ensuredSchoolId = ctx.schoolId;
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
      isActive: true,
      schools: {
        include: { school: { select: { id: true, name: true, code: true } } },
        take: 1,
      },
      userRoles: {
        where: ensuredSchoolId ? { schoolId: ensuredSchoolId } : undefined,
        include: { role: { select: { id: true, name: true, key: true } } },
        take: 1,
      },
    },
    skip,
    take,
  });
  const rows = users.map((u) => {
    const primarySchool = u.schools[0] ?? null;
    const primaryRole = u.userRoles[0]?.role ?? null;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      type: u.type,
      isSuperAdmin: u.isSuperAdmin,
      isActive: u.isActive,
      schoolId: primarySchool?.school?.id ?? null,
      schoolName: primarySchool?.school?.name ?? null,
      schoolCode: primarySchool?.school?.code ?? null,
      roleId: primaryRole?.id ?? null,
      roleName: primaryRole?.name ?? null,
      roleKey: primaryRole?.key ?? null,
    };
  });
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
      type: z.enum(["SISWA", "GURU", "STAFF", "ADMIN"]).optional(),
      isSuperAdmin: z.boolean().optional(),
      isActive: z.boolean().optional(),
      schoolId: z.string().optional().nullable(),
      roleId: z.string().optional().nullable(),
      detailSchoolId: z.string().optional(), // backward compatibility
    });
    const parsed = zparse(schema, await req.json());
    const {
      name,
      email,
      username,
      password,
      isSuperAdmin: isSuperAdminRaw = false,
      isActive: isActiveRaw,
      roleId,
    } = parsed;
    const requestedType = parsed.type ?? "SISWA";
    const requestedSchoolId = parsed.schoolId ?? parsed.detailSchoolId ?? null;
    const isSuperAdmin = !!isSuperAdminRaw;
    const finalType = isSuperAdmin ? "ADMIN" : requestedType;
    const isActive = isActiveRaw ?? true;

    if (username) {
      const exist = await prisma.user.findUnique({ where: { username } });
      if (exist) return NextResponse.json({ message: "Username sudah digunakan" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let targetRoleIdForCreation: string | null = null;
    const schoolIdForUser = isSuperAdmin ? null : requestedSchoolId;

    if (!isSuperAdmin) {
      if (!schoolIdForUser) {
        return NextResponse.json({ message: "Sekolah wajib dipilih" }, { status: 400 });
      }
      const school = await prisma.school.findUnique({ where: { id: schoolIdForUser } });
      if (!school) {
        return NextResponse.json({ message: "Sekolah tidak ditemukan" }, { status: 404 });
      }

      if (finalType === "SISWA") {
        const siswaRole = await prisma.role.findFirst({
          where: { key: "SISWA", schoolId: schoolIdForUser },
          select: { id: true },
        });
        if (!siswaRole) {
          return NextResponse.json({ message: "Role SISWA tidak ditemukan di sekolah ini" }, { status: 400 });
        }
        targetRoleIdForCreation = siswaRole.id;
      } else {
        if (!roleId) {
          return NextResponse.json({ message: "Role wajib dipilih" }, { status: 400 });
        }
        const role = await prisma.role.findFirst({
          where: {
            id: roleId,
            OR: [{ schoolId: schoolIdForUser }, { schoolId: null }],
          },
          select: { id: true },
        });
        if (!role) {
          return NextResponse.json({ message: "Role tidak valid untuk sekolah ini" }, { status: 400 });
        }
        targetRoleIdForCreation = role.id;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          email,
          username: username || null,
          passwordHash,
          type: finalType,
          isSuperAdmin,
          isActive,
        },
      });

      await tx.userDetail.create({ data: { userId: created.id, fullName: name } });

      if (!isSuperAdmin && schoolIdForUser) {
        await tx.userSchool.create({
          data: { userId: created.id, schoolId: schoolIdForUser, classId: null, isActive: true },
        });

        if (targetRoleIdForCreation) {
          await tx.userRole.create({
            data: { userId: created.id, roleId: targetRoleIdForCreation, schoolId: schoolIdForUser },
          });
        }

        if (finalType === "SISWA") {
          await tx.studentDetail.create({ data: { userId: created.id, schoolId: schoolIdForUser } });
        } else if (finalType === "GURU") {
          await tx.teacherDetail.create({ data: { userId: created.id, schoolId: schoolIdForUser } });
        } else if (finalType === "STAFF") {
          await tx.staffDetail.create({ data: { userId: created.id, schoolId: schoolIdForUser } });
        }
      }

      return created;
    });

    return NextResponse.json({ id: result.id });
  } catch (e: any) {
    return handleApiError(e);
  }
}
