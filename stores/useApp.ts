"use client";

import { create } from "zustand";
import axios from "axios";

type School = { id: string; name: string; code: string };
type Role = { id: string; name: string; key: string; scope: string };
type Permission = { action: string; resource: string };

type AppState = {
  user: { id: string; name: string; email: string; type: string; isSuperAdmin: boolean; userDetail?: { avatarUrl?: string | null } } | null;
  schools: School[];
  activeSchoolId: string | null;
  roles: Role[];
  permissions: Permission[];
  loading: boolean;
  loadBootstrap: () => Promise<void>;
  setActiveSchool: (schoolId: string) => Promise<void>;
};

export const useApp = create<AppState>()((set, get) => ({
  user: null,
  schools: [],
  activeSchoolId: null,
  roles: [],
  permissions: [],
  loading: false,
  async loadBootstrap() {
    set({ loading: true });
    try {
      const res = await axios.get("/api/bootstrap");
      set({
        user: res.data.user,
        schools: res.data.schools || [],
        activeSchoolId: res.data.activeSchoolId || null,
        roles: res.data.roles || [],
        permissions: res.data.permissions || [],
      });
    } finally {
      set({ loading: false });
    }
  },
  async setActiveSchool(schoolId: string) {
    await axios.post("/api/active-school", { schoolId });
    set({ activeSchoolId: schoolId });
  },
}));
