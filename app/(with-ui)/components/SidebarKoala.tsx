"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@heroui/react";
import { FiChevronRight } from "react-icons/fi";

type MenuItem = {
  name: string;
  path: string;
};

const menu: MenuItem[] = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Tugas Saya", path: "/tasks" },
  { name: "Pengaturan", path: "/settings" },
];

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
            <span className="text-3xl">🐨</span>
            {!collapsed && <span className="text-primary">KoalaCBT</span>}
          </div>

          {/* Menu */}
          <nav className="flex flex-col gap-2">
            {menu.map((item) => {
              const active = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                    active
                      ? "bg-primary/20 text-primary shadow-koala-soft"
                      : "hover:bg-default-100/50 dark:hover:bg-default-100/20",
                    collapsed && "justify-center"
                  )}
                >
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
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

