"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Button, Chip } from "@heroui/react";
import toast from "react-hot-toast";
import RoleModal, { RoleForm } from "./components/RoleModal";
import DataTable, { type FetchParams, type Paged } from "@/components/DataTable";
import RoleMenuModal from "./components/RoleMenuModal";
import { FiEdit, FiMenu, FiPlus, FiUsers } from "react-icons/fi";
import RoleUsersModal from "./components/RoleUsersModal";

type Role = { id: string; name: string; key: string; scope: string; schoolId?: string | null; schoolName?: string | null };

export default function RoleSettingsPage() {
  const [reloadKey, setReloadKey] = useState(0);
  const [isOpen, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoleForm | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuRole, setMenuRole] = useState<{ id: string; name: string } | null>(null);
  const [usersOpen, setUsersOpen] = useState(false);
  const [usersRole, setUsersRole] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Master Role</h1>
          <p className="text-sm opacity-70">Daftar role yang tersedia.</p>
        </div>
      </div>
      <DataTable<Role>
        externalReloadKey={reloadKey}
        searchPlaceholder="Cari role by nama atau key..."
        columns={[
          { key: "name", header: "Nama", sortable: true },
          { key: "key", header: "Key", sortable: true, render: (r) => <span className="font-mono text-xs">{r.key}</span> },
          { key: "scope", header: "Scope", sortable: true, render: (r) => (<Chip size="sm" variant="flat">{r.scope}</Chip>) },
          { key: "schoolName", header: "Sekolah", render: (r) => <span className="text-xs">{r.schoolName || "-"}</span> },
          {
            key: "actions",
            header: "Aksi",
            render: (r) => (
              <div className="flex gap-2">
                <Button size="sm" startContent={<FiEdit />} color="secondary" variant="flat" onPress={() => { setEditing({ id: r.id, name: r.name, key: r.key, scope: r.scope as any, schoolId: r.schoolId ?? null }); setOpen(true); }}>Edit</Button>
                <Button size="sm" startContent={<FiMenu />} variant="flat" onPress={() => { setMenuRole({ id: r.id, name: r.name }); setMenuOpen(true); }}>Menu</Button>
                <Button size="sm" startContent={<FiUsers />} variant="flat" onPress={() => { setUsersRole({ id: r.id, name: r.name }); setUsersOpen(true); }}>Users</Button>
              </div>
            ),
          },
        ]}
        rowKey={(r) => r.id}
        fetchData={async ({ page, perPage, q }: FetchParams): Promise<Paged<Role>> => {
          const res = await axios.get(`/api/roles?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}`);
          return res.data as Paged<Role>;
        }}
        toolbarRight={<Button color="primary" startContent={<FiPlus />} onPress={() => { setEditing(null); setOpen(true); }}>Tambah Role</Button>}
      />

      <RoleModal isOpen={isOpen} onOpenChange={setOpen} onSaved={() => setReloadKey((k) => k + 1)} initial={editing} />
      <RoleMenuModal isOpen={menuOpen} onOpenChange={setMenuOpen} onSaved={() => setReloadKey((k) => k + 1)} roleId={menuRole?.id ?? null} roleName={menuRole?.name} />
      <RoleUsersModal isOpen={usersOpen} onOpenChange={setUsersOpen} roleId={usersRole?.id ?? null} roleName={usersRole?.name ?? undefined} />
    </div>
  );
}
