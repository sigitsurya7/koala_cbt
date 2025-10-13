"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Button, Input, Select, SelectItem, Switch, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Textarea, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import DataTable, { type FetchParams, type Paged } from "@/components/DataTable";
import ConfirmModal from "@/components/ConfirmModal";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { FiEdit, FiTrash, FiUpload, FiPlus } from "react-icons/fi";
import QuestionImportModal from "./components/QuestionImportModal";
import { useApp } from "@/stores/useApp";

type Department = { id: string; name: string };
type SubjectRow = { id: string; schoolId: string; departmentId?: string | null; departmentName?: string | null; name: string; grade?: number | null };

export default function BankSoalPage() {
  const router = useRouter();
  const app = useApp();
  const isSuperAdmin = !!app.user?.isSuperAdmin;
  const schools = useMemo(() => app.schools || [], [app.schools]);
  const activeSchoolId = app.activeSchoolId || "";
  const [departments, setDepartments] = useState<Department[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  // Subject modal
  const [isSubjectOpen, setSubjectOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectRow | null>(null);
  const [subjectForm, setSubjectForm] = useState<SubjectRow | null>(null);

  // Delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [target, setTarget] = useState<SubjectRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importSubject, setImportSubject] = useState<SubjectRow | null>(null);

  // Question modal
  const [questionOpen, setQuestionOpen] = useState(false);
  const [qSubject, setQSubject] = useState<SubjectRow | null>(null);
  const [qType, setQType] = useState<"MCQ" | "ESSAY">("MCQ");
  const [qText, setQText] = useState("");
  const [qOpts, setQOpts] = useState<Array<{ key: string; text: string }>>([
    { key: "A", text: "" },
    { key: "B", text: "" },
    { key: "C", text: "" },
    { key: "D", text: "" },
  ]);
  const [qCorrect, setQCorrect] = useState<string>("A");
  const [qPoints, setQPoints] = useState<number>(1);
  const [qDifficulty, setQDifficulty] = useState<number>(1);

  const setActiveSchool = app.setActiveSchool;

  useEffect(() => {
    if (isSuperAdmin && !activeSchoolId && schools.length > 0) {
      setActiveSchool(schools[0].id).catch(() => {});
    }
  }, [isSuperAdmin, activeSchoolId, schools, setActiveSchool]);

  const schoolId = useMemo(() => {
    if (activeSchoolId) return activeSchoolId;
    if (isSuperAdmin && schools.length > 0) return schools[0].id;
    return "";
  }, [activeSchoolId, isSuperAdmin, schools]);

  useEffect(() => {
    if (!schoolId) return;
    axios
      .get(`/api/departments?all=1&schoolId=${schoolId}`)
      .then((r) => {
        const items = (r.data.items || r.data.data || []) as any[];
        setDepartments(items.map((i) => ({ id: i.id, name: i.name })));
      })
      .catch(() => setDepartments([]));
  }, [schoolId]);

  useEffect(() => {
    if (!isSubjectOpen || editing || !schoolId) return;
    setSubjectForm((prev) => (prev ? { ...prev, schoolId } : prev));
  }, [isSubjectOpen, editing, schoolId]);

  useEffect(() => {
    if (!schoolId) {
      setSubjectOpen(false);
      setQuestionOpen(false);
      setImportOpen(false);
      return;
    }
    if (isSubjectOpen && editing && editing.schoolId !== schoolId) {
      setSubjectOpen(false);
      setEditing(null);
      setSubjectForm(null);
    }
    if (questionOpen && qSubject && qSubject.schoolId !== schoolId) {
      setQuestionOpen(false);
      setQSubject(null);
    }
    if (importOpen && importSubject && importSubject.schoolId !== schoolId) {
      setImportOpen(false);
      setImportSubject(null);
    }
  }, [schoolId, isSubjectOpen, questionOpen, importOpen, editing, qSubject, importSubject]);

  const schoolItems = useMemo(() => schools.map((s) => ({ key: s.id, label: `${s.name} (${s.code})` })), [schools]);
  const deptItems = useMemo(() => departments.map((d) => ({ key: d.id, label: d.name })), [departments]);

  const openCreateSubject = () => {
    if (!schoolId) {
      toast.error("Sekolah belum dipilih");
      return;
    }
    setSubjectForm({ id: "", schoolId, departmentId: null, departmentName: null, name: "", grade: null } as any);
    setEditing(null);
    setSubjectOpen(true);
  };
  const openEditSubject = (s: SubjectRow) => { setSubjectForm({ ...s }); setEditing(s); setSubjectOpen(true); };
  const askRemove = (s: SubjectRow) => { setTarget(s); setConfirmOpen(true); };

  const saveSubject = async () => {
    if (!subjectForm) return;
    if (!schoolId) {
      toast.error("Sekolah belum dipilih");
      return;
    }
    try {
      if (editing) {
        await axios.put(`/api/subjects/${editing.id}`, { name: subjectForm.name, departmentId: subjectForm.departmentId || null, grade: subjectForm.grade ?? null, schoolId });
        toast.success("Mapel diperbarui");
      } else {
        await axios.post(`/api/subjects`, { name: subjectForm.name, departmentId: subjectForm.departmentId || null, grade: subjectForm.grade ?? null, schoolId });
        toast.success("Mapel ditambahkan");
      }
      setSubjectOpen(false); setReloadKey((k) => k + 1);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan");
    }
  };

  const openQuestion = (s: SubjectRow) => { router.push(`/master/bank_soal/${s.id}`); };
  const saveQuestion = async () => {
    if (!qSubject) return;
    if (!schoolId) {
      toast.error("Sekolah belum dipilih");
      return;
    }
    try {
      const payload: any = { subjectId: qSubject.id, type: qType, text: qText, points: qPoints, difficulty: qDifficulty };
      if (qType === "MCQ") {
        payload.options = qOpts.map((o) => ({ key: o.key, text: o.text }));
        payload.correctKey = qCorrect;
      }
      payload.schoolId = schoolId;
      await axios.post(`/api/questions`, payload);
      toast.success("Soal dibuat");
      setQuestionOpen(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal membuat soal");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Bank Soal</h1>
          <p className="text-sm opacity-70">Kelola mata pelajaran dan buat soal berdasarkan mapel.</p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <Select
              selectedKeys={schoolId ? new Set([schoolId]) : new Set([])}
              onSelectionChange={(keys) => {
                const k = Array.from(keys as Set<string>)[0];
                if (k) {
                  setActiveSchool(String(k)).catch(() => {
                    toast.error("Gagal mengganti sekolah aktif");
                  });
                }
              }}
              items={schoolItems}
            >
              {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
            </Select>
          )}
        </div>
      </div>

      {schoolId && (
        <DataTable<SubjectRow>
          externalReloadKey={`${reloadKey}-${schoolId}`}
          searchPlaceholder="Cari mapel..."
          columns={[
            { key: "name", header: "Mapel" },
            { key: "grade", header: "Grade" },
            { key: "departmentName", header: "Jurusan" },
            { key: "actions", header: "Aksi", render: (s) => (
              <Dropdown>
                <DropdownTrigger>
                  <Button size="sm" variant="flat">Aksi</Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="Aksi Mapel" onAction={(key) => {
                  if (key === 'edit') openEditSubject(s);
                  if (key === 'buat') openQuestion(s);
                  if (key === 'import') {
                    if (!schoolId) {
                      toast.error("Sekolah belum dipilih");
                      return;
                    }
                    setImportSubject(s);
                    setImportOpen(true);
                  }
                  if (key === 'hapus') askRemove(s);
                }}>
                  <DropdownItem key="edit" startContent={<FiEdit />}>Edit</DropdownItem>
                  <DropdownItem key="buat" startContent={<FiPlus />}>Buat Soal</DropdownItem>
                  <DropdownItem key="import" startContent={<FiUpload />} isDisabled={!schoolId}>Import Excel</DropdownItem>
                  <DropdownItem key="hapus" startContent={<FiTrash />} className="text-danger" color="danger">Hapus</DropdownItem>
                </DropdownMenu>
              </Dropdown>
            ) },
          ]}
          rowKey={(s) => s.id}
          fetchData={async ({ page, perPage, q }: FetchParams): Promise<Paged<SubjectRow>> => {
            if (!schoolId) {
              return { data: [], page, perPage, total: 0, totalPages: 0 } as Paged<SubjectRow>;
            }
            const res = await axios.get(`/api/subjects?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}&schoolId=${schoolId}`);
            return res.data as Paged<SubjectRow>;
          }}
          toolbarRight={<Button color="primary" onPress={openCreateSubject} isDisabled={!schoolId}>Tambah Mapel</Button>}
        />
      )}

      {/* Subject Modal */}
      {isSubjectOpen && (
        <Modal isOpen={isSubjectOpen} onOpenChange={setSubjectOpen} backdrop="blur">
          <ModalContent>
            {() => (
              <>
                <ModalHeader>{editing ? "Edit Mapel" : "Tambah Mapel"}</ModalHeader>
                <ModalBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Nama Mapel" labelPlacement="outside" value={subjectForm?.name ?? ""} onChange={(e) => setSubjectForm((f) => ({ ...(f as any), name: e.target.value }))} />
                  <Input type="number" label="Grade" max={12} labelPlacement="outside" value={subjectForm?.grade != null ? String(subjectForm?.grade) : ""} onChange={(e) => setSubjectForm((f) => ({ ...(f as any), grade: e.target.value ? Number(e.target.value) : null }))} />
                  <Select label="Jurusan (opsional)" labelPlacement="outside" selectedKeys={new Set(subjectForm?.departmentId ? [subjectForm.departmentId] : [])} onSelectionChange={(keys) => { const k = Array.from(keys as Set<string>)[0]; setSubjectForm((f) => ({ ...(f as any), departmentId: k === "none" ? null : (k ?? null) })); }} items={[{ key: "none", label: "(Tidak ada)" }, ...deptItems]}>
                    {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
                  </Select>
                  <Input isReadOnly label="Sekolah" labelPlacement="outside" value={schools.find((s) => s.id === (subjectForm?.schoolId || schoolId))?.name || "-"} />
                </ModalBody>
                <ModalFooter>
                  <Button variant="flat" onPress={() => setSubjectOpen(false)}>Batal</Button>
                  <Button color="primary" onPress={saveSubject}>Simpan</Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Hapus Mapel"
        description={target ? `Yakin menghapus mapel "${target.name}"?` : undefined}
        confirmLabel="Hapus"
        confirmColor="danger"
        onConfirm={async () => {
          if (!target) return;
          if (!schoolId) {
            toast.error("Sekolah belum dipilih");
            return;
          }
          try {
            await axios.delete(`/api/subjects/${target.id}${schoolId ? `?schoolId=${schoolId}` : ""}`);
            setReloadKey((k) => k + 1);
            toast.success("Mapel dihapus");
          } catch (e: any) {
            toast.error(e?.response?.data?.message || "Gagal menghapus mapel");
          }
        }}
      />

      <QuestionImportModal
        isOpen={importOpen}
        onOpenChange={setImportOpen}
        subjectId={importSubject?.id ?? null}
        subjectName={importSubject?.name}
        schoolId={schoolId}
        onImported={() => setReloadKey((k) => k + 1)}
      />

      {/* Question Modal */}
      {questionOpen && (
        <Modal isOpen={questionOpen} onOpenChange={setQuestionOpen} size="lg" backdrop="blur">
          <ModalContent>
            {() => (
              <>
                <ModalHeader>Buat Soal {qSubject ? `- ${qSubject.name}` : ""}</ModalHeader>
                <ModalBody className="grid grid-cols-1 gap-4">
                  <Select label="Tipe Soal" selectedKeys={new Set([qType])} onSelectionChange={(keys) => { const k = Array.from(keys as Set<string>)[0] as any; setQType((k || "MCQ") as any); }} items={[{ key: "MCQ", label: "Pilihan Ganda" }, { key: "ESSAY", label: "Essay" }]}>
                    {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
                  </Select>
                  <Textarea label="Teks Soal" labelPlacement="outside" value={qText} onChange={(e) => setQText(e.target.value)} minRows={3} />
                  {qType === "MCQ" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {qOpts.map((o, idx) => (
                        <Input key={o.key} label={`Opsi ${o.key}`} value={o.text} onChange={(e) => setQOpts((arr) => { const ns = [...arr]; ns[idx] = { ...ns[idx], text: e.target.value }; return ns; })} />
                      ))}
                      <Select label="Jawaban Benar" selectedKeys={new Set([qCorrect])} onSelectionChange={(keys) => { const k = Array.from(keys as Set<string>)[0]; setQCorrect((k as string) || "A"); }} items={qOpts.map((o) => ({ key: o.key, label: o.key }))}>
                        {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input type="number" label="Poin" value={String(qPoints)} onChange={(e) => setQPoints(Math.max(0, Number(e.target.value) || 0))} />
                    <Input type="number" label="Kesulitan (0-10)" value={String(qDifficulty)} onChange={(e) => setQDifficulty(Math.max(0, Math.min(10, Number(e.target.value) || 0)))} />
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button variant="flat" onPress={() => setQuestionOpen(false)}>Batal</Button>
                  <Button color="primary" onPress={saveQuestion}>Simpan Soal</Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}
    </div>
  );
}
