"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import axios from "axios";
import toast from "react-hot-toast";

type MenuItem = {
  id: string;
  name: string;
  parentId?: string | null;
  path: string;
  icon?: string | null;
  isActive: boolean;
  order: number;
  checked?: boolean;
};

type RoleMenuModalProps = {
  roleId: string | null;
  roleName?: string;
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
};

export default function RoleMenuModal({ roleId, roleName, isOpen, onOpenChange, onSaved }: RoleMenuModalProps) {
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const load = async () => {
    if (!roleId) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/roles/${roleId}/menus`);
      const items = res.data.menus as MenuItem[];
      setMenus(items);
      const initial = new Set(items.filter((m) => m.checked).map((m) => m.id));
      setChecked(initial);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, roleId]);

  // Build tree for display
  const tree = useMemo(() => {
    const nodes = menus.map((m) => ({ ...m, children: [] as MenuItem[] }));
    const map = new Map(nodes.map((n) => [n.id, n]));
    const roots: (typeof nodes)[number][] = [];
    for (const n of nodes) {
      if (n.parentId && map.has(n.parentId)) map.get(n.parentId)!.children.push(n);
      else roots.push(n);
    }
    const sortRec = (arr: any[]) => {
      arr.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
      for (const c of arr) sortRec(c.children);
    };
    sortRec(roots);
    return roots;
  }, [menus]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return tree;
    // filter: include nodes if self or any desc matches; show with original structure
    const filterRec = (arr: any[]): any[] => {
      const out: any[] = [];
      for (const n of arr) {
        const match = n.name.toLowerCase().includes(qq) || n.path.toLowerCase().includes(qq);
        const kids = filterRec(n.children);
        if (match || kids.length > 0) out.push({ ...n, children: kids });
      }
      return out;
    };
    return filterRec(tree);
  }, [q, tree]);

  const toggle = (id: string, on: boolean) => {
    setChecked((prev) => {
      const ns = new Set(prev);
      if (on) ns.add(id);
      else ns.delete(id);
      return ns;
    });
  };

  const save = async () => {
    if (!roleId) return;
    try {
      const menuIds = Array.from(checked);
      await axios.put(`/api/roles/${roleId}/menus`, { menuIds });
      toast.success("Menu role disimpan");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan");
    }
  };

  const renderNode = (node: any, depth = 0) => (
    <div key={node.id} className="flex items-center gap-2 py-1" style={{ paddingLeft: depth * 16 }}>
      <Checkbox
        isSelected={checked.has(node.id)}
        onValueChange={(v) => toggle(node.id, v)}
      >
        <span className="font-medium">{node.name}</span>
        <span className="ml-2 text-xs opacity-60">{node.path}</span>
      </Checkbox>
      {node.children?.length > 0 && (
        <div className="flex flex-col w-full">
          {node.children.map((c: any) => renderNode(c, depth + 1))}
        </div>
      )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg" backdrop="blur">
      <ModalContent>
        {() => (
          <>
            <ModalHeader>Kelola Menu — {roleName ?? "Role"}</ModalHeader>
            <ModalBody>
              <Input size="sm" placeholder="Cari menu..." value={q} onChange={(e) => setQ(e.target.value)} />
              <div className="max-h-[60vh] overflow-y-auto">
                {filtered.map((n) => renderNode(n))}
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
