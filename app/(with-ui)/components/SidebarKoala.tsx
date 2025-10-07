"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@heroui/react";
import type { IconType } from "react-icons";
import {
  FiChevronRight,
  FiHome,
  FiCheckSquare,
  FiSettings,
  FiUsers,
  FiLayers,
  FiCalendar,
  FiFileText,
} from "react-icons/fi";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "@/stores/useAuth";

type MenuItem = {
  name: string;
  path?: string;
  icon?: IconType;
  children?: MenuItem[];
  needLogin?: boolean;
};

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

const iconMap: Record<string, IconType> = {
  FiHome,
  FiUsers,
  FiLayers,
  FiCheckSquare,
  FiSettings,
  FiCalendar,
  FiFileText,
};

type SidebarKoalaProps = {
  collapsed?: boolean;
  variant?: "fixed" | "plain"; // plain = for Drawer usage
  onNavigate?: () => void; // optional: close drawer on link click
};

export default function SidebarKoala({
  collapsed = false,
  variant = "fixed",
  onNavigate,
}: SidebarKoalaProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const isItemActive = useMemo(
    () =>
      function isActive(item: MenuItem): boolean {
        if (item.path && (pathname === item.path || pathname.startsWith(`${item.path}/`))) {
          return true;
        }
        return item.children?.some(isActive) ?? false;
      },
    [pathname],
  );

  useEffect(() => {
    const autoOpen: Record<string, boolean> = {};
    menu.forEach((item) => {
      if (item.children && isItemActive(item)) {
        autoOpen[item.name] = true;
      }
    });
    setOpenGroups((prev) => ({ ...autoOpen, ...prev }));
  }, [isItemActive, menu]);

  useEffect(() => {
    const mapNode = (node: ApiMenuNode): MenuItem => ({
      name: node.name,
      path: node.path,
      icon: node.icon ? iconMap[node.icon] : undefined,
      needLogin: node.needLogin,
      children: node.children?.map(mapNode) ?? [],
    });

    const filterByAuth = (items: MenuItem[], loggedIn: boolean): MenuItem[] => {
      const result: MenuItem[] = [];
      for (const it of items) {
        if (it.needLogin && !loggedIn) continue;
        const children = it.children ? filterByAuth(it.children, loggedIn) : [];
        result.push({ ...it, children });
      }
      return result;
    };

    axios
      .get<{ menu: ApiMenuNode[] }>("/api/menu")
      .then((res) => {
        const mapped = res.data.menu.map(mapNode);
        const filtered = filterByAuth(mapped, !!user);
        setMenu(filtered);
      })
      .catch(() => {
        // Fallback default minimal menu
        setMenu([
          { name: "Dashboard", path: "/dashboard", icon: FiHome },
          { name: "Pengaturan", path: "/settings", icon: FiSettings },
        ]);
      });
  }, [user]);

  const toggleGroup = (name: string) =>
    setOpenGroups((prev) => ({ ...prev, [name]: !prev[name] }));

  const renderItem = (item: MenuItem, level = 0) => {
    const active = isItemActive(item);
    const Icon = item.icon;

    if (item.children && item.children.length > 0) {
      const isOpen = !!openGroups[item.name];
      return (
        <div key={item.name} className={cn(level === 0 ? "mt-0" : "mt-0")}>
          <button
            type="button"
            onClick={() => toggleGroup(item.name)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all",
              active
                ? "bg-primary/20 text-primary shadow-koala-soft"
                : "hover:bg-default-100/50 dark:hover:bg-default-100/20",
              collapsed && "justify-center",
            )}
          >
            {Icon && <Icon className="text-lg shrink-0" />}
            {!collapsed && (
              <span className="flex-1 text-left truncate">{item.name}</span>
            )}
            {!collapsed && (
              <FiChevronRight
                className={cn(
                  "transition-transform duration-200 text-base",
                  isOpen ? "rotate-90" : "rotate-0",
                )}
              />
            )}
          </button>
          {!collapsed && isOpen && (
            <div className="mt-1 ml-4 pl-3 border-l border-default-200 flex flex-col gap-1">
              {item.children.map((child) => renderItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.path ?? item.name}
        href={item.path ?? "#"}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all",
          active
            ? "bg-primary/20 text-primary shadow-koala-soft"
            : "hover:bg-default-100/50 dark:hover:bg-default-100/20",
          collapsed && "justify-center",
        )}
      >
        {Icon && <Icon className="text-lg shrink-0" />}
        {!collapsed && <span className="truncate">{item.name}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "transition-all duration-300 backdrop-blur-md border-r border-divider shadow-soft",
        variant === "fixed" && "fixed top-0 left-0 z-30 h-dvh",
        variant === "plain" && "h-dvh",
        collapsed
          ? "w-20 bg-white/30 dark:bg-default/50"
          : "w-64 bg-white/50 dark:bg-default/50 rounded-r-3xl",
      )}
    >
      <div className="flex flex-col justify-between h-full p-5 overflow-y-auto">
        <div>
          {/* Logo */}
          <div className="text-2xl font-semibold mb-8 flex items-center gap-2">
            {!collapsed && <span className="text-primary">KoalaCBT</span>}
          </div>

          {/* Menu */}
          <nav className="flex flex-col gap-4">
            {menu.map((item) => renderItem(item))}
          </nav>
        </div>

        {/* Footer */}
        {!collapsed && (
          <div className="mt-auto text-xs opacity-60 text-center">
            Koala Creative Ac 2025
          </div>
        )}
      </div>
    </aside>
  );
}
