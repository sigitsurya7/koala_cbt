export type MenuPayload = {
  id: string;
  name: string;
  key: string;
  path: string;
  icon?: string | null;
  parentId: string | null;
  order: number;
  visibility?: string;
};

export type JwtPayload = {
  sub: string;
  email: string;
  name?: string;
  type?: string;
  isSuperAdmin: boolean;
  schoolId?: string | null;
  roleKey?: string | null;
  permissions: string[];
  menus: MenuPayload[];
};
