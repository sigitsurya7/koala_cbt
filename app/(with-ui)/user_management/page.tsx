"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Button, Chip, Input, Select, SelectItem, Switch } from "@heroui/react";
import { useApp } from "@/stores/useApp";
import DataTable, { type FetchParams, type Paged } from "@/components/DataTable";
import ConfirmModal from "@/components/ConfirmModal";
import { FiEdit, FiPlus, FiTrash, FiUpload, FiDownload } from "react-icons/fi";
import toast from "react-hot-toast";
import UserDetailModal from "./components/UserDetailModal";
import ImportModal from "./components/ImportModal";

type RoleOption = { id: string; name: string; key: string; schoolId: string | null };

type UserRow = {
  id: string;
  name: string;
  email: string;
  type: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  schoolId?: string | null;
  schoolName?: string | null;
  roleId?: string | null;
  roleName?: string | null;
};

type FormState = {
  id?: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  type: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  schoolId: string | null;
  roleId: string | null;
};

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  username: "",
  password: "",
  type: "SISWA",
  isSuperAdmin: false,
  isActive: true,
  schoolId: null,
  roleId: null,
};

const USER_TYPES = [
  { key: "SISWA", label: "SISWA" },
  { key: "GURU", label: "GURU" },
  { key: "STAFF", label: "STAFF" },
  { key: "ADMIN", label: "ADMIN" },
];

export default function UserManagementPage() {
  const app = useApp();
  const currentUserIsSuperAdmin = !!app.user?.isSuperAdmin;
  const [reloadKey, setReloadKey] = useState(0);
  const [isOpen, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [target, setTarget] = useState<UserRow | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<UserRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const defaultSchoolId = useMemo(
    () => app.activeSchoolId || app.schools?.[0]?.id || null,
    [app.activeSchoolId, app.schools],
  );

  const roleSchoolId = form.isSuperAdmin ? null : form.schoolId || defaultSchoolId;

  useEffect(() => {
    if (!isOpen || !roleSchoolId) {
      if (!roleSchoolId) setRoles([]);
      return;
    }
    axios
      .get<{ roles: RoleOption[] }>(`/api/roles?all=1&schoolId=${roleSchoolId}`)
      .then((res) => {
        const filtered = (res.data.roles || []).filter(
          (r) => r.key?.toUpperCase() !== "SISWA",
        );
        setRoles(filtered);
      })
      .catch(() => setRoles([]));
  }, [roleSchoolId, isOpen]);

  useEffect(() => {
    if (!isOpen || form.isSuperAdmin) return;
    if (!form.schoolId && defaultSchoolId) {
      setForm((f) => ({ ...f, schoolId: defaultSchoolId }));
    }
  }, [isOpen, form.isSuperAdmin, defaultSchoolId]);

  useEffect(() => {
    if (!isOpen) return;
    if (form.isSuperAdmin || form.type === "SISWA") {
      if (form.roleId !== null) {
        setForm((f) => ({ ...f, roleId: null }));
      }
      return;
    }
    if (roles.length === 0) {
      setForm((f) => ({ ...f, roleId: null }));
      return;
    }
    if (!form.roleId || !roles.some((r) => r.id === form.roleId)) {
      setForm((f) => ({ ...f, roleId: roles[0]?.id ?? null }));
    }
  }, [roles, form.type, form.isSuperAdmin, form.roleId, isOpen]);

  const openCreate = () => {
    setForm({
      ...INITIAL_FORM,
      schoolId: defaultSchoolId,
    });
    setOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setForm({
      id: u.id,
      name: u.name,
      email: u.email,
      username: undefined,
      password: "",
      type: u.isSuperAdmin ? "ADMIN" : u.type,
      isSuperAdmin: u.isSuperAdmin,
      isActive: u.isActive,
      schoolId: u.isSuperAdmin ? null : u.schoolId ?? defaultSchoolId,
      roleId: u.roleId ?? null,
    });
    setOpen(true);
  };

  const askRemove = (u: UserRow) => {
    setTarget(u);
    setConfirmOpen(true);
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      toast.error("Nama wajib diisi");
      return false;
    }
    if (!form.email.trim()) {
      toast.error("Email wajib diisi");
      return false;
    }
    if (!form.id && !form.password) {
      toast.error("Password wajib diisi");
      return false;
    }
    if (!form.isSuperAdmin) {
      if (!form.schoolId) {
        toast.error("Sekolah wajib dipilih");
        return false;
      }
      if (form.type !== "SISWA" && !form.roleId) {
        toast.error("Role wajib dipilih");
        return false;
      }
    }
    return true;
  };

  const save = async () => {
    if (!validateForm()) return;
    try {
      if (form.id) {
        const payload: Record<string, any> = {
          name: form.name,
          email: form.email,
          type: form.isSuperAdmin ? "ADMIN" : form.type,
          isSuperAdmin: form.isSuperAdmin,
          isActive: form.isActive,
          schoolId: form.isSuperAdmin ? null : form.schoolId,
        };
        if (!form.isSuperAdmin && form.type !== "SISWA") {
          payload.roleId = form.roleId;
        }
        if (form.password) payload.password = form.password;
        await axios.put(`/api/users/${form.id}`, payload);
        toast.success("User diperbarui");
      } else {
        const payload: Record<string, any> = {
          name: form.name,
          email: form.email,
          password: form.password,
          type: form.isSuperAdmin ? "ADMIN" : form.type,
          isSuperAdmin: form.isSuperAdmin,
          isActive: form.isActive,
        };
        if (form.username?.trim()) {
          payload.username = form.username.trim();
        }
        if (!form.isSuperAdmin) {
          payload.schoolId = form.schoolId;
          if (form.type !== "SISWA") payload.roleId = form.roleId;
        }
        await axios.post(`/api/users`, payload);
        toast.success("User ditambahkan");
      }
      setOpen(false);
      setForm(INITIAL_FORM);
      setReloadKey((k) => k + 1);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan user");
    }
  };

  const columns = useMemo(() => {
    const base = [
      { key: "name", header: "Nama" },
      {
        key: "email",
        header: "Email",
        render: (u: UserRow) => <span className="font-mono text-xs">{u.email}</span>,
      },
      { key: "type", header: "Tipe" },
      { key: "schoolName", header: "Sekolah" },
      {
        key: "isActive",
        header: "Aktif",
        render: (u: UserRow) => (
          <Chip size="sm" color={u.isActive ? "success" : "default"} variant="flat">
            {u.isActive ? "Aktif" : "Nonaktif"}
          </Chip>
        ),
      },
    ];
    if (currentUserIsSuperAdmin) {
      base.splice(4, 0, {
        key: "isSuperAdmin",
        header: "SuperAdmin",
        render: (u: UserRow) => (
          <Chip size="sm" color={u.isSuperAdmin ? "secondary" : "default"} variant="flat">
            {u.isSuperAdmin ? "Ya" : "Tidak"}
          </Chip>
        ),
      });
    }
    base.push({
      key: "actions",
      header: "Aksi",
      render: (u: UserRow) => (
        <div className="flex gap-2">
          <Button size="sm" startContent={<FiEdit />} variant="flat" onPress={() => openEdit(u)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="flat"
            onPress={() => {
              setDetailUser(u);
              setDetailOpen(true);
            }}
          >
            Detail
          </Button>
          <Button
            size="sm"
            startContent={<FiTrash />}
            color="danger"
            variant="flat"
            onPress={() => askRemove(u)}
          >
            Hapus
          </Button>
        </div>
      ),
    });
    return base;
  }, [currentUserIsSuperAdmin]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">User Management</h1>
          <p className="text-sm opacity-70">Tambah, edit, dan hapus user.</p>
        </div>
      </div>

      <DataTable<UserRow>
        externalReloadKey={reloadKey}
        searchPlaceholder="Cari user by nama atau email..."
        columns={columns}
        rowKey={(u) => u.id}
        fetchData={async ({ page, perPage, q }: FetchParams): Promise<Paged<UserRow>> => {
          const res = await axios.get(
            `/api/users?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}`,
          );
          return res.data as Paged<UserRow>;
        }}
        toolbarRight={
          <div className="flex gap-2">
            <Button
              startContent={<FiDownload />}
              color="success"
              variant="flat"
              onPress={async () => {
                try {
                  toast.loading("Menyiapkan template...", { id: "dl" });
                  setImportOpen(true);
                } catch {
                  // ignore
                } finally {
                  toast.dismiss("dl");
                }
              }}
            >
              Download Template
            </Button>
            <Button
              startContent={<FiUpload />}
              color="secondary"
              variant="flat"
              onPress={() => setImportOpen(true)}
            >
              Import Data
            </Button>
            <Button color="primary" startContent={<FiPlus />} onPress={openCreate}>
              Tambah User
            </Button>
          </div>
        }
      />

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-content1 rounded-2xl p-4 w-full max-w-lg space-y-3">
            <h3 className="text-lg font-semibold">{form.id ? "Edit User" : "Tambah User"}</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nama"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              <Input
                label="Username"
                value={form.username ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              />
              <Input
                label="Password"
                type="password"
                value={form.password ?? ""}
                placeholder={form.id ? "Kosongkan bila tidak diubah" : "••••••"}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
              <Select
                label="Tipe User"
                selectedKeys={new Set([form.type])}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys as Set<string>)[0];
                  setForm((f) => ({
                    ...f,
                    type: f.isSuperAdmin ? "ADMIN" : key ?? f.type,
                  }));
                }}
                isDisabled={form.isSuperAdmin}
              >
                {USER_TYPES.map((item) => (
                  <SelectItem key={item.key}>{item.label}</SelectItem>
                ))}
              </Select>

              {!form.isSuperAdmin && (
                <Select
                  label="Sekolah"
                  selectedKeys={form.schoolId ? new Set([form.schoolId]) : new Set([])}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys as Set<string>)[0] ?? null;
                    setForm((f) => ({ ...f, schoolId: key, roleId: null }));
                  }}
                >
                  {app.schools.map((s) => (
                    <SelectItem key={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </Select>
              )}

              {!form.isSuperAdmin && form.type !== "SISWA" && (
                <Select
                  label="Role"
                  selectedKeys={form.roleId ? new Set([form.roleId]) : new Set([])}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys as Set<string>)[0] ?? null;
                    setForm((f) => ({ ...f, roleId: key }));
                  }}
                  isDisabled={roles.length === 0}
                  placeholder={roles.length === 0 ? "Role tidak tersedia" : undefined}
                >
                  {roles.map((r) => (
                    <SelectItem key={r.id}>{r.name}</SelectItem>
                  ))}
                </Select>
              )}

              {currentUserIsSuperAdmin && (
                <div className="flex items-center gap-3">
                  <Switch
                    isSelected={form.isSuperAdmin}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        isSuperAdmin: v,
                        type: v ? "ADMIN" : f.type === "ADMIN" ? "SISWA" : f.type,
                        schoolId: v ? null : f.schoolId ?? defaultSchoolId,
                        roleId: null,
                      }))
                    }
                  >
                    SuperAdmin
                  </Switch>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Switch
                  isSelected={form.isActive}
                  onValueChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                >
                  Aktif
                </Switch>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="flat"
                onPress={() => {
                  setOpen(false);
                  setForm(INITIAL_FORM);
                }}
              >
                Batal
              </Button>
              <Button color="primary" onPress={save}>
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hapus User"
        description={target ? `Yakin menghapus user "${target.name}"?` : undefined}
        confirmLabel="Hapus"
        confirmColor="danger"
        onConfirm={async () => {
          if (!target) return;
          try {
            await axios.delete(`/api/users/${target.id}`);
            setReloadKey((k) => k + 1);
            toast.success("User dihapus");
          } catch (e: any) {
            toast.error(e?.response?.data?.message || "Gagal menghapus user");
          }
        }}
      />

      <UserDetailModal isOpen={detailOpen} onOpenChange={setDetailOpen} user={detailUser} />
      <ImportModal isOpen={importOpen} onOpenChange={setImportOpen} onImported={() => setReloadKey((k) => k + 1)} />
    </div>
  );
}

