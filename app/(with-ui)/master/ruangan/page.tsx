"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Button, Input, Select, SelectItem, Switch, Chip } from "@heroui/react";
import DataTable, { type FetchParams, type Paged } from "@/components/DataTable";
import ConfirmModal from "@/components/ConfirmModal";
import { FiEdit, FiPlus, FiTrash } from "react-icons/fi";
import toast from "react-hot-toast";

type School = { id: string; name: string; code: string };
type Room = { id: string; schoolId: string; name: string; capacity?: number | null; isActive: boolean };

export default function RoomsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState<string>("");
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<Room | null>(null);
  const [isOpen, setOpen] = useState(false);
  const [form, setForm] = useState<Room | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [target, setTarget] = useState<Room | null>(null);

  useEffect(() => {
    axios.get<{ schools: School[] }>("/api/schools?all=1").then((r) => { setSchools(r.data.schools); setSchoolId(r.data.schools[0]?.id ?? ""); });
  }, []);

  const schoolItems = useMemo(() => schools.map((s) => ({ key: s.id, label: `${s.name} (${s.code})` })), [schools]);

  const openCreate = () => { setForm({ id: "", schoolId, name: "", capacity: null, isActive: true } as any); setEditing(null); setOpen(true); };
  const openEdit = (r: Room) => { setForm({ ...r }); setEditing(r); setOpen(true); };
  const askRemove = (r: Room) => { setTarget(r); setConfirmOpen(true); };
  const save = async () => {
    if (!form) return;
    try {
      if (editing) {
        await axios.put(`/api/rooms/${editing.id}`, { name: form.name, capacity: form.capacity, isActive: form.isActive });
        toast.success("Ruangan diperbarui");
      } else {
        await axios.post(`/api/rooms`, { schoolId, name: form.name, capacity: form.capacity ?? null, isActive: form.isActive });
        toast.success("Ruangan ditambahkan");
      }
      setOpen(false); setReloadKey((k) => k + 1);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Master Rooms</h1>
          <p className="text-sm opacity-70">Ruangan per sekolah.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select selectedKeys={new Set([schoolId])} onSelectionChange={(keys) => { const k = Array.from(keys as Set<string>)[0]; setSchoolId(k ?? schoolId); }} items={schoolItems}>
            {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
          </Select>
        </div>
      </div>

      {schoolId && (
        <DataTable<Room>
          externalReloadKey={reloadKey + schoolId}
          searchPlaceholder="Cari ruangan..."
          columns={[
            { key: "name", header: "Nama" },
            { key: "capacity", header: "Kapasitas" },
            { key: "isActive", header: "Status", render: (d) => (<Chip size="sm" color={d.isActive ? "success" : "default"} variant="flat">{d.isActive ? "Aktif" : "Nonaktif"}</Chip>) },
            { key: "actions", header: "Aksi", render: (d) => (
              <div className="flex gap-2">
                <Button size="sm" startContent={<FiEdit />} variant="flat" onPress={() => openEdit(d)}>Edit</Button>
                <Button size="sm" startContent={<FiTrash />} color="danger" variant="flat" onPress={() => askRemove(d)}>Hapus</Button>
              </div>
            ) },
          ]}
          rowKey={(d) => d.id}
          fetchData={async ({ page, perPage, q }: FetchParams): Promise<Paged<Room>> => {
            const res = await axios.get(`/api/rooms?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}&schoolId=${schoolId}`);
            return res.data as Paged<Room>;
          }}
          toolbarRight={<Button color="primary" startContent={<FiPlus />} onPress={openCreate}>Tambah</Button>}
        />
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hapus Ruangan"
        description={target ? `Yakin menghapus ruangan "${target.name}"?` : undefined}
        confirmLabel="Hapus"
        confirmColor="danger"
        onConfirm={async () => {
          if (!target) return;
          try {
            await axios.delete(`/api/rooms/${target.id}`);
            setReloadKey((k) => k + 1);
            toast.success("Ruangan dihapus");
          } catch (e: any) {
            toast.error(e?.response?.data?.message || "Gagal menghapus");
          }
        }}
      />

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-content1 rounded-2xl p-4 w-full max-w-lg space-y-3">
            <h3 className="text-lg font-semibold">{editing ? "Edit" : "Tambah"} Ruangan</h3>
            <Input label="Nama" labelPlacement="outside" value={form?.name ?? ""} onChange={(e) => setForm((f) => ({ ...(f as any), name: e.target.value }))} />
            <Input type="number" label="Kapasitas" labelPlacement="outside" value={String(form?.capacity ?? "")} onChange={(e) => setForm((f) => ({ ...(f as any), capacity: e.target.value ? Number(e.target.value) : null }))} />
            <div className="flex items-center gap-3"><Switch isSelected={!!form?.isActive} onValueChange={(v) => setForm((f) => ({ ...(f as any), isActive: v }))}>Aktif</Switch></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="flat" onPress={() => setOpen(false)}>Batal</Button>
              <Button color="primary" onPress={save}>Simpan</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
