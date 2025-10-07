import NextLink from "next/link";
import { Link } from "@heroui/link";
import { siteConfig } from "@/config/site";

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 shrink-0 border-r border-default-200 min-h-[calc(100vh-64px)] p-4">
      <nav className="w-full">
        <ul className="flex flex-col gap-1">
          {siteConfig.navItems.map((item) => (
            <li key={item.href}>
              <Link as={NextLink} href={item.href} className="w-full py-2 px-3 rounded-md hover:bg-default-100 block">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
