import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { buildOrderBy, buildSearchWhere, pageToSkipTake, parsePageQuery } from "@/lib/pagination";
import { requirePermission } from "@/lib/acl";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/USERS" });
  if (deny) return deny;
  const { page, perPage, q, sort, order } = parsePageQuery(req);
  const where: any = { ...(buildSearchWhere(["name", "email"], q) as any) };
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
      studentDetail: { include: { school: { select: { name: true, code: true } } } },
      teacherDetail: { include: { school: { select: { name: true, code: true } } } },
      staffDetail: { include: { school: { select: { name: true, code: true } } } },
    },
    skip,
    take,
  });
  const rows = users.map((u) => {
    const school = u.studentDetail?.school || u.teacherDetail?.school || u.staffDetail?.school || null;
    return { id: u.id, name: u.name, email: u.email, type: u.type, isSuperAdmin: u.isSuperAdmin, schoolName: school?.name ?? null, schoolCode: school?.code ?? null };
  });
  return NextResponse.json({ data: rows, page, perPage, total, totalPages: Math.ceil(total / perPage) });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/USERS" });
  if (deny) return deny;
  try {
    const body = await req.json();
    const { name, email, password, type = "SISWA", isSuperAdmin = false, detailSchoolId } = body ?? {};
    if (!name || !email || !password) return NextResponse.json({ message: "name, email, password wajib" }, { status: 400 });
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({ data: { name, email, passwordHash, type, isSuperAdmin } });
    // Create base UserDetail with fullName defaulting to name
    await prisma.userDetail.create({ data: { userId: created.id, fullName: name } });
    // Optionally create typed detail if school provided
    if (!isSuperAdmin && detailSchoolId && typeof detailSchoolId === "string") {
      if (type === "SISWA") {
        await prisma.studentDetail.create({ data: { userId: created.id, schoolId: detailSchoolId } });
      } else if (type === "GURU") {
        await prisma.teacherDetail.create({ data: { userId: created.id, schoolId: detailSchoolId } });
      } else if (type === "STAFF") {
        await prisma.staffDetail.create({ data: { userId: created.id, schoolId: detailSchoolId } });
      }
    }
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal membuat user" }, { status: 500 });
  }
}
