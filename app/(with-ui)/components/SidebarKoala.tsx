"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@heroui/react";
import type { IconType } from "react-icons";
import { FiChevronRight } from "react-icons/fi";
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
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/stores/useAuth";
import { useMenu } from "@/stores/useMenu";

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

const PACKS: Array<Record<string, IconType>> = [
  FiIcons as unknown as Record<string, IconType>,
  FaIcons as unknown as Record<string, IconType>,
  MdIcons as unknown as Record<string, IconType>,
  RiIcons as unknown as Record<string, IconType>,
  HiIcons as unknown as Record<string, IconType>,
  BiIcons as unknown as Record<string, IconType>,
  BsIcons as unknown as Record<string, IconType>,
  PiIcons as unknown as Record<string, IconType>,
  TbIcons as unknown as Record<string, IconType>,
  LuIcons as unknown as Record<string, IconType>,
  Io5Icons as unknown as Record<string, IconType>,
];

function resolveIcon(name?: string | null): IconType | undefined {
  if (!name) return undefined;
  for (const pack of PACKS) {
    const C = (pack as any)[name];
    if (C) return C as IconType;
  }
  return undefined;
}

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
  const menuStore = useMenu();
  const menu = menuStore.menu as MenuItem[];
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
    menuStore.connect();
  }, [menuStore]);

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
              "w-full flex cursor-pointer items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all",
              active
                ? "bg-primary shadow-koala-soft"
                : "hover:bg-default-100/50 dark:hover:bg-default-100/20",
              collapsed && "justify-center",
            )}
          >
            {Icon && <Icon className="text-lg shrink-0" />}
            {!collapsed && (
              <span className="flex-1 text-left truncate">{item.name}</span>
            )}
            {!collapsed && !isOpen ? (
              <FiChevronRight
                className={cn(
                  "transition-transform duration-200 text-base",
                  isOpen ? "rotate-90" : "rotate-0",
                )}
              />
            ) : (
              <FiIcons.FiChevronDown
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
            ? "bg-primary shadow-koala-soft"
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
