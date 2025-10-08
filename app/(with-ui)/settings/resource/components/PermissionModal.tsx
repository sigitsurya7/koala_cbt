"use client";

import { useEffect, useState } from "react";
import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem } from "@heroui/react";
import axios from "axios";
import toast from "react-hot-toast";

export type PermissionForm = {
  id?: string;
  name: string;
  action: "READ" | "CREATE" | "UPDATE" | "DELETE";
  resource: string;
};

type Props = {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  initial?: PermissionForm | null;
};

const ACTION_ITEMS = [
  { key: "READ", label: "READ" },
  { key: "CREATE", label: "CREATE" },
  { key: "UPDATE", label: "UPDATE" },
  { key: "DELETE", label: "DELETE" },
];

export default function PermissionModal({ isOpen, onOpenChange, onSaved, initial }: Props) {
  const [form, setForm] = useState<PermissionForm>({ name: "", action: "READ", resource: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) setForm(initial);
    else setForm({ name: "", action: "READ", resource: "" });
  }, [initial, isOpen]);

  const save = async () => {
    setSaving(true);
    try {
      if (form.id) {
        await axios.put(`/api/permissions/${form.id}`, form);
        toast.success("Permission diperbarui");
      } else {
        await axios.post(`/api/permissions`, form);
        toast.success("Permission dibuat");
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
            <ModalHeader>{form.id ? "Edit Permission" : "Tambah Permission"}</ModalHeader>
            <ModalBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nama" labelPlacement="outside" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <Select
                label="Action"
                labelPlacement="outside"
                selectedKeys={new Set([form.action])}
                onSelectionChange={(keys) => {
                  const k = Array.from(keys as Set<string>)[0] as PermissionForm["action"] | undefined;
                  setForm((f) => ({ ...f, action: (k ?? "READ") as PermissionForm["action"] }));
                }}
                items={ACTION_ITEMS}
              >
                {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
              </Select>
              <Input
                label="Resource"
                labelPlacement="outside"
                placeholder="Contoh: API/GET_DATA_NILAI"
                value={form.resource}
                onChange={(e) => setForm((f) => ({ ...f, resource: e.target.value }))}
              />
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
