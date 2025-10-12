"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import { useApp } from "@/stores/useApp";
import type { SessionResponse } from "@/stores/useApp";

type User = { id: string; email: string; name: string; type: string; isSuperAdmin?: boolean | null } | null;

type AuthState = {
  user: User;
  loading: boolean;
  error?: string;
  login: (identifier: string, password: string) => Promise<void>;
  fetchMe: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: false,
      async login(identifier, password) {
        set({ loading: true, error: undefined });
        try {
          const res = await axios.post("/api/auth/login", { email: identifier, password });
          const session: SessionResponse = {
            user: res.data.user,
            schools: res.data.schools || [],
            activeSchoolId: res.data.activeSchoolId ?? null,
            roles: res.data.roles || [],
            roleKey: res.data.roleKey ?? null,
            permissions: res.data.permissions || [],
            menus: res.data.menus || [],
          };
          useApp.getState().applySession(session);
          set({ user: session.user, loading: false, error: undefined });
        } catch (e: any) {
          const message = e?.response?.data?.message || "Gagal login";
          set({ error: message, loading: false });
          throw new Error(message);
        }
      },
      async fetchMe() {
        try {
          const res = await axios.get("/api/auth/me");
          set({ user: res.data.user });
        } catch {}
      },
      async logout() {
        try {
          await axios.post("/api/auth/logout");
        } finally {
          useApp.getState().applySession({
            user: null,
            schools: [],
            activeSchoolId: null,
            roles: [],
            roleKey: null,
            permissions: [],
            menus: [],
          });
          set({ user: null });
        }
      },
    }),
    {
      name: "auth-store",
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
