import { prisma } from "@/lib/prisma";
import { JwtPayload, MenuPayload } from "@/types/auth";

export type SchoolInfo = { id: string; name: string; code: string };
export type RoleInfo = { id: string; name: string; key: string; scope: string };

export type MenuNode = {
  id: string;
  name: string;
  key: string;
  path: string;
  icon?: string | null;
  order: number;
  parentId: string | null;
  visibility?: string;
  needLogin: boolean;
  children: MenuNode[];
};

export type SessionContext = {
  user: {
    id: string;
    name: string;
    email: string;
    type: string;
    isSuperAdmin: boolean;
    userDetail: { avatarUrl: string | null } | null;
  };
  schools: SchoolInfo[];
  activeSchoolId: string | null;
  roles: RoleInfo[];
  roleKey: string | null;
  permissions: string[];
  menus: MenuNode[];
};

export type SessionResult = SessionContext & { jwtPayload: JwtPayload };

type BuildOptions = {
  schoolId?: string | null;
};

export async function buildSessionContext(userId: string, options: BuildOptions = {}): Promise<SessionResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
      isSuperAdmin: true,
      isActive: true,
      userDetail: { select: { avatarUrl: true } },
    },
  });
  if (!user) {
    throw new Error("User not found");
  }
  if (!user.isActive) {
    throw new Error("User inactive");
  }

  if (user.isSuperAdmin) {
    return await buildSuperAdminSession(user, options.schoolId ?? null);
  }

  return await buildRegularSession(user, options);
}

async function buildSuperAdminSession(
  user: {
    id: string;
    name: string;
    email: string;
    type: string;
    userDetail: { avatarUrl: string | null } | null;
  },
  selectedSchoolId: string | null,
): Promise<SessionResult> {
  const schoolsRaw = await prisma.school.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: [{ name: "asc" }],
  });
  const schools = schoolsRaw.map((s) => ({ id: s.id, name: s.name, code: s.code }));

  const activeSchoolId = selectedSchoolId && schools.some((s) => s.id === selectedSchoolId) ? selectedSchoolId : null;

  const menusRaw = await prisma.menu.findMany({
    where: { isActive: true, menuSuperAdmin: true },
    select: { id: true, name: true, key: true, path: true, icon: true, order: true, parentId: true, visibility: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  const menusFlat: MenuPayload[] = menusRaw.map((m) => ({
    id: m.id,
    name: m.name,
    key: m.key,
    path: m.path,
    icon: m.icon,
    order: m.order,
    parentId: m.parentId,
    visibility: m.visibility,
  }));
  const menusTree = buildMenuTree(menusRaw);

  const permissions = ["*"];

  const jwtPayload: JwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    type: user.type,
    isSuperAdmin: true,
    schoolId: null,
    roleKey: null,
    permissions,
    menus: menusFlat,
  };

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      type: user.type,
      isSuperAdmin: true,
      userDetail: user.userDetail,
    },
    schools,
    activeSchoolId,
    roles: [],
    roleKey: null,
    permissions,
    menus: menusTree,
    jwtPayload,
  };
}

async function buildRegularSession(
  user: { id: string; name: string; email: string; type: string; userDetail: { avatarUrl: string | null } | null },
  options: BuildOptions,
): Promise<SessionResult> {
  const memberships = await prisma.userSchool.findMany({
    where: { userId: user.id, isActive: true },
    include: { school: { select: { id: true, name: true, code: true } } },
    orderBy: [{ school: { name: "asc" } }],
  });
  const schools = memberships.map((m) => ({ id: m.school.id, name: m.school.name, code: m.school.code }));

  if (schools.length === 0) {
    throw new Error("User has no school memberships");
  }

  const requestedSchoolId = options.schoolId ?? null;
  const selectedMembership = requestedSchoolId ? memberships.find((m) => m.school.id === requestedSchoolId) : null;

  if (requestedSchoolId && !selectedMembership) {
    throw new Error("Invalid school selection");
  }

  let activeSchoolId: string | null = selectedMembership?.school.id ?? null;
  if (!activeSchoolId) activeSchoolId = schools[0]?.id ?? null;
  if (!activeSchoolId) {
    throw new Error("Unable to determine active school");
  }

  const userRoles = await prisma.userRole.findMany({
    where: {
      userId: user.id,
      OR: [{ schoolId: activeSchoolId }, { schoolId: null }],
    },
    include: { role: true },
  });

  const roleInfos: RoleInfo[] = userRoles.map((r) => ({
    id: r.role.id,
    name: r.role.name,
    key: r.role.key,
    scope: r.role.scope,
  }));

  const primaryRole =
    userRoles.find((r) => r.schoolId === activeSchoolId) ??
    userRoles.find((r) => r.role.scope === "SCHOOL") ??
    userRoles[0] ??
    null;
  const roleKey = primaryRole?.role.key ?? null;

  const roleIds = userRoles.map((r) => r.roleId);
  const rolePermissions =
    roleIds.length > 0
      ? await prisma.rolePermission.findMany({
          where: { roleId: { in: roleIds } },
          include: { permission: true },
        })
      : [];

  const permissionSet = new Set<string>();
  for (const rp of rolePermissions) {
    permissionSet.add(`${rp.permission.action}_${rp.permission.resource}`);
  }
  const permissions = Array.from(permissionSet);

  const menuAssignments =
    roleIds.length > 0
      ? await prisma.roleMenu.findMany({
          where: { roleId: { in: roleIds } },
          select: { menuId: true },
        })
      : [];

  const assignedMenuIds = new Set(menuAssignments.map((rm) => rm.menuId));

  const menusCandidates = await prisma.menu.findMany({
    where: { isActive: true, menuSuperAdmin: false },
    select: { id: true, name: true, key: true, path: true, icon: true, order: true, parentId: true, visibility: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  const menusFlat = filterMenusByAssignment(menusCandidates, assignedMenuIds);
  const menusTree = buildMenuTree(menusFlat);

  const jwtPayload: JwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    type: user.type,
    isSuperAdmin: false,
    schoolId: activeSchoolId,
    roleKey,
    permissions,
    menus: menusFlat.map((m) => ({
      id: m.id,
      name: m.name,
      key: m.key,
      path: m.path,
      icon: m.icon,
      order: m.order,
      parentId: m.parentId,
      visibility: m.visibility,
    })),
  };

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      type: user.type,
      isSuperAdmin: false,
      userDetail: user.userDetail,
    },
    schools,
    activeSchoolId,
    roles: roleInfos,
    roleKey,
    permissions,
    menus: menusTree,
    jwtPayload,
  };
}

type MenuRecord = {
  id: string;
  name: string;
  key: string;
  path: string;
  icon?: string | null;
  order: number;
  parentId: string | null;
  visibility?: string | null;
};

function filterMenusByAssignment(menus: MenuRecord[], assignedIds: Set<string>): MenuRecord[] {
  if (assignedIds.size === 0) return [];
  const menuById = new Map<string, MenuRecord>();
  for (const menu of menus) {
    menuById.set(menu.id, menu);
  }

  const allowed = new Map<string, MenuRecord>();

  const includeWithParents = (id: string) => {
    let currentId: string | null | undefined = id;
    while (currentId) {
      const menu = menuById.get(currentId);
      if (!menu) break;
      if (allowed.has(menu.id)) break;
      allowed.set(menu.id, menu);
      currentId = menu.parentId;
    }
  };

  for (const id of assignedIds) {
    includeWithParents(id);
  }

  return Array.from(allowed.values()).sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.name.localeCompare(b.name);
  });
}

function buildMenuTree(menus: MenuRecord[]): MenuNode[] {
  const nodes = new Map<string, MenuNode>();
  const roots: MenuNode[] = [];

  for (const menu of menus) {
    const visibility = menu.visibility ?? "PRIVATE";
    nodes.set(menu.id, {
      id: menu.id,
      name: menu.name,
      key: menu.key,
      path: menu.path,
      icon: menu.icon,
      order: menu.order,
      parentId: menu.parentId,
      visibility,
      needLogin: visibility !== "PUBLIC",
      children: [],
    });
  }

  for (const menu of menus) {
    const node = nodes.get(menu.id);
    if (!node) continue;
    if (menu.parentId && nodes.has(menu.parentId)) {
      nodes.get(menu.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortTree = (list: MenuNode[]) => {
    list.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });
    for (const child of list) {
      sortTree(child.children);
    }
  };

  sortTree(roots);
  return roots;
}
