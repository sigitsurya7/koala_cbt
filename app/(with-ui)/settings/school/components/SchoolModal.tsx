"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Switch, Image } from "@heroui/react";
import axios from "axios";
import toast from "react-hot-toast";

export type SchoolForm = {
  id?: string;
  name: string;
  code: string;
  logoUrl?: string | null;
  isActive: boolean;
};

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  initial?: SchoolForm | null;
};

export default function SchoolModal({ isOpen, onOpenChange, onSaved, initial }: Props) {
  const [form, setForm] = useState<SchoolForm>({ name: "", code: "", logoUrl: null, isActive: true });
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    if (initial) setForm(initial);
    else setForm({ name: "", code: "", logoUrl: null, isActive: true });
    setLogoFile(null);
  }, [initial, isOpen]);

  const save = async () => {
    setSaving(true);
    try {
      let schoolId = form.id;
      if (schoolId) {
        await axios.put(`/api/schools/${schoolId}`, form);
        toast.success("Sekolah diperbarui");
      } else {
        const res = await axios.post(`/api/schools`, form);
        schoolId = res.data.id as string;
        toast.success("Sekolah dibuat");
      }
      if (logoFile && schoolId) {
        const fd = new FormData();
        fd.append("file", logoFile);
        await axios.post(`/api/schools/${schoolId}/logo`, fd);
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan sekolah");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} size="xl" onOpenChange={onOpenChange} backdrop="blur">
      <ModalContent>
        {() => (
          <>
            <ModalHeader>{form.id ? "Edit Sekolah" : "Tambah Sekolah"}</ModalHeader>
            <ModalBody className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Input label="Nama Sekolah" labelPlacement="outside" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <Input label="Kode Sekolah" labelPlacement="outside" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
              <div className="flex flex-col gap-4">
                <span className="text-sm font-medium">Upload Logo (PNG/SVG)</span>
                <input
                  type="file"
                  accept="image/png,image/svg+xml"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                />
                <div className="flex items-center gap-3">
                  {logoFile ? (
                    <img
                      src={URL.createObjectURL(logoFile)}
                      alt="Preview"
                      className="w-24 h-24 object-contain border rounded"
                    />
                  ) : form.logoUrl ? (
                    <img src={form.logoUrl} alt="Logo" className="w-24 h-24 object-contain border rounded" />
                  ) : null}
                  <span className="text-xs opacity-70">Disarankan lebar 64-1024px, format PNG/SVG.</span>
                </div>
              </div>
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
