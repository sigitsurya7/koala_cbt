"use client";

import { create } from "zustand";
import axios from "axios";
import type { IconType } from "react-icons";
import * as FiIcons from "react-icons/fi";
import * as FaIcons from "react-icons/fa";
import * as MdIcons from "react-icons/md";
import * as RiIcons from "react-icons/ri";
import * as HiIcons from "react-icons/hi2";
import * as BiIcons from "react-icons/bi";
import * as BsIcons from "react-icons/bs";
import * as PiIcons from "react-icons/pi";
import * as TbIcons from "react-icons/tb";
import * as LuIcons from "react-icons/lu";
import * as Io5Icons from "react-icons/io5";
import { useAuth } from "@/stores/useAuth";

type ApiMenuNode = {
  id: string;
  name: string;
  key: string;
  path: string;
  icon?: string | null;
  order: number;
  visibility: string;
  needLogin: boolean;
  children: ApiMenuNode[];
};

export type MenuItem = {
  name: string;
  path?: string;
  icon?: IconType;
  children?: MenuItem[];
  needLogin?: boolean;
};

const PACKS: Array<Record<string, IconType>> = [
  FiIcons as any,
  FaIcons as any,
  MdIcons as any,
  RiIcons as any,
  HiIcons as any,
  BiIcons as any,
  BsIcons as any,
  PiIcons as any,
  TbIcons as any,
  LuIcons as any,
  Io5Icons as any,
];

function resolveIcon(name?: string | null): IconType | undefined {
  if (!name) return undefined;
  for (const pack of PACKS) {
    const C = (pack as any)[name];
    if (C) return C as IconType;
  }
  return undefined;
}

type MenuState = {
  menu: MenuItem[];
  version: number;
  _es?: EventSource | null;
  load: () => Promise<void>;
  connect: () => void;
};

export const useMenu = create<MenuState>()((set, get) => ({
  menu: [],
  version: 0,
  _es: null,
  async load() {
    try {
      const res = await axios.get<{ menu: ApiMenuNode[] }>("/api/menu");
      const loggedIn = !!useAuth.getState().user;
      const mapNode = (node: ApiMenuNode): MenuItem => ({
        name: node.name,
        path: node.path,
        icon: resolveIcon(node.icon),
        needLogin: node.needLogin,
        children: node.children?.map(mapNode) ?? [],
      });
      const filterByAuth = (items: MenuItem[], logged: boolean): MenuItem[] => {
        const result: MenuItem[] = [];
        for (const it of items) {
          if (it.needLogin && !logged) continue;
          const children = it.children ? filterByAuth(it.children, logged) : [];
          result.push({ ...it, children });
        }
        return result;
      };
      const mapped = res.data.menu.map(mapNode);
      const filtered = filterByAuth(mapped, loggedIn);
      set({ menu: filtered });
    } catch {}
  },
  connect() {
    if (get()._es) return;
    const es = new EventSource("/api/events/menu");
    es.onmessage = () => {
      // bump version and reload menu
      set((s) => ({ version: s.version + 1 }));
      get().load();
    };
    es.onerror = () => {};
    set({ _es: es });
    // initial load
    get().load();
  },
}));

