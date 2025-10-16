import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import { buildSearchWhere, pageToSkipTake, parsePageQuery } from "@/lib/pagination";

// GET: list students in class
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/CLASSES" });
  if (deny) return deny;
  const { id: classId } = await params;
  const { page, perPage, q } = parsePageQuery(req);
  const where: any = { classId, ...(buildSearchWhere(["user.name", "nis"], q) as any) };
  const total = await prisma.studentDetail.count({ where });
  const { skip, take } = pageToSkipTake(page, perPage);
  const items = await prisma.studentDetail.findMany({
    where,
    include: { user: { select: { id: true, name: true, username: true, email: true } } },
    orderBy: [{ createdAt: "desc" }],
    skip,
    take,
  });
  const rows = items.map((s) => ({ userId: s.userId, name: s.user.name, username: s.user.username ?? null, email: s.user.email ?? null, nis: s.nis ?? null, status: s.status ?? null }));
  return NextResponse.json({ data: rows, page, perPage, total, totalPages: Math.ceil(total / perPage) });
}

// PATCH: update student status (active flag maps to status string)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/CLASSES" });
  if (deny) return deny;
  try {
    const { id: classId } = await params;
    const body = await req.json();
    const { userId, active } = body ?? {};
    if (!userId || typeof active !== "boolean") return NextResponse.json({ message: "userId dan active wajib" }, { status: 400 });
    await prisma.studentDetail.update({ where: { userId }, data: { classId, status: active ? "AKTIF" : "NONAKTIF" } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Gagal update status siswa" }, { status: 400 });
  }
}
