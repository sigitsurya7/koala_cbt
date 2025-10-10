"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import axios from "axios";
import toast from "react-hot-toast";

type UserRow = { id: string; name: string; email: string; type: string };

type Props = {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  roleId: string | null;
  roleName?: string;
};

export default function RoleUsersModal({ isOpen, onOpenChange, roleId, roleName }: Props) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<UserRow[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const loadAssigned = async () => {
    if (!roleId) return;
    const res = await axios.get<{ users: Array<UserRow> }>(`/api/roles/${roleId}/users`);
    const ids = new Set((res.data.users || []).map((u) => u.id));
    setChecked(ids);
  };

  const loadUsers = async (query: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/users?page=1&perPage=50&q=${encodeURIComponent(query)}`);
      setItems(res.data.data || []);
    } catch {
      setItems([]);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (isOpen) {
      loadAssigned().catch(() => {});
      loadUsers("").catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, roleId]);

  const toggle = (id: string, on: boolean) => {
    setChecked((prev) => {
      const ns = new Set(prev);
      if (on) ns.add(id); else ns.delete(id);
      return ns;
    });
  };

  const save = async () => {
    if (!roleId) return;
    try {
      await axios.put(`/api/roles/${roleId}/users`, { userIds: Array.from(checked) });
      toast.success("User role diperbarui");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan user role");
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = items.filter((u) => (u.type || "").toUpperCase() !== "SISWA");
    if (!s) return base;
    return base.filter((u) => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
  }, [items, q]);

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur" size="lg">
      <ModalContent>
        {() => (
          <>
            <ModalHeader>Kelola User • {roleName || "Role"}</ModalHeader>
            <ModalBody>
              <Input size="sm" placeholder="Cari nama/email" value={q} onChange={(e) => setQ(e.target.value)} />
              <div className="max-h-[50vh] overflow-y-auto">
                {filtered.map((u) => (
                  <div key={u.id} className="py-1">
                    <Checkbox isSelected={checked.has(u.id)} onValueChange={(v) => toggle(u.id, v)}>
                      <span className="font-medium">{u.name}</span>
                      <span className="ml-2 text-xs opacity-60">{u.email}</span>
                      <span className="ml-2 text-xs opacity-60">({u.type})</span>
                    </Checkbox>
                  </div>
                ))}
                {loading && <div className="text-sm opacity-60">Memuat...</div>}
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
