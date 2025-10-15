import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/auth";
import { ACTIVE_SCHOOL_COOKIE } from "@/lib/app";

export async function getUserFromRequest(req: NextRequest) {
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  const payload = token ? await verifyAccessToken(token) : null;
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, isSuperAdmin: true } });
  return user;
}

export function getActiveSchoolId(req: NextRequest): string | null {
  return req.cookies.get(ACTIVE_SCHOOL_COOKIE)?.value || null;
}

export async function assertMembership(req: NextRequest, schoolId: string): Promise<NextResponse | null> {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  if (user.isSuperAdmin) return null;
  const count = await prisma.userSchool.count({ where: { userId: user.id, schoolId } });
  if (count === 0) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  return null;
}

export async function enforceActiveSchool(req: NextRequest): Promise<{ schoolId: string } | NextResponse> {
  const schoolId = getActiveSchoolId(req);
  if (!schoolId) return NextResponse.json({ message: "Active school is required" }, { status: 400 });
  const deny = await assertMembership(req, schoolId);
  if (deny) return deny;
  return { schoolId };
}

// Central resolver for school context across APIs
// - SuperAdmin: may use overrideSchoolId, or ?schoolId, or cookie; if still missing and require=true -> 400
// - Non SuperAdmin: must use JWT payload.schoolId (fallback to cookie), membership enforced
export async function resolveSchoolContext(
  req: NextRequest,
  opts: { overrideSchoolId?: string | null; require?: boolean; allowSuperQuery?: boolean } = {},
): Promise<{ userId: string; isSuperAdmin: boolean; schoolId: string } | NextResponse> {
  const token = req.cookies.get(ACCESS_COOKIE)?.value || null;
  const payload = token ? await verifyAccessToken(token) : null;
  if (!payload || !payload.sub) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  const isSuper = !!payload.isSuperAdmin;
  const requireSchool = opts.require !== false; // default true
  const allowSuperQuery = opts.allowSuperQuery !== false; // default true

  const qp = new URL(req.url).searchParams;
  const qpSchoolId = qp.get("schoolId");
  const cookieSchoolId = getActiveSchoolId(req);

  let schoolId: string | null = null;

  if (isSuper) {
    schoolId = (opts.overrideSchoolId ?? (allowSuperQuery ? qpSchoolId : null) ?? cookieSchoolId) || null;
    // SuperAdmin bypass membership; just ensure present if required
    if (!schoolId && requireSchool) {
      return NextResponse.json({ message: "Active school is required" }, { status: 400 });
    }
  } else {
    // Prefer JWT payload schoolId (if present), then cookie as fallback
    schoolId = (typeof payload.schoolId === "string" ? payload.schoolId : null) || cookieSchoolId;
    if (!schoolId && requireSchool) {
      return NextResponse.json({ message: "Active school is required" }, { status: 400 });
    }
    if (schoolId) {
      const deny = await assertMembership(req, schoolId);
      if (deny) return deny;
    }
  }

  return { userId: payload.sub, isSuperAdmin: isSuper, schoolId: schoolId as string };
}

