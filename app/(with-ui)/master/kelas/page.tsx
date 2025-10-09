"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Button, Input, Select, SelectItem, Switch, Chip } from "@heroui/react";
import DataTable, { type FetchParams, type Paged } from "@/components/DataTable";
import ConfirmModal from "@/components/ConfirmModal";
import { FiEdit, FiPlus, FiTrash, FiUsers } from "react-icons/fi";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type School = { id: string; name: string; code: string };
type Department = { id: string; name: string };
type ClassRow = { id: string; schoolId: string; departmentId?: string | null; departmentName?: string | null; name: string; grade: number; isActive: boolean };

export default function ClassesPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [schoolId, setSchoolId] = useState<string>("");
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<ClassRow | null>(null);
  const [isOpen, setOpen] = useState(false);
  const [form, setForm] = useState<ClassRow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [target, setTarget] = useState<ClassRow | null>(null);

  useEffect(() => {
    axios.get<{ schools: School[] }>("/api/schools?all=1").then((r) => { setSchools(r.data.schools); setSchoolId(r.data.schools[0]?.id ?? ""); });
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    axios.get(`/api/departments?all=1&schoolId=${schoolId}`).then((r) => {
      const items = (r.data.data || r.data.items || []) as any[];
      setDepartments(items.map((i) => ({ id: i.id, name: i.name })));
    }).catch(() => setDepartments([]));
  }, [schoolId]);

  const schoolItems = useMemo(() => schools.map((s) => ({ key: s.id, label: `${s.name} (${s.code})` })), [schools]);
  const deptItems = useMemo(() => departments.map((d) => ({ key: d.id, label: d.name })), [departments]);

  const openCreate = () => { setForm({ id: "", schoolId, departmentId: null, departmentName: null, name: "", grade: 10, isActive: true } as any); setEditing(null); setOpen(true); };
  const openEdit = (c: ClassRow) => { setForm({ ...c }); setEditing(c); setOpen(true); };
  const askRemove = (c: ClassRow) => { setTarget(c); setConfirmOpen(true); };
  const save = async () => {
    if (!form) return;
    try {
      if (editing) {
        await axios.put(`/api/classes/${editing.id}`, { departmentId: form.departmentId, name: form.name, grade: form.grade, isActive: form.isActive });
        toast.success("Kelas diperbarui");
      } else {
        await axios.post(`/api/classes`, { schoolId, departmentId: form.departmentId || null, name: form.name, grade: form.grade, isActive: form.isActive });
        toast.success("Kelas ditambahkan");
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
          <h1 className="text-2xl font-semibold">Master Classes</h1>
          <p className="text-sm opacity-70">Kelas per sekolah.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select selectedKeys={new Set([schoolId])} onSelectionChange={(keys) => { const k = Array.from(keys as Set<string>)[0]; setSchoolId(k ?? schoolId); }} items={schoolItems}>
            {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
          </Select>
        </div>
      </div>

      {schoolId && (
        <DataTable<ClassRow>
          externalReloadKey={reloadKey + schoolId}
          searchPlaceholder="Cari kelas..."
          columns={[
            { key: "name", header: "Nama" },
            { key: "grade", header: "Tingkat" },
            { key: "departmentName", header: "Jurusan" },
            { key: "isActive", header: "Status", render: (d) => (<Chip size="sm" color={d.isActive ? "success" : "default"} variant="flat">{d.isActive ? "Aktif" : "Nonaktif"}</Chip>) },
            { key: "actions", header: "Aksi", render: (d) => (
              <div className="flex gap-2">
                <Button size="sm" startContent={<FiEdit />} variant="flat" onPress={() => openEdit(d)}>Edit</Button>
                <Button size="sm" startContent={<FiUsers />} color="secondary" variant="flat" onPress={() => router.push(`/master/kelas/${d.id}/students`)}>Siswa</Button>
                <Button size="sm" startContent={<FiTrash />} color="danger" variant="flat" onPress={() => askRemove(d)}>Hapus</Button>
              </div>
            ) },
          ]}
          rowKey={(d) => d.id}
          fetchData={async ({ page, perPage, q }: FetchParams): Promise<Paged<ClassRow>> => {
            const res = await axios.get(`/api/classes?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}&schoolId=${schoolId}`);
            return res.data as Paged<ClassRow>;
          }}
          toolbarRight={<Button color="primary" startContent={<FiPlus />} onPress={openCreate}>Tambah</Button>}
        />
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hapus Kelas"
        description={target ? `Yakin menghapus kelas "${target.name}"?` : undefined}
        confirmLabel="Hapus"
        confirmColor="danger"
        onConfirm={async () => {
          if (!target) return;
          try {
            await axios.delete(`/api/classes/${target.id}`);
            setReloadKey((k) => k + 1);
            toast.success("Kelas dihapus");
          } catch (e: any) {
            toast.error(e?.response?.data?.message || "Gagal menghapus");
          }
        }}
      />

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-content1 rounded-2xl p-4 w-full max-w-lg space-y-3">
            <h3 className="text-lg font-semibold">{editing ? "Edit" : "Tambah"} Kelas</h3>
            <Input label="Nama" labelPlacement="outside" value={form?.name ?? ""} onChange={(e) => setForm((f) => ({ ...(f as any), name: e.target.value }))} />
            <Input type="number" label="Tingkat" labelPlacement="outside" value={String(form?.grade ?? 10)} onChange={(e) => setForm((f) => ({ ...(f as any), grade: Number(e.target.value || 0) }))} />
            <Select label="Jurusan" labelPlacement="outside" selectedKeys={new Set(form?.departmentId ? [form.departmentId] : [])} onSelectionChange={(keys) => { const k = Array.from(keys as Set<string>)[0]; setForm((f) => ({ ...(f as any), departmentId: k ?? null })); }} items={deptItems}>
              {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
            </Select>
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
