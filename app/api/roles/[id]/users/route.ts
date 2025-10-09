import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";
import { enforceActiveSchool } from "@/lib/tenant";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/ROLES_USERS" });
  if (deny) return deny;
  const ensured = await enforceActiveSchool(req);
  if (ensured instanceof NextResponse) return ensured;
  const roleId = params.id;
  const rows = await prisma.userRole.findMany({
    where: { roleId, schoolId: ensured.schoolId },
    include: { user: { select: { id: true, name: true, email: true, type: true } } },
  });
  return NextResponse.json({ users: rows.map((r) => r.user) });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requirePermission(req, { action: "UPDATE", resource: "API/ROLES_USERS" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const ensured = await enforceActiveSchool(req);
    if (ensured instanceof NextResponse) return ensured;
    const roleId = params.id;
    const schema = z.object({ userIds: z.array(z.string().trim()).default([]) });
    const { userIds } = zparse(schema, await req.json());

    const existing = await prisma.userRole.findMany({ where: { roleId, schoolId: ensured.schoolId } });
    const existingSet = new Set(existing.map((r) => r.userId));
    const desiredSet = new Set(userIds);

    const toAdd = userIds.filter((id) => !existingSet.has(id)).map((userId) => ({ userId, roleId, schoolId: ensured.schoolId }));
    const toRemove = existing.filter((r) => !desiredSet.has(r.userId)).map((r) => r.id);

    await prisma.$transaction(async (tx) => {
      if (toRemove.length) await tx.userRole.deleteMany({ where: { id: { in: toRemove } } });
      if (toAdd.length) await tx.userRole.createMany({ data: toAdd, skipDuplicates: true });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return handleApiError(e);
  }
}

