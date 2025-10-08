"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Switch, Chip } from "@heroui/react";
import { ScrollShadow } from "@heroui/scroll-shadow";
import toast from "react-hot-toast";
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
import DataTable, { type FetchParams, type Paged } from "@/components/DataTable";
import ConfirmModal from "@/components/ConfirmModal";
import { useMenu as useMenuStore } from "@/stores/useMenu";

type Role = { id: string; name: string; key: string };
type MenuItem = {
  id: string;
  name: string;
  key: string;
  path: string;
  icon?: string | null;
  order: number;
  visibility: "PUBLIC" | "PRIVATE";
  isActive: boolean;
  parentId?: string | null;
  parentName?: string | null;
  roles: Role[];
};

type FormState = {
  id?: string;
  name: string;
  key: string;
  path: string;
  icon?: string | null;
  order: number;
  visibility: "PUBLIC" | "PRIVATE";
  isActive: boolean;
  parentId?: string | null;
  roleIds: string[];
  menuSuperAdmin?: boolean;
};

const ICON_PACKS: Array<Record<string, IconType>> = [
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

function getIconComponent(name?: string | null): IconType | undefined {
  if (!name) return undefined;
  for (const pack of ICON_PACKS) {
    const C = (pack as any)[name];
    if (C) return C as IconType;
  }
  return undefined;
}

function makeKeyFromName(name: string): string {
  const words = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= 1) return words[0] ?? "";
  return words.join("_");
}

export default function MenuSettingsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const menuStore = useMenuStore();
  const [parentOptions, setParentOptions] = useState<Array<{ key: string; label: string; path: string }>>([]);

  const [isOpen, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState("");
  const [form, setForm] = useState<FormState>({
    name: "",
    key: "",
    path: "",
    icon: null,
    order: 0,
    visibility: "PUBLIC",
    isActive: true,
    parentId: null,
    roleIds: [],
    menuSuperAdmin: false,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [target, setTarget] = useState<MenuItem | null>(null);

  // Compute next order is handled server-side; keep 0 as placeholder
  const nextOrder = (_parentId: string | null) => 0;

  const parentItems = useMemo(() => [{ key: "none", label: "(Tidak ada)" }, ...parentOptions.filter((p) => !form.id || p.key !== form.id)], [parentOptions, form.id]);

  const visibilityItems = [
    { key: "PUBLIC", label: "PUBLIC" },
    { key: "PRIVATE", label: "PRIVATE" },
  ] as const;

  useEffect(() => {
    axios.get<{ roles: Role[] }>("/api/roles?all=1").then((r) => setRoles(r.data.roles)).catch(() => setRoles([]));
    axios
      .get<{ items: Array<{ id: string; name: string; path: string }> }>("/api/menu?mode=manage&all=1")
      .then((res) => setParentOptions(res.data.items.map((i) => ({ key: i.id, label: i.name, path: i.path }))))
      .catch(() => setParentOptions([]));
  }, []);

  const openCreate = (parentId: string | null = null) => {
    const order = nextOrder(parentId);
    const parent = parentId ? parentOptions.find((o) => o.key === parentId) : null;
    const basePath = parent ? `${parent.path}/` : "";
    setForm({ name: "", key: "", path: basePath, icon: null, order, visibility: "PUBLIC", isActive: true, parentId, roleIds: [] });
    setOpen(true);
  };

  const openEdit = (m: MenuItem) => {
    setForm({
      id: m.id,
      name: m.name,
      key: m.key,
      path: m.path,
      icon: m.icon ?? null,
      order: m.order,
      visibility: m.visibility,
      isActive: m.isActive,
      parentId: m.parentId ?? null,
      roleIds: m.roles.map((r) => r.id),
      menuSuperAdmin: (m as any).menuSuperAdmin ?? false,
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      // ensure key autogenerated from name
      payload.key = makeKeyFromName(form.name);
      // ensure parentId null when empty
      if (!payload.parentId) payload.parentId = null;
      if (form.id) {
        await axios.put(`/api/menu/${form.id}`, payload);
        toast.success("Menu diperbarui");
      } else {
        // let server compute order as fallback if needed
        await axios.post("/api/menu", { ...payload, order: payload.order });
        toast.success("Menu dibuat");
      }
      // refresh menu store and table
      menuStore.load();
      setReloadKey((k) => k + 1);
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const askRemove = (m: MenuItem) => { setTarget(m); setConfirmOpen(true); };
  const doRemove = async () => {
    if (!target) return;
    try {
      await axios.delete(`/api/menu/${target.id}`);
      menuStore.load();
      setReloadKey((k) => k + 1);
      toast.success("Menu dihapus");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menghapus");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Master Menu</h1>
          <p className="text-sm opacity-70">Kelola struktur menu, akses per role, dan visibilitas.</p>
        </div>
      </div>

      <DataTable<MenuItem>
        externalReloadKey={reloadKey + menuStore.version}
        searchPlaceholder="Cari menu by nama, key, path..."
        columns={[
          { key: "name", header: "Nama" },
          { key: "path", header: "Path", render: (it) => <span className="font-mono text-xs">{it.path}</span> },
          {
            key: "icon",
            header: "Icon",
            render: (it) => (
              it.parentId ? (
                <span className="text-xs opacity-60">-</span>
              ) : (
                <div className="flex items-center gap-2">
                  {getIconComponent(it.icon) && (() => { const C = getIconComponent(it.icon); return C ? <C className="text-lg" /> : null; })()}
                  <span className="text-xs opacity-80">{it.icon || "-"}</span>
                </div>
              )
            ),
          },
          { key: "order", header: "Urutan" },
          { key: "parentName", header: "Parent" },
          { key: "visibility", header: "Visibility", render: (it) => (<Chip size="sm" color={it.visibility === "PRIVATE" ? "warning" : "default"} variant="flat">{it.visibility}</Chip>) },
          { key: "isActive", header: "Aktif", render: (it) => (<Chip size="sm" color={it.isActive ? "success" : "default"} variant="flat">{it.isActive ? "Ya" : "Tidak"}</Chip>) },
          {
            key: "actions",
            header: "Aksi",
            render: (it) => (
              <div className="flex gap-2">
                <Button size="sm" startContent={<FiIcons.FiEdit />} variant="flat" onPress={() => openEdit(it)}>Edit</Button>
                {!it.parentId && (
                  <Button size="sm" variant="flat" startContent={<FiIcons.FiPlus />} onPress={() => openCreate(it.id)}>Tambah Sub</Button>
                )}
                <Button size="sm" color="danger" startContent={<FiIcons.FiTrash />} variant="flat" onPress={() => askRemove(it)}>Hapus</Button>
              </div>
            ),
          },
        ]}
        rowKey={(it) => it.id}
        fetchData={async ({ page, perPage, q }: FetchParams): Promise<Paged<MenuItem>> => {
          const res = await axios.get(`/api/menu?mode=manage&page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}`);
          return res.data as Paged<MenuItem>;
        }}
        toolbarRight={<Button color="primary" startContent={<FiIcons.FiPlus />} onPress={() => openCreate(null)}>Tambah Menu</Button>}
      />

      <Modal isOpen={isOpen} onOpenChange={setOpen} backdrop="blur">
        <ModalContent>
          {() => (
            <>
              <ModalHeader>{form.id ? "Edit Menu" : "Tambah Menu"}</ModalHeader>
              <ModalBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nama" labelPlacement="outside" placeholder="Nama menu" value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoKey = makeKeyFromName(name);
                    setForm((f) => ({ ...f, name, key: autoKey }));
                  }} />
                <Input label="Key (otomatis)" labelPlacement="outside" isReadOnly value={makeKeyFromName(form.name)} />
                <Input label="Path" labelPlacement="outside" placeholder="/dashboard" value={form.path}
                  onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))} />
                {!form.parentId && (
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Icon</span>
                    <div className="flex items-center gap-3">
                      <Button variant="flat" onPress={() => setIconPickerOpen(true)}>Pilih Icon</Button>
                      <div className="flex items-center gap-2 text-xs opacity-80">
                        {getIconComponent(form.icon) && (() => {
                          const C = getIconComponent(form.icon);
                          return C ? <C className="text-lg" /> : null;
                        })()}
                        <span>{form.icon || "(belum dipilih)"}</span>
                      </div>
                    </div>
                  </div>
                )}

                {form.id && (
                  <Input type="number" label="Urutan" labelPlacement="outside" value={String(form.order)}
                    onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value || 0) }))} />
                )}

                <Select
                  label="Parent"
                  labelPlacement="outside"
                  selectedKeys={new Set([form.parentId ?? "none"])}
                  onSelectionChange={(keys) => {
                    const k = Array.from(keys as Set<string>)[0];
                    const pid = k === "none" ? null : k;
                    const parent = pid ? parentOptions.find((o) => o.key === pid) : null;
                    const basePath = parent ? `${parent.path}/` : "";
                    setForm((f) => ({ ...f, parentId: pid, ...(f.id ? {} : { order: nextOrder(pid) }), path: basePath }));
                  }}
                  items={parentItems}
                >
                  {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
                </Select>

                <Select
                  label="Visibility"
                  labelPlacement="outside"
                  selectedKeys={new Set([form.visibility])}
                  onSelectionChange={(keys) => {
                    const k = Array.from(keys as Set<string>)[0] as "PUBLIC" | "PRIVATE" | undefined;
                    setForm((f) => ({ ...f, visibility: k ?? "PUBLIC" }));
                  }}
                  items={visibilityItems as unknown as Array<{ key: string; label: string }>}
                >
                  {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
                </Select>

                <div className="flex items-center gap-3">
                  <Switch isSelected={form.isActive} onValueChange={(v) => setForm((f) => ({ ...f, isActive: v }))}>
                    Aktif
                  </Switch>
                </div>

                <div className="flex items-center gap-3">
                  <Switch isSelected={!!form.menuSuperAdmin} onValueChange={(v) => setForm((f) => ({ ...f, menuSuperAdmin: v }))}>
                    Khusus SuperAdmin
                  </Switch>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={() => setOpen(false)}>Batal</Button>
                <Button color="primary" isLoading={saving} onPress={save}>Simpan</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Icon Picker Modal */}
      <Modal isOpen={iconPickerOpen} scrollBehavior={'inside'} onOpenChange={setIconPickerOpen} size="5xl" backdrop="blur">
        <ModalContent>
          {() => (
            <>
              <ModalHeader>Pilih Icon</ModalHeader>
              <ModalBody>
                <Input
                  autoFocus
                  placeholder="Cari icon, mis. settings, user, home"
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                />
                <ScrollShadow className="max-h-[60vh]">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {(() => {
                      const all: { name: string; Comp: IconType }[] = [];
                      for (const pack of ICON_PACKS) {
                        for (const key of Object.keys(pack)) {
                          const C = (pack as any)[key] as IconType;
                          if (typeof C === "function" && /^[A-Z]/.test(key)) {
                            all.push({ name: key, Comp: C });
                          }
                        }
                      }
                      const q = iconSearch.trim().toLowerCase();
                      const filtered = q
                        ? all.filter((it) => it.name.toLowerCase().includes(q))
                        : all;
                      // keep deterministic order
                      filtered.sort((a, b) => a.name.localeCompare(b.name));
                      return filtered.slice(0, 2000).map(({ name, Comp }) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setForm((f) => ({ ...f, icon: name }));
                            setIconPickerOpen(false);
                          }}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-default-100/50 text-left"
                        >
                          <Comp className="text-xl" />
                          <span className="text-sm font-mono">{name}</span>
                        </button>
                      ));
                    })()}
                  </div>
                </ScrollShadow>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={() => setIconPickerOpen(false)}>Tutup</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <ConfirmModal
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hapus Menu"
        description={target ? `Yakin menghapus menu "${target.name}"?` : undefined}
        confirmLabel="Hapus"
        confirmColor="danger"
        onConfirm={doRemove}
      />
    </div>
  );
}
