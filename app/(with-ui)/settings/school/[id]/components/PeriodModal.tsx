"use client";

import { useEffect, useState } from "react";
import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Switch } from "@heroui/react";
import axios from "axios";
import toast from "react-hot-toast";

type Props = {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  schoolId: string;
  academicYears: Array<{ id: string; label: string }>;
  initial?: { id?: string; academicYearId: string; type: string; startDate: string; endDate: string; isActive: boolean } | null;
};

const TYPES = [
  { key: "SEMESTER_1", label: "SEMESTER 1" },
  { key: "SEMESTER_2", label: "SEMESTER 2" },
  { key: "UTS", label: "UTS" },
  { key: "UAS", label: "UAS" },
];

export default function PeriodModal({ isOpen, onOpenChange, onSaved, schoolId, academicYears, initial }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ id: undefined as string | undefined, academicYearId: "", type: "SEMESTER_1", startDate: "", endDate: "", isActive: false });

  useEffect(() => {
    if (initial) setForm({ id: initial.id, academicYearId: initial.academicYearId, type: initial.type, startDate: initial.startDate, endDate: initial.endDate, isActive: !!initial.isActive });
    else setForm({ id: undefined, academicYearId: academicYears[0]?.id ?? "", type: "SEMESTER_1", startDate: "", endDate: "", isActive: false });
  }, [initial, isOpen, academicYears]);

  const save = async () => {
    setSaving(true);
    try {
      if (form.id) {
        await axios.put(`/api/periods/${form.id}`, { academicYearId: form.academicYearId, type: form.type, startDate: form.startDate, endDate: form.endDate, isActive: form.isActive });
        toast.success("Periode diperbarui");
      } else {
        await axios.post(`/api/periods`, { schoolId, academicYearId: form.academicYearId, type: form.type, startDate: form.startDate, endDate: form.endDate, isActive: form.isActive });
        toast.success("Periode ditambahkan");
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur">
      <ModalContent>
        {() => (
          <>
            <ModalHeader>{form.id ? "Edit Periode" : "Tambah Periode"}</ModalHeader>
            <ModalBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Tahun Ajaran" labelPlacement="outside" selectedKeys={new Set([form.academicYearId])} onSelectionChange={(keys) => { const k = Array.from(keys as Set<string>)[0]; setForm((f) => ({ ...f, academicYearId: k ?? f.academicYearId })); }} items={academicYears}>
                {(ay) => <SelectItem key={ay.id}>{ay.label}</SelectItem>}
              </Select>
              <Select label="Jenis Periode" labelPlacement="outside" selectedKeys={new Set([form.type])} onSelectionChange={(keys) => { const k = Array.from(keys as Set<string>)[0] as any; setForm((f) => ({ ...f, type: k ?? f.type })); }} items={TYPES}>
                {(t) => <SelectItem key={t.key}>{t.label}</SelectItem>}
              </Select>
              <Input type="date" label="Mulai" labelPlacement="outside" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              <Input type="date" label="Selesai" labelPlacement="outside" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              <div className="flex items-center gap-3">
                <Switch isSelected={form.isActive} onValueChange={(v) => setForm((f) => ({ ...f, isActive: v }))}>Aktif</Switch>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={() => onOpenChange(false)}>Batal</Button>
              <Button color="primary" isLoading={saving} onPress={save}>Simpan</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
