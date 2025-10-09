"use client";

import { useState } from "react";
import axios from "axios";
import { Button, Chip, Input, Select, SelectItem, Switch } from "@heroui/react";
import DataTable, { type FetchParams, type Paged } from "@/components/DataTable";
import ConfirmModal from "@/components/ConfirmModal";
import { FiEdit, FiPlus, FiTrash, FiUpload, FiDownload } from "react-icons/fi";
import toast from "react-hot-toast";
import UserDetailModal from "./components/UserDetailModal";
import ImportModal from "./components/ImportModal";

type UserRow = { id: string; name: string; email: string; type: string; isSuperAdmin: boolean; schoolName?: string | null };

export default function UserManagementPage() {
  const [reloadKey, setReloadKey] = useState(0);
  const [isOpen, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [target, setTarget] = useState<UserRow | null>(null);
  const [form, setForm] = useState<{ id?: string; name: string; email: string; password?: string; type: string; isSuperAdmin: boolean }>({ name: "", email: "", password: "", type: "SISWA", isSuperAdmin: false });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<UserRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const openCreate = () => { setForm({ name: "", email: "", password: "", type: "SISWA", isSuperAdmin: false }); setOpen(true); };
  const openEdit = (u: UserRow) => { setForm({ id: u.id, name: u.name, email: u.email, type: u.type, isSuperAdmin: u.isSuperAdmin }); setOpen(true); };
  const askRemove = (u: UserRow) => { setTarget(u); setConfirmOpen(true); };

  const save = async () => {
    try {
      if (form.id) {
        await axios.put(`/api/users/${form.id}`, form);
        toast.success("User diperbarui");
      } else {
        await axios.post(`/api/users`, form);
        toast.success("User ditambahkan");
      }
      setOpen(false); setReloadKey((k) => k + 1);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan user");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">User Management</h1>
          <p className="text-sm opacity-70">Tambah, edit, dan hapus user.</p>
        </div>
      </div>

      <DataTable<UserRow>
        externalReloadKey={reloadKey}
        searchPlaceholder="Cari user by nama atau email..."
        columns={[
          { key: "name", header: "Nama" },
          { key: "email", header: "Email", render: (u) => <span className="font-mono text-xs">{u.email}</span> },
          { key: "type", header: "Tipe" },
          { key: "schoolName", header: "Sekolah" },
          { key: "isSuperAdmin", header: "SuperAdmin", render: (u) => (<Chip size="sm" color={u.isSuperAdmin ? "secondary" : "default"} variant="flat">{u.isSuperAdmin ? "Ya" : "Tidak"}</Chip>) },
          { key: "actions", header: "Aksi", render: (u) => (
            <div className="flex gap-2">
              <Button size="sm" startContent={<FiEdit />} variant="flat" onPress={() => openEdit(u)}>Edit</Button>
              <Button size="sm" variant="flat" onPress={() => { setDetailUser(u); setDetailOpen(true); }}>Detail</Button>
              <Button size="sm" startContent={<FiTrash />} color="danger" variant="flat" onPress={() => askRemove(u)}>Hapus</Button>
            </div>
          ) },
        ]}
        rowKey={(u) => u.id}
        fetchData={async ({ page, perPage, q }: FetchParams): Promise<Paged<UserRow>> => {
          const res = await axios.get(`/api/users?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}`);
          return res.data as Paged<UserRow>;
        }}
        toolbarRight={
          <div className="flex gap-2">
            <Button startContent={<FiDownload />} color="success" variant="flat" onPress={async () => {
              try {
                toast.loading("Menyiapkan template...", { id: "dl" });
                // Prompt user to choose sekolah dalam modal import agar kita tahu schoolId
                setImportOpen(true);
              } catch {
              } finally {
                toast.dismiss("dl");
              }
            }}>Download Template</Button>
            <Button startContent={<FiUpload />} color="secondary" variant="flat" onPress={() => setImportOpen(true)}>Import Data</Button>
            <Button color="primary" startContent={<FiPlus />} onPress={openCreate}>Tambah User</Button>
          </div>
        }
      />

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-content1 rounded-2xl p-4 w-full max-w-lg space-y-3">
            <h3 className="text-lg font-semibold">{form.id ? "Edit User" : "Tambah User"}</h3>
            <Input label="Nama" labelPlacement="outside" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label="Email" type="email" labelPlacement="outside" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <Input label="Password" type="password" labelPlacement="outside" value={form.password ?? ""} placeholder={form.id ? "Kosongkan bila tidak diubah" : "••••••"} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            <Select label="Tipe User" labelPlacement="outside" selectedKeys={new Set([form.type])} onSelectionChange={(keys) => { const k = Array.from(keys as Set<string>)[0]; setForm((f) => ({ ...f, type: k ?? f.type })); }} items={[{ key: "SISWA", label: "SISWA" }, { key: "GURU", label: "GURU" }, { key: "STAFF", label: "STAFF" }, { key: "ADMIN", label: "ADMIN" }]}>
              {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
            </Select>
            <div className="flex items-center gap-3"><Switch isSelected={!!form.isSuperAdmin} onValueChange={(v) => setForm((f) => ({ ...f, isSuperAdmin: v }))}>SuperAdmin</Switch></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="flat" onPress={() => setOpen(false)}>Batal</Button>
              <Button color="primary" onPress={save}>Simpan</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hapus User"
        description={target ? `Yakin menghapus user "${target.name}"?` : undefined}
        confirmLabel="Hapus"
        confirmColor="danger"
        onConfirm={async () => {
          if (!target) return;
          try {
            await axios.delete(`/api/users/${target.id}`);
            setReloadKey((k) => k + 1);
            toast.success("User dihapus");
          } catch (e: any) {
            toast.error(e?.response?.data?.message || "Gagal menghapus user");
          }
        }}
      />

      <UserDetailModal isOpen={detailOpen} onOpenChange={setDetailOpen} user={detailUser} />
      <ImportModal isOpen={importOpen} onOpenChange={setImportOpen} onImported={() => setReloadKey((k) => k + 1)} />
    </div>
  );
}
