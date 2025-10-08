"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Button, Chip, User } from "@heroui/react";
import toast from "react-hot-toast";
import SchoolModal, { SchoolForm } from "./components/SchoolModal";
import DataTable, { type FetchParams, type Paged } from "@/components/DataTable";
import { FiEdit, FiTrash, FiPlus } from "react-icons/fi";
import ConfirmModal from "@/components/ConfirmModal";
import { useRouter } from "next/navigation";

type School = { id: string; name: string; code: string; logoUrl?: string | null; isActive: boolean };

export default function SchoolSettingsPage() {
  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);
  const [isOpen, setOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolForm | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [target, setTarget] = useState<School | null>(null);

  const askRemove = (s: School) => { setTarget(s); setConfirmOpen(true); };
  const doRemove = async () => {
    if (!target) return;
    try {
      await axios.delete(`/api/schools/${target.id}`);
      setReloadKey((k) => k + 1);
      toast.success("Sekolah dihapus");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menghapus");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Master Sekolah</h1>
          <p className="text-sm opacity-70">Kelola daftar sekolah.</p>
        </div>
      </div>

      <DataTable<School>
        externalReloadKey={reloadKey}
        searchPlaceholder="Cari sekolah by nama atau kode..."
        columns={[
          { key: "profile", header: "Profil", render: (s) => (<User name={s.name} description={s.logoUrl ? s.logoUrl : undefined} avatarProps={{ src: s.logoUrl ?? undefined, name: s.name.charAt(0) }} />) },
          { key: "code", header: "Kode", render: (s) => <span className="font-mono text-xs">{s.code}</span> },
          { key: "status", header: "Status", render: (s) => (<Chip size="sm" color={s.isActive ? "success" : "default"} variant="flat">{s.isActive ? "Aktif" : "Tidak Aktif"}</Chip>) },
          { key: "actions", header: "Aksi", render: (s) => (
            <div className="flex gap-2">
              <Button size="sm" variant="flat" startContent={<FiEdit />} onPress={() => router.push(`/settings/school/${s.id}`)}>Kelola</Button>
              <Button size="sm" color="danger" startContent={<FiTrash />} variant="flat" onPress={() => askRemove(s)}>Hapus</Button>
            </div>
          ) },
        ]}
        rowKey={(s) => s.id}
        fetchData={async ({ page, perPage, q }: FetchParams): Promise<Paged<School>> => {
          const res = await axios.get(`/api/schools?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}`);
          return res.data as Paged<School>;
        }}
        toolbarRight={<Button color="primary" startContent={<FiPlus />} onPress={() => { setEditing(null); setOpen(true); }}>Tambah Sekolah</Button>}
      />

      <SchoolModal isOpen={isOpen} onOpenChange={setOpen} onSaved={() => setReloadKey((k) => k + 1)} initial={editing} />
      <ConfirmModal
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hapus Sekolah"
        description={target ? `Yakin menghapus sekolah "${target.name}"?` : undefined}
        confirmLabel="Hapus"
        confirmColor="danger"
        onConfirm={doRemove}
      />
    </div>
  );
}
