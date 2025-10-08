"use client";

import { ThemeSwitch } from "@/components/theme-switch";
import {
  Navbar,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
  NavbarContent,
  NavbarItem,
  NavbarBrand,
} from "@heroui/react";
import { FiLogOut, FiMenu, FiSettings } from "react-icons/fi";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/stores/useAuth";
import { useApp } from "@/stores/useApp";

type NavbarKoalaProps = {
  onToggleSidebar?: () => void;
};

export default function NavbarKoala({ onToggleSidebar }: NavbarKoalaProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const app = useApp();

  const handleAction = async (key: any) => {
    try {
      if (key === "logout") {
        await logout();
        toast.success("Berhasil logout");
        router.push("/login");
      } else if (key === "settings") {
        router.push("/settings/menu");
      }
    } catch (e: any) {
      toast.error("Gagal memproses aksi");
    }
  };
  return (
    <Navbar
      isBordered
      isBlurred
      maxWidth="full"
      className="rounded-2xl bg-white/50 dark:bg-default/50 backdrop-blur-lg shadow border border-divider flex items-center justify-between px-6 h-16"
    >
      <NavbarContent justify="start">
        <NavbarItem className="lg:hidden">
          <Button
            isIconOnly
            variant="light"
            aria-label="Open sidebar"
            onPress={onToggleSidebar}
          >
            <FiMenu className="text-xl" />
          </Button>
        </NavbarItem>
        <NavbarBrand>
          <p className="font-bold text-inherit">Koala CBT</p>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem>
          {/* School picker (if multiple) */}
          {app.schools && app.schools.length > 0 && (
            <Dropdown>
              <DropdownTrigger>
                <Button variant="light" aria-label="Pilih sekolah" className="focus-visible:ring-2">
                  {app.schools.find((s) => s.id === app.activeSchoolId)?.code || app.schools[0]?.code || "SEKOLAH"}
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Daftar Sekolah" onAction={async (key) => {
                await app.setActiveSchool(String(key));
                toast.success("Sekolah aktif diperbarui");
              }}>
                {app.schools.map((s) => (
                  <DropdownItem key={s.id} textValue={s.name} aria-label={`Pilih ${s.name}`}>
                    {s.name} ({s.code})
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          )}
        </NavbarItem>
        <NavbarItem>
          <ThemeSwitch />
        </NavbarItem>
        <NavbarItem>
          <Dropdown showArrow placement="bottom-end">
            <DropdownTrigger>
              <Avatar
                isBordered
                color="primary"
                size="sm"
                src="https://api.dicebear.com/7.x/thumbs/svg?seed=Koala"
                className="cursor-pointer hover:opacity-90 transition-all"
              />
            </DropdownTrigger>
            <DropdownMenu aria-label="User menu" variant="flat" onAction={handleAction}>
              <DropdownItem key="profile" textValue="Profile">
                <div className="flex flex-col">
                  <span className="font-medium">Koalawan</span>
                  <span className="text-xs opacity-60">koala@creative.com</span>
                </div>
              </DropdownItem>
              <DropdownItem startContent={<FiSettings />} key="settings">Pengaturan</DropdownItem>
              <DropdownItem startContent={<FiLogOut />} key="logout" color="danger" className="text-danger">
                Keluar
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}

