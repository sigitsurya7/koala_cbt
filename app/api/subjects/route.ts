import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/SUBJECTS" });
  if (deny) return deny;
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId") || undefined;
  const all = searchParams.get("all");
  if (!schoolId) return NextResponse.json({ items: [] });
  const data = await prisma.subject.findMany({ where: { schoolId }, orderBy: [{ name: "asc" }] });
  return NextResponse.json({ items: data });
}

