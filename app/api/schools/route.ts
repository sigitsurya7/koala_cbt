import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { buildOrderBy, buildSearchWhere, pageToSkipTake, parsePageQuery } from "@/lib/pagination";
import { requirePermission } from "@/lib/acl";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/SCHOOLS" });
  if (deny) return deny;
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all");
  if (all === "1") {
    const schools = await prisma.school.findMany({
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, code: true, logoUrl: true, isActive: true },
    });
    return NextResponse.json({ schools });
  }

  const { page, perPage, q, sort, order } = parsePageQuery(req);
  const where = {
    ...(buildSearchWhere(["name", "code"], q) as any),
  } as any;
  const total = await prisma.school.count({ where });
  const { skip, take } = pageToSkipTake(page, perPage);
  const schools = await prisma.school.findMany({
    where,
    orderBy: buildOrderBy(sort, order, { name: "name", code: "code", isActive: "isActive", createdAt: "createdAt" }) || [{ name: "asc" }],
    select: { id: true, name: true, code: true, logoUrl: true, isActive: true },
    skip,
    take,
  });
  return NextResponse.json({ data: schools, page, perPage, total, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/SCHOOLS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const schema = z.object({
      name: z.string().trim().min(1),
      code: z.string().trim().min(1),
      logoUrl: z.string().url().nullable().optional(),
      isActive: z.boolean().optional(),
    });
    const { name, code, logoUrl = null, isActive = true } = zparse(schema, await req.json());
    const created = await prisma.$transaction(async (tx) => {
      // 1) Create school
      const school = await tx.school.create({ data: { name, code, logoUrl, isActive }, select: { id: true } });

      // 2) Provision default roles for the school
      const [adminRole, guruRole, siswaRole, staffRole] = await Promise.all([
        tx.role.create({ data: { name: "Admin Sekolah", key: "ADMIN_SCHOOL", scope: "SCHOOL", schoolId: school.id } }),
        tx.role.create({ data: { name: "Guru", key: "GURU", scope: "SCHOOL", schoolId: school.id } }),
        tx.role.create({ data: { name: "Siswa", key: "SISWA", scope: "SCHOOL", schoolId: school.id } }),
        tx.role.create({ data: { name: "Staff", key: "STAFF", scope: "SCHOOL", schoolId: school.id } }),
      ]);

      // 3) Link default menus to roles
      //    - Admin: Dashboard + all menus marked by configuration can be added later; we seed some sensible defaults
      //    - Guru/Staff: Bank Soal
      const dash = await tx.menu.findUnique({ where: { key: "dashboard" } });
      if (dash) {
        await tx.roleMenu.create({ data: { roleId: adminRole.id, menuId: dash.id } });
      }
      const bankSoal = await tx.menu.findUnique({ where: { key: "bank_soal" } });
      if (bankSoal) {
        for (const r of [adminRole, guruRole, staffRole]) {
          await tx.roleMenu.create({ data: { roleId: r.id, menuId: bankSoal.id } });
        }
      }

      // Exams Schedule menu for Admin and Guru
      const examSchedule = await tx.menu.findUnique({ where: { key: "exams_schedule" } });
      if (examSchedule) {
        for (const r of [adminRole, guruRole]) {
          await tx.roleMenu.create({ data: { roleId: r.id, menuId: examSchedule.id } });
        }
      }

      // 4) Grant admin role a base set of permissions (mirrors seed)
      const adminResources = [
        "API/MENU",
        "API/ROLES",
        "API/USERS",
        "API/SCHOOLS",
        "API/DEPARTMENTS",
        "API/ROOMS",
        "API/SCHOOL_SETTINGS",
        "API/ROLES_USERS",
        "API/SUBJECTS",
        "API/CLASSES",
        "API/ACADEMIC_YEARS",
        "API/PERIODS",
        "API/QUESTIONS",
        "API/EXAMS",
        "API/ATTEMPTS",
      ];
      const perms = await tx.permission.findMany({ where: { resource: { in: adminResources } }, select: { id: true } });
      if (perms.length > 0) {
        await tx.rolePermission.createMany({
          data: perms.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
          skipDuplicates: true,
        });
      }

      return school;
    });
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return handleApiError(e);
  }
}
