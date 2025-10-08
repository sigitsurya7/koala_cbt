"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Switch } from "@heroui/react";
import axios from "axios";
import toast from "react-hot-toast";

export type RoleForm = {
  id?: string;
  name: string;
  key: string;
  scope: "GLOBAL" | "SCHOOL";
  schoolId?: string | null;
  isSystem?: boolean;
};

type RoleModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  initial?: RoleForm | null;
};

type School = { id: string; name: string; code: string };

function makeKeyFromName(name: string) {
  const words = name.trim().toLowerCase().replace(/[^a-z0-9\s]+/g, " ").split(/\s+/).filter(Boolean);
  if (words.length <= 1) return words[0] ?? "";
  return words.join("_");
}

export default function RoleModal({ isOpen, onOpenChange, onSaved, initial }: RoleModalProps) {
  const [form, setForm] = useState<RoleForm>({ name: "", key: "", scope: "SCHOOL", schoolId: null, isSystem: false });
  const [saving, setSaving] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);

  useEffect(() => {
    if (initial) setForm(initial);
    else setForm({ name: "", key: "", scope: "SCHOOL", schoolId: null, isSystem: false });
  }, [initial, isOpen]);

  useEffect(() => {
    // load schools for SCHOOL scope selection
    axios
      .get<{ schools: School[] }>("/api/schools?all=1")
      .then((res) => setSchools(res.data.schools))
      .catch(() => setSchools([]));
  }, []);

  const schoolItems = useMemo(() => schools.map((s) => ({ key: s.id, label: `${s.name} (${s.code})` })), [schools]);

  const save = async () => {
    setSaving(true);
    try {
      const payload: RoleForm = { ...form, key: makeKeyFromName(form.name) };
      if (payload.scope !== "SCHOOL") payload.schoolId = null;
      if (form.id) {
        await axios.put(`/api/roles/${form.id}`, payload);
        toast.success("Role diperbarui");
      } else {
        await axios.post(`/api/roles`, payload);
        toast.success("Role dibuat");
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan role");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur">
      <ModalContent>
        {() => (
          <>
            <ModalHeader>{form.id ? "Edit Role" : "Tambah Role"}</ModalHeader>
            <ModalBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nama" labelPlacement="outside" placeholder="Nama role" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, key: makeKeyFromName(e.target.value) }))} />
              <Input label="Key (otomatis)" labelPlacement="outside" isReadOnly value={makeKeyFromName(form.name)} />

              <Select label="Scope" labelPlacement="outside" selectedKeys={new Set([form.scope])}
                onSelectionChange={(keys) => {
                  const k = Array.from(keys as Set<string>)[0] as "GLOBAL" | "SCHOOL" | undefined;
                  setForm((f) => ({ ...f, scope: k ?? "SCHOOL" }));
                }}
                items={[{ key: "GLOBAL", label: "GLOBAL" }, { key: "SCHOOL", label: "SCHOOL" }]}
              >
                {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
              </Select>

              {form.scope === "SCHOOL" && (
                <Select label="Sekolah" labelPlacement="outside"
                  selectedKeys={new Set(form.schoolId ? [form.schoolId] : [])}
                  onSelectionChange={(keys) => {
                    const k = Array.from(keys as Set<string>)[0];
                    setForm((f) => ({ ...f, schoolId: k ?? null }));
                  }}
                  items={schoolItems}
                >
                  {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
                </Select>
              )}

              <div className="flex items-center gap-3">
                <Switch isSelected={!!form.isSystem} onValueChange={(v) => setForm((f) => ({ ...f, isSystem: v }))}>System?</Switch>
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
