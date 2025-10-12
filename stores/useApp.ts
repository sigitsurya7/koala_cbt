"use client";

import { create } from "zustand";
import axios from "axios";

type School = { id: string; name: string; code: string };
type Role = { id: string; name: string; key: string; scope: string };
type Permission = string;
export type MenuNode = {
  id: string;
  name: string;
  key: string;
  path: string;
  icon?: string | null;
  order: number;
  parentId: string | null;
  visibility?: string;
  needLogin?: boolean;
  children: MenuNode[];
};

export type SessionResponse = {
  user: { id: string; name: string; email: string; type: string; isSuperAdmin: boolean; userDetail?: { avatarUrl?: string | null } | null } | null;
  schools: School[];
  activeSchoolId: string | null;
  roles: Role[];
  roleKey: string | null;
  permissions: Permission[];
  menus: MenuNode[];
};

type AppState = {
  user: SessionResponse["user"];
  schools: School[];
  activeSchoolId: string | null;
  roles: Role[];
  roleKey: string | null;
  permissions: Permission[];
  menus: MenuNode[];
  loading: boolean;
  loadBootstrap: () => Promise<void>;
  setActiveSchool: (schoolId: string) => Promise<void>;
  applySession: (data: Partial<SessionResponse>) => void;
};

export const useApp = create<AppState>()((set, get) => ({
  user: null,
  schools: [],
  activeSchoolId: null,
  roles: [],
  roleKey: null,
  permissions: [],
  menus: [],
  loading: false,
  async loadBootstrap() {
    set({ loading: true });
    try {
      const res = await axios.get<SessionResponse>("/api/bootstrap");
      get().applySession(res.data);
    } finally {
      set({ loading: false });
    }
  },
  async setActiveSchool(schoolId: string) {
    const res = await axios.post<{
      ok: boolean;
      activeSchoolId: string | null;
      roles: Role[];
      roleKey: string | null;
      permissions: Permission[];
      menus: MenuNode[];
    }>("/api/active-school", { schoolId });
    set({
      activeSchoolId: res.data.activeSchoolId ?? schoolId,
      roles: res.data.roles || [],
      roleKey: res.data.roleKey ?? null,
      permissions: res.data.permissions || [],
      menus: res.data.menus || [],
    });
  },
  applySession(data) {
    set((state) => ({
      user: data.user ?? state.user,
      schools: data.schools ?? state.schools,
      activeSchoolId: data.activeSchoolId ?? state.activeSchoolId,
      roles: data.roles ?? state.roles,
      roleKey: data.roleKey ?? state.roleKey,
      permissions: data.permissions ?? state.permissions,
      menus: data.menus ?? state.menus,
    }));
  },
}));
