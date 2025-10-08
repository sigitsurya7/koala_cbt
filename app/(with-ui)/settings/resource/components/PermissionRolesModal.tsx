"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import axios from "axios";
import toast from "react-hot-toast";

type Role = { id: string; name: string; key: string; scope?: string | null; schoolName?: string | null };

type Props = {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  permissionId: string | null;
  permissionName?: string | null;
  onSaved: () => void;
};

export default function PermissionRolesModal({ isOpen, onOpenChange, permissionId, permissionName, onSaved }: Props) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  const load = async () => {
    if (!permissionId) return;
    const [allRes, assignedRes] = await Promise.all([
      axios.get<{ roles: Role[] }>("/api/roles?all=1"),
      axios.get<{ roles: Array<{ id: string; name: string; key: string }> }>(`/api/permissions/${permissionId}/roles`),
    ]);
    setRoles(allRes.data.roles);
    setChecked(new Set(assignedRes.data.roles.map((r) => r.id)));
  };

  useEffect(() => {
    if (isOpen) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, permissionId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return roles;
    return roles.filter((r) => r.name.toLowerCase().includes(s) || r.key.toLowerCase().includes(s) || (r.schoolName || "").toLowerCase().includes(s));
  }, [roles, q]);

  const toggle = (id: string, on: boolean) => {
    setChecked((prev) => {
      const ns = new Set(prev);
      if (on) ns.add(id);
      else ns.delete(id);
      return ns;
    });
  };

  const save = async () => {
    if (!permissionId) return;
    try {
      await axios.put(`/api/permissions/${permissionId}/roles`, { roleIds: Array.from(checked) });
      toast.success("Role permission disimpan");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan");
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur">
      <ModalContent>
        {() => (
          <>
            <ModalHeader>Kelola Role — {permissionName ?? "Resource"}</ModalHeader>
            <ModalBody>
              <Input size="sm" placeholder="Cari role..." value={q} onChange={(e) => setQ(e.target.value)} />
              <div className="max-h-[60vh] overflow-y-auto">
                {filtered.map((r) => (
                  <div key={r.id} className="py-1">
                    <Checkbox isSelected={checked.has(r.id)} onValueChange={(v) => toggle(r.id, v)}>
                      <span className="font-medium">{r.name}</span>
                      <span className="ml-2 text-xs opacity-60">{r.key}</span>
                      {r.schoolName && <span className="ml-2 text-xs opacity-60">— {r.schoolName}</span>}
                    </Checkbox>
                  </div>
                ))}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={() => onOpenChange(false)}>Batal</Button>
              <Button color="primary" onPress={save}>Simpan</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
