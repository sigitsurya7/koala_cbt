import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { emitMenuUpdated } from "@/lib/events";
import { buildSearchWhere, pageToSkipTake, parsePageQuery } from "@/lib/pagination";
import { requirePermission } from "@/lib/acl";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/auth";

type MenuNode = {
  id: string;
  name: string;
  key: string;
  path: string;
  icon?: string | null;
  order: number;
  visibility: string;
  needLogin: boolean;
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
  let isSuper = false;
  try {
    const token = req.cookies.get(ACCESS_COOKIE)?.value;
    const payload = token ? await verifyAccessToken(token) : null;
    if (payload) {
      const u = await prisma.user.findUnique({ where: { id: payload.sub }, select: { isSuperAdmin: true } });
      isSuper = !!u?.isSuperAdmin;
    }
  } catch {}

  const baseWhere: any = { isActive: true, menuSuperAdmin: isSuper ? true : false };
  const itemsRaw = await prisma.menu.findMany({
    where: baseWhere,
    orderBy: [{ order: "asc" }],
    include: { roleMenus: true },
  });

  let items = itemsRaw;
  if (!isSuper) {
    // Filter by role mapping: only include menus linked to any of user's roles
    const token = req.cookies.get(ACCESS_COOKIE)?.value;
    const payload = token ? await verifyAccessToken(token) : null;
    if (payload) {
      const userRoles = await prisma.userRole.findMany({ where: { userId: payload.sub }, select: { roleId: true } });
      const roleIds = new Set(userRoles.map((r) => r.roleId));
      // We will include node if it has mapping OR any child mapped; build after tree build
    }
  }

  const byId = new Map(items.map((m) => [m.id, m]));

  const nodes = new Map<string, MenuNode>();
  const roots: MenuNode[] = [];

  for (const m of items) {
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
      children: [],
    };
    nodes.set(m.id, node);
  }

  for (const m of items) {
    const node = nodes.get(m.id)!;
    if (m.parentId && byId.has(m.parentId)) {
      nodes.get(m.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  if (!isSuper) {
    // Filter the tree by role mapping
    const token = req.cookies.get(ACCESS_COOKIE)?.value;
    const payload = token ? await verifyAccessToken(token) : null;
    if (payload) {
      const userRoles = await prisma.userRole.findMany({ where: { userId: payload.sub }, select: { roleId: true } });
      const roleIdSet = new Set(userRoles.map((r) => r.roleId));
      const mapped = new Set<string>();
      for (const m of items) {
        if (m.roleMenus?.some((rm) => roleIdSet.has(rm.roleId))) mapped.add(m.id);
      }
      const filterRec = (arr: MenuNode[]): MenuNode[] => {
        const out: MenuNode[] = [];
        for (const n of arr) {
          const has = mapped.has(n.id);
          const kids = filterRec(n.children);
          if (has || kids.length > 0) out.push({ ...n, children: kids });
        }
        return out;
      };
      const filteredRoots = filterRec(roots);
      return NextResponse.json({ menu: filteredRoots });
    }
  }

  return NextResponse.json({ menu: roots });
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/MENU" });
  if (deny) return deny;
  try {
    const body = await req.json();
    const {
      name,
      key,
      path,
      icon,
      order,
      parentId = null,
      visibility = "PUBLIC",
      isActive = true,
      roleIds = [],
      menuSuperAdmin = false,
    } = body ?? {};

    if (!name || !key || !path) {
      return NextResponse.json({ message: "Nama, key, dan path wajib" }, { status: 400 });
    }

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
    return NextResponse.json({ message: e?.message ?? "Gagal membuat menu" }, { status: 500 });
  }
}
