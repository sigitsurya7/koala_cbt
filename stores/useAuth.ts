"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";

type User = { id: string; email: string; name: string; type: string } | null;

type AuthState = {
  user: User;
  loading: boolean;
  error?: string;
  login: (email: string, password: string) => Promise<void>;
  fetchMe: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: false,
      async login(email, password) {
        set({ loading: true, error: undefined });
        try {
          const res = await axios.post("/api/auth/login", { email, password });
          set({ user: res.data.user, loading: false });
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
