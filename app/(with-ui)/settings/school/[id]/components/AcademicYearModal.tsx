"use client";

import { useEffect, useState } from "react";
import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Switch } from "@heroui/react";
import axios from "axios";
import toast from "react-hot-toast";

type Props = {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  schoolId: string;
  initial?: { id?: string; label: string; startDate: string; endDate: string; isActive: boolean } | null;
};

export default function AcademicYearModal({ isOpen, onOpenChange, onSaved, schoolId, initial }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: "", startDate: "", endDate: "", isActive: false, id: undefined as string | undefined });

  useEffect(() => {
    if (initial) setForm({ id: initial.id, label: initial.label, startDate: initial.startDate, endDate: initial.endDate, isActive: !!initial.isActive });
    else setForm({ id: undefined, label: "", startDate: "", endDate: "", isActive: false });
  }, [initial, isOpen]);

  const save = async () => {
    setSaving(true);
    try {
      if (form.id) {
        await axios.put(`/api/academic-years/${form.id}`, { label: form.label, startDate: form.startDate, endDate: form.endDate, isActive: form.isActive });
        toast.success("Tahun ajaran diperbarui");
      } else {
        await axios.post(`/api/academic-years`, { schoolId, label: form.label, startDate: form.startDate, endDate: form.endDate, isActive: form.isActive });
        toast.success("Tahun ajaran ditambahkan");
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
            <ModalHeader>{form.id ? "Edit Tahun Ajaran" : "Tambah Tahun Ajaran"}</ModalHeader>
            <ModalBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Label" labelPlacement="outside" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
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
