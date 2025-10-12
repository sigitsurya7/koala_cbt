import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/auth";

export type AclDecision = NextResponse | null;

export function getActionFromMethod(method: string): "READ" | "CREATE" | "UPDATE" | "DELETE" {
  switch ((method || "GET").toUpperCase()) {
    case "GET":
      return "READ";
    case "POST":
      return "CREATE";
    case "PUT":
    case "PATCH":
      return "UPDATE";
    case "DELETE":
      return "DELETE";
    default:
      return "READ";
  }
}

export function getResourceCode(req: NextRequest): string {
  // Convert path like /api/roles/123/menus -> API/ROLES_MENUS
  const pathname = new URL(req.url).pathname.replace(/^\/+/, "");
  const parts = pathname.split("/");
  if (parts[0] !== "api") return "API/UNKNOWN";
  const filtered = parts.slice(1).filter((p) => p && !/^[0-9a-fA-F-]{8,}$/.test(p));
  return ["API", ...filtered].join("/").replace(/\//g, "_").toUpperCase();
}

export async function requirePermission(
  req: NextRequest,
  opts?: { action?: string; resource?: string; allowIfNoPermissionDefined?: boolean },
): Promise<AclDecision> {
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  const payload = token ? await verifyAccessToken(token) : null;
  if (!payload) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  if (Array.isArray(payload.permissions) && payload.permissions.includes("*")) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, isSuperAdmin: true } });
  if (!user) return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  if (user.isSuperAdmin) return null;

  const action = (opts?.action || getActionFromMethod(req.method)).toUpperCase();
  const resource = (opts?.resource || getResourceCode(req)).toUpperCase();
  const permissionKey = `${action}_${resource}`;

  const payloadPermissions = new Set<string>(Array.isArray(payload.permissions) ? payload.permissions : []);
  if (payloadPermissions.has(permissionKey)) {
    return null;
  }

  // Find permission definition
  const perm = await prisma.permission.findFirst({ where: { action, resource }, select: { id: true } });
  if (!perm) {
    // Secure-by-default: deny unless explicitly allowed by env/flag
    const allowEnv = String(process.env.ACL_ALLOW_IF_UNDEFINED || "false").toLowerCase() === "true";
    if (opts?.allowIfNoPermissionDefined ?? allowEnv) return null;
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const userRoles = await prisma.userRole.findMany({ where: { userId: user.id }, select: { roleId: true } });
  const roleIds = userRoles.map((r) => r.roleId);
  if (roleIds.length === 0) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const count = await prisma.rolePermission.count({ where: { permissionId: perm.id, roleId: { in: roleIds } } });
  if (count > 0) return null;

  return NextResponse.json({ message: "Forbidden" }, { status: 403 });
}
