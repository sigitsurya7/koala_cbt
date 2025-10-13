"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Button, Input, Select, SelectItem, Switch, Chip } from "@heroui/react";
import DataTable, { type FetchParams, type Paged } from "@/components/DataTable";
import ConfirmModal from "@/components/ConfirmModal";
import { FiEdit, FiPlus, FiTrash } from "react-icons/fi";
import toast from "react-hot-toast";
import { useApp } from "@/stores/useApp";

type Department = { id: string; schoolId: string; name: string; level?: string | null; isActive: boolean };

export default function DepartmentsPage() {
  const app = useApp();
  const isSuperAdmin = !!app.user?.isSuperAdmin;
  const schools = useMemo(() => app.schools || [], [app.schools]);
  const activeSchoolId = app.activeSchoolId || "";
  const setActiveSchool = app.setActiveSchool;
  const schoolId = useMemo(() => {
    if (activeSchoolId) return activeSchoolId;
    if (isSuperAdmin && schools.length > 0) return schools[0].id;
    return "";
  }, [activeSchoolId, isSuperAdmin, schools]);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<Department | null>(null);
  const [isOpen, setOpen] = useState(false);
  const [form, setForm] = useState<Department | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [target, setTarget] = useState<Department | null>(null);

  useEffect(() => {
    if (isSuperAdmin && !activeSchoolId && schools.length > 0) {
      setActiveSchool(schools[0].id).catch(() => {});
    }
  }, [isSuperAdmin, activeSchoolId, schools, setActiveSchool]);

  const schoolItems = useMemo(() => schools.map((s) => ({ key: s.id, label: `${s.name} (${s.code})` })), [schools]);

  const openCreate = () => {
    if (!schoolId) {
      toast.error("Sekolah belum dipilih");
      return;
    }
    setForm({ id: "", schoolId, name: "", level: "", isActive: true } as any);
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (d: Department) => { setForm({ ...d }); setEditing(d); setOpen(true); };
  const askRemove = (d: Department) => { setTarget(d); setConfirmOpen(true); };
  useEffect(() => {
    if (!isOpen || editing || !schoolId) return;
    setForm((prev) => (prev ? { ...prev, schoolId } : prev));
  }, [isOpen, editing, schoolId]);
  useEffect(() => {
    if (!schoolId) {
      setOpen(false);
      setConfirmOpen(false);
      setForm(null);
      setTarget(null);
      return;
    }
    if (isOpen && editing && editing.schoolId !== schoolId) {
      setOpen(false);
      setEditing(null);
      setForm(null);
    }
    if (confirmOpen && target && target.schoolId !== schoolId) {
      setConfirmOpen(false);
      setTarget(null);
    }
  }, [schoolId, isOpen, confirmOpen, editing, target]);
  const save = async () => {
    if (!form) return;
    if (!schoolId) {
      toast.error("Sekolah belum dipilih");
      return;
    }
    try {
      if (editing) {
        await axios.put(`/api/departments/${editing.id}`, { name: form.name, level: form.level, isActive: form.isActive, schoolId });
        toast.success("Jurusan diperbarui");
      } else {
        await axios.post(`/api/departments`, { schoolId, name: form.name, level: form.level, isActive: form.isActive });
        toast.success("Jurusan ditambahkan");
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
          <h1 className="text-2xl font-semibold">Master Jurusan</h1>
          <p className="text-sm opacity-70">Jurusan per sekolah.</p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <Select
              selectedKeys={schoolId ? new Set([schoolId]) : new Set([])}
              onSelectionChange={(keys) => {
                const k = Array.from(keys as Set<string>)[0];
                if (k) {
                  setActiveSchool(String(k)).catch(() => {
                    toast.error("Gagal mengganti sekolah aktif");
                  });
                }
              }}
              items={schoolItems}
            >
              {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
            </Select>
          )}
        </div>
      </div>

      {schoolId && (
        <DataTable<Department>
          externalReloadKey={`${reloadKey}-${schoolId}`}
          searchPlaceholder="Cari jurusan..."
          columns={[
            { key: "name", header: "Nama" },
            { key: "level", header: "Level" },
            { key: "isActive", header: "Status", render: (d) => (<Chip size="sm" color={d.isActive ? "success" : "default"} variant="flat">{d.isActive ? "Aktif" : "Nonaktif"}</Chip>) },
            { key: "actions", header: "Aksi", render: (d) => (
              <div className="flex gap-2">
                <Button size="sm" startContent={<FiEdit />} variant="flat" onPress={() => openEdit(d)}>Edit</Button>
                <Button size="sm" startContent={<FiTrash />} color="danger" variant="flat" onPress={() => askRemove(d)}>Hapus</Button>
              </div>
            ) },
          ]}
          rowKey={(d) => d.id}
          fetchData={async ({ page, perPage, q }: FetchParams): Promise<Paged<Department>> => {
            if (!schoolId) {
              return { data: [], page, perPage, total: 0, totalPages: 0 } as Paged<Department>;
            }
            const res = await axios.get(`/api/departments?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}&schoolId=${schoolId}`);
            return res.data as Paged<Department>;
          }}
          toolbarRight={<Button color="primary" startContent={<FiPlus />} onPress={openCreate} isDisabled={!schoolId}>Tambah</Button>}
        />
      )}

      {/* Simple inline modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-content1 rounded-2xl p-4 w-full max-w-lg space-y-3">
            <h3 className="text-lg font-semibold">{editing ? "Edit" : "Tambah"} Jurusan</h3>
            <Input label="Nama" labelPlacement="outside" value={form?.name ?? ""} onChange={(e) => setForm((f) => ({ ...(f as any), name: e.target.value }))} />
            <Input label="Level" labelPlacement="outside" value={form?.level ?? ""} onChange={(e) => setForm((f) => ({ ...(f as any), level: e.target.value }))} />
            <div className="flex items-center gap-3"><Switch isSelected={!!form?.isActive} onValueChange={(v) => setForm((f) => ({ ...(f as any), isActive: v }))}>Aktif</Switch></div>
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
        title="Hapus Jurusan"
        description={target ? `Yakin menghapus jurusan "${target.name}"?` : undefined}
        confirmLabel="Hapus"
        confirmColor="danger"
        onConfirm={async () => {
          if (!target) return;
          if (!schoolId) {
            toast.error("Sekolah belum dipilih");
            return;
          }
          try {
            await axios.delete(`/api/departments/${target.id}${schoolId ? `?schoolId=${schoolId}` : ""}`);
            setReloadKey((k) => k + 1);
            toast.success("Jurusan dihapus");
          } catch (e: any) {
            toast.error(e?.response?.data?.message || "Gagal menghapus");
          }
        }}
      />
    </div>
  );
}
