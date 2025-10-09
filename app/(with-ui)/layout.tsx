"use client";

import "@/styles/globals.css";
import SidebarKoala from "./components/SidebarKoala";
import NavbarKoala from "./components/NavbarKoala";
import { Drawer, DrawerContent, useDisclosure } from "@heroui/react";

export default function WithUILayout({ children }: { children: React.ReactNode }) {
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  return (
    <div className="flex h-dvh w-full bg-background text-foreground font-sans overflow-hidden">
      {/* Sidebar tetap (desktop) */}
      <div className="hidden lg:block">
        <SidebarKoala />
      </div>

      {/* Drawer (mobile) */}
      <Drawer isOpen={isOpen} onOpenChange={onOpenChange} placement="left">
        <DrawerContent className="p-0 w-64 max-w-[16rem] h-dvh">
          <SidebarKoala variant="plain" onNavigate={onClose} />
        </DrawerContent>
      </Drawer>

      {/* Area kanan: navbar + content */}
      <div className="flex-1 ml-0 lg:ml-64 relative flex flex-col min-w-0">
        {/* Navbar */}
        <div className="sticky top-4 z-30 mx-8">
          <NavbarKoala onToggleSidebar={onOpen} />
        </div>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 pb-8 pt-6 min-w-0">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
