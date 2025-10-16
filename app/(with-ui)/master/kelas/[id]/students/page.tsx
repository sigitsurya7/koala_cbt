"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { Button, Chip, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Switch } from "@heroui/react";
import DataTable, { type FetchParams, type Paged } from "@/components/DataTable";
import toast from "react-hot-toast";
import { FaCheck, FaUncharted } from "react-icons/fa";
import { MdRadioButtonChecked, MdRadioButtonUnchecked } from "react-icons/md";
import { FiEdit, FiTrash2 } from "react-icons/fi";
import { useApp } from "@/stores/useApp";

type Row = { userId: string; name: string; username?: string | null; email?: string | null; nis?: string | null; status?: string | null };

export default function ClassStudentsPage() {
  const params = useParams<{ id: string }>();
  const classId = params?.id as string;
  const [reloadKey, setReloadKey] = useState(0);
  const [className, setClassName] = useState<string>("");
  const app = useApp();
  const isSuperAdmin = !!app.user?.isSuperAdmin;

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [target, setTarget] = useState<Row | null>(null);
  const [fUsername, setFUsername] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fNis, setFNis] = useState("");
  const [fStatus, setFStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!classId) return;
    axios.get(`/api/classes/${classId}`).then((r) => setClassName(r.data?.name || ""))
      .catch(() => setClassName(""));
  }, [classId]);

  const toggleActive = async (r: Row, v: boolean) => {
    try {
      await axios.patch(`/api/classes/${classId}/students`, { userId: r.userId, active: v });
      toast.success("Status diperbarui");
      setReloadKey((k) => k + 1);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal memperbarui status");
    }
  };

  const openEdit = async (r: Row) => {
    try {
      const res = await axios.get(`/api/users/${r.userId}/detail`);
      const u = res.data?.user || {};
      const sd = res.data?.studentDetail || {};
      setTarget(r);
      setFUsername(u.username || "");
      setFEmail(u.email || "");
      setFNis(sd.nis || "");
      setFStatus(sd.status || null);
      setEditOpen(true);
    } catch { toast.error("Gagal memuat data"); }
  };

  const saveEdit = async () => {
    if (!target) return;
    try {
      // Update username/email
      await axios.put(`/api/users/${target.userId}`, { username: fUsername || null, email: fEmail || null });
      // Update student detail (nis/status)
      await axios.put(`/api/users/${target.userId}/detail`, { studentDetail: { nis: fNis || null, status: fStatus || null } });
      toast.success("Tersimpan");
      setEditOpen(false);
      setReloadKey((k) => k + 1);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan");
    }
  };

  const [emptyOpen, setEmptyOpen] = useState(false);
  const emptyClass = () => {
    if (!isSuperAdmin) return;
    setEmptyOpen(true);
  };
  const confirmEmpty = async () => {
    try {
      const r = await axios.post(`/api/classes/${classId}/empty`);
      toast.success(`Kelas dikosongkan (${r.data?.deleted || 0} siswa)`);
      setReloadKey((k) => k + 1);
      setEmptyOpen(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal mengosongkan kelas");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Siswa Kelas</h1>
          {className && <p className="text-sm opacity-70">Kelas: {className}</p>}
        </div>
        {isSuperAdmin && (
          <Button color="danger" variant="flat" onPress={emptyClass}>Kosongkan Kelas</Button>
        )}
      </div>

      <DataTable<Row>
        externalReloadKey={reloadKey + classId}
        searchPlaceholder="Cari siswa..."
        columns={[
          { key: "name", header: "Nama" },
          { key: "username", header: "Username", render: (r) => r.username || '-' },
          { key: "nis", header: "NIS", render: (r) => (<span className="font-mono text-xs">{r.nis || "-"}</span>) },
          { key: "status", header: "Status", render: (r) => (
            <div className="flex items-center gap-3">
              <Switch
                isSelected={(r.status || '').toUpperCase() === 'AKTIF'}
                onValueChange={(v) => toggleActive(r, v)}
                thumbIcon={({isSelected, className}) =>
                  isSelected ? <MdRadioButtonChecked /> : <MdRadioButtonUnchecked />
                }
              >&nbsp;</Switch>
            </div>
          ) },
          { key: "actions", header: "Aksi", render: (r) => (
            <div className="flex items-center gap-3">
              <Button isIconOnly size="sm" variant="flat" onPress={() => openEdit(r)}><FiEdit /></Button>
            </div>
          ) },
        ]}
        rowKey={(r) => r.userId}
        fetchData={async ({ page, perPage, q }: FetchParams): Promise<Paged<Row>> => {
          const res = await axios.get(`/api/classes/${classId}/students?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}`);
          return res.data as Paged<Row>;
        }}
      />

      {/* Confirm Empty Class */}
      <Modal isOpen={emptyOpen} onOpenChange={setEmptyOpen} backdrop="blur">
        <ModalContent>
          {() => (
            <>
              <ModalHeader>Kosongkan Kelas</ModalHeader>
              <ModalBody>
                <p className="text-sm">Tindakan ini akan menghapus SEMUA siswa pada kelas ini beserta data terkait (User, StudentDetail, Attempt, Answer). Tindakan tidak dapat dibatalkan.</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={() => setEmptyOpen(false)}>Batal</Button>
                <Button color="danger" onPress={confirmEmpty}>Kosongkan</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Edit Student Modal */}
      <Modal isOpen={editOpen} onOpenChange={setEditOpen} backdrop="blur">
        <ModalContent>
          {() => (
            <>
              <ModalHeader>Edit Siswa</ModalHeader>
              <ModalBody className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="Username" value={fUsername} onChange={(e) => setFUsername(e.target.value)} />
                <Input type="email" label="Email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} />
                <Input label="NIS" value={fNis} onChange={(e) => setFNis(e.target.value)} />
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={() => setEditOpen(false)}>Batal</Button>
                <Button color="primary" onPress={saveEdit}>Simpan</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
