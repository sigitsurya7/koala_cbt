"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "@heroui/react";
import DataTable, { type FetchParams, type Paged } from "@/components/DataTable";
import PermissionModal, { type PermissionForm } from "./components/PermissionModal";
import PermissionRolesModal from "./components/PermissionRolesModal";
import ConfirmModal from "@/components/ConfirmModal";
import { FiEdit, FiTrash, FiPlus, FiUsers } from "react-icons/fi";
import toast from "react-hot-toast";

type Permission = { id: string; name: string; action: "READ" | "CREATE" | "UPDATE" | "DELETE"; resource: string };

export default function PermissionsSettingsPage() {
  const [reloadKey, setReloadKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PermissionForm | null>(null);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [rolesPerm, setRolesPerm] = useState<{ id: string; name: string } | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [target, setTarget] = useState<Permission | null>(null);
  const askRemove = (p: Permission) => { setTarget(p); setConfirmOpen(true); };
  const doRemove = async () => {
    if (!target) return;
    try {
      await axios.delete(`/api/permissions/${target.id}`);
      setReloadKey((k) => k + 1);
      toast.success("Permission dihapus");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menghapus");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Permissions</h1>
          <p className="text-sm opacity-70">Atur resource API dan role yang dapat mengakses.</p>
        </div>
      </div>

      <DataTable<Permission>
        externalReloadKey={reloadKey}
        searchPlaceholder="Cari permissions by nama/action/resource..."
        columns={[
          { key: "name", header: "Nama" },
          { key: "action", header: "Action" },
          { key: "resource", header: "Resource" },
          {
            key: "actions",
            header: "Aksi",
            render: (p) => (
              <div className="flex gap-2">
                <Button size="sm" startContent={<FiEdit />} variant="flat" onPress={() => { setEditing({ id: p.id, name: p.name, action: p.action, resource: p.resource }); setOpen(true); }}>Edit</Button>
                <Button size="sm" startContent={<FiUsers />} variant="flat" onPress={() => { setRolesPerm({ id: p.id, name: p.name }); setRolesOpen(true); }}>Roles</Button>
                <Button size="sm" color="danger" startContent={<FiTrash />} variant="flat" onPress={() => askRemove(p)}>Hapus</Button>
              </div>
            ),
          },
        ]}
        rowKey={(p) => p.id}
        fetchData={async ({ page, perPage, q }: FetchParams): Promise<Paged<Permission>> => {
          const res = await axios.get(`/api/permissions?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}`);
          return res.data as Paged<Permission>;
        }}
        toolbarRight={<Button color="primary" startContent={<FiPlus />} onPress={() => { setEditing(null); setOpen(true); }}>Tambah Permission</Button>}
      />

      <PermissionModal isOpen={open} onOpenChange={setOpen} onSaved={() => setReloadKey((k) => k + 1)} initial={editing} />
      <PermissionRolesModal isOpen={rolesOpen} onOpenChange={setRolesOpen} onSaved={() => setReloadKey((k) => k + 1)} permissionId={rolesPerm?.id ?? null} permissionName={rolesPerm?.name} />

      <ConfirmModal
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hapus Permission"
        description={target ? `Yakin menghapus permission "${target.name}"?` : undefined}
        confirmLabel="Hapus"
        confirmColor="danger"
        onConfirm={doRemove}
      />
    </div>
  );
}
