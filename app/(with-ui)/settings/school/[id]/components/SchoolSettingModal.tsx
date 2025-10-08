"use client";

import { useEffect, useState } from "react";
import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem } from "@heroui/react";
import axios from "axios";
import toast from "react-hot-toast";

type Props = {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  schoolId: string;
  initial?: { id?: string; key: string; type: "STRING" | "NUMBER" | "BOOLEAN" | "JSON"; value: string } | null;
};

const TYPES = [
  { key: "STRING", label: "STRING" },
  { key: "NUMBER", label: "NUMBER" },
  { key: "BOOLEAN", label: "BOOLEAN" },
  { key: "JSON", label: "JSON" },
];

export default function SchoolSettingModal({ isOpen, onOpenChange, onSaved, schoolId, initial }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ id: undefined as string | undefined, key: "", type: "STRING" as Props["initial"]["type"], value: "" });

  useEffect(() => {
    if (initial) setForm({ id: initial.id, key: initial.key, type: initial.type, value: initial.value });
    else setForm({ id: undefined, key: "", type: "STRING", value: "" });
  }, [initial, isOpen]);

  const save = async () => {
    setSaving(true);
    try {
      if (form.id) {
        await axios.put(`/api/school-settings/${form.id}`, form);
        toast.success("Setting diperbarui");
      } else {
        await axios.post(`/api/school-settings`, { schoolId, key: form.key, type: form.type, value: form.value });
        toast.success("Setting ditambahkan");
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
            <ModalHeader>{form.id ? "Edit Setting" : "Tambah Setting"}</ModalHeader>
            <ModalBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Key" labelPlacement="outside" value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} />
              <Select label="Type" labelPlacement="outside" selectedKeys={new Set([form.type])} onSelectionChange={(keys) => {
                const k = Array.from(keys as Set<string>)[0] as any; setForm((f) => ({ ...f, type: k ?? "STRING" }));
              }} items={TYPES}>
                {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
              </Select>
              <Input label="Value" labelPlacement="outside" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
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
