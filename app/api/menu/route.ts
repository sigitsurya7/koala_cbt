import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { emitMenuUpdated } from "@/lib/events";
import { buildSearchWhere, pageToSkipTake, parsePageQuery } from "@/lib/pagination";
import { requirePermission } from "@/lib/acl";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/auth";
import { ACTIVE_SCHOOL_COOKIE } from "@/lib/app";
import { assertCsrf } from "@/lib/csrf";
import { z } from "zod";
import { handleApiError, zparse } from "@/lib/validate";

type MenuNode = {
  id: string;
  name: string;
  key: string;
  path: string;
  icon?: string | null;
  order: number;
  visibility: string;
  needLogin: boolean;
  menuSuperAdmin: boolean;
  children: MenuNode[];
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode");

  // Admin/manage mode: return flat list + role relations
  if (mode === "manage") {
    const deny = await requirePermission(req, { action: "READ", resource: "API/MENU" });
    if (deny) return deny;
    const all = searchParams.get("all");
    if (all === "1") {
      const menusAll = await prisma.menu.findMany({
        where: { parentId: null },
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: { id: true, name: true, path: true },
      });
      return NextResponse.json({ items: menusAll });
    }
    if (all === "full") {
      const menusAll = await prisma.menu.findMany({
        orderBy: [{ parentId: "asc" }, { order: "asc" }, { name: "asc" }],
        select: { id: true, name: true, parentId: true, path: true, icon: true, isActive: true, order: true },
      });
      return NextResponse.json({ items: menusAll });
    }
    const { page, perPage, q } = parsePageQuery(req);
    const where = {
      ...(buildSearchWhere(["name", "key", "path"], q) as any),
    } as any;
    const total = await prisma.menu.count({ where });
    const { skip, take } = pageToSkipTake(page, perPage);
    const menus = await prisma.menu.findMany({
      where,
      orderBy: [{ parentId: "asc" }, { order: "asc" }, { name: "asc" }],
      include: { parent: true, roleMenus: { include: { role: true } } },
      skip,
      take,
    });
    return NextResponse.json({
      data: menus.map((m) => ({
        id: m.id,
        name: m.name,
        key: m.key,
        path: m.path,
        icon: m.icon,
        order: m.order,
        visibility: m.visibility,
        isActive: m.isActive,
        parentId: m.parentId,
        parentName: m.parent?.name ?? null,
        menuSuperAdmin: m.menuSuperAdmin,
        roles: m.roleMenus.map((rm) => ({ id: rm.role.id, name: rm.role.name, key: rm.role.key })),
      })),
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    });
  }

  // Default: hierarchical nodes for sidebar
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  const payload = token ? await verifyAccessToken(token) : null;
  const isSuper = !!payload?.isSuperAdmin;
  const userId = payload?.sub || null;
  const activeSchoolId =
    req.cookies.get(ACTIVE_SCHOOL_COOKIE)?.value ||
    (!isSuper ? payload?.schoolId ?? null : null);

  const allMenus = await prisma.menu.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { roleMenus: true },
  });

  const byId = new Map(allMenus.map((m) => [m.id, m]));

  const nodes = new Map<string, MenuNode>();
  const roots: MenuNode[] = [];

  for (const m of allMenus) {
    const node: MenuNode = {
      id: m.id,
      name: m.name,
      key: m.key,
      path: m.path,
      icon: (m as any).icon,
      order: m.order,
      visibility: m.visibility,
      // Heuristic: PRIVATE menus require login. You can later add a field in schema.
      needLogin: m.visibility !== "PUBLIC",
      menuSuperAdmin: m.menuSuperAdmin ?? false,
      children: [],
    };
    nodes.set(m.id, node);
  }

  for (const m of allMenus) {
    const node = nodes.get(m.id)!;
    if (m.parentId && byId.has(m.parentId)) {
      nodes.get(m.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const filterTree = (arr: MenuNode[], predicate: (node: MenuNode) => boolean): MenuNode[] => {
    const out: MenuNode[] = [];
    for (const node of arr) {
      const children = filterTree(node.children, predicate);
      if (predicate(node) || children.length > 0) {
        out.push({ ...node, children });
      }
    }
    return out;
  };

  if (isSuper) {
    const superRoots = filterTree(roots, (node) => node.menuSuperAdmin);
    return NextResponse.json({ menu: superRoots });
  }

  if (!userId) {
    // Regular user without session -> empty menu
    return NextResponse.json({ menu: [] });
  }

  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
      OR: [{ schoolId: activeSchoolId }, { schoolId: null }],
    },
    select: { roleId: true },
  });
  const roleIdSet = new Set(userRoles.map((r) => r.roleId));
  if (roleIdSet.size === 0) {
    return NextResponse.json({ menu: [] });
  }

  const mappedMenuIds = new Set<string>();
  for (const menu of allMenus) {
    if (menu.roleMenus?.some((rm) => roleIdSet.has(rm.roleId))) {
      mappedMenuIds.add(menu.id);
    }
  }

  const filteredRoots = filterTree(roots, (node) => mappedMenuIds.has(node.id));
  return NextResponse.json({ menu: filteredRoots });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/MENU" });
  if (deny) return deny;
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  try {
    const schema = z.object({
      name: z.string().trim().min(1),
      key: z.string().trim().min(1),
      path: z.string().trim().min(1),
      icon: z.string().trim().optional().nullable(),
      order: z.number().int().optional(),
      parentId: z.string().optional().nullable(),
      visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
      isActive: z.boolean().optional(),
      roleIds: z.array(z.string()).optional(),
      menuSuperAdmin: z.boolean().optional(),
    });
    const body = zparse(schema, await req.json());
    const { name, key, path, icon, order, parentId = null, visibility = "PUBLIC", isActive = true, roleIds = [], menuSuperAdmin = false } = body;

    const created = await prisma.$transaction(async (tx) => {
      // Compute next order if not provided (root or per-parent)
      let computedOrder: number;
      if (typeof order === "number" && Number.isFinite(order)) {
        computedOrder = order;
      } else {
        const agg = await tx.menu.aggregate({
          where: { parentId: parentId ?? null },
          _max: { order: true },
        });
        computedOrder = (agg._max.order ?? -1) + 1;
      }
      const menu = await tx.menu.create({
        data: { name, key, path, icon, order: computedOrder, parentId, visibility, isActive, menuSuperAdmin },
      });

      if (Array.isArray(roleIds) && roleIds.length > 0) {
        await tx.roleMenu.createMany({
          data: roleIds.map((rid: string) => ({ roleId: rid, menuId: menu.id })),
          skipDuplicates: true,
        });
      }
      return menu;
    });

    // Notify listeners
    emitMenuUpdated({ action: "create", id: created.id });
    return NextResponse.json({ id: created.id });
  } catch (e: any) {
    return handleApiError(e);
  }
}
