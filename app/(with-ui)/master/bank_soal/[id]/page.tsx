"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { Button, Card, CardBody, Chip, Input, Select, SelectItem, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import toast from "react-hot-toast";
import { FiArrowLeft, FiArrowRight, FiMenu, FiPlus, FiSave, FiTrash, FiUpload } from "react-icons/fi";
import QuestionImportModal from "../components/QuestionImportModal";

type Subject = { id: string; name: string; grade?: number | null; departmentName?: string | null };
type MCQOption = { key: string; text: string };
type DraftItem =
  | { id?: string; type: "MCQ"; text: string; options: MCQOption[]; correctKey: string; points: number; difficulty: number }
  | { id?: string; type: "ESSAY"; text: string; attachmentName?: string | null; audioName?: string | null; points: number; difficulty: number };

const MAX_OPTIONS = 5;

export default function QuestionBuilderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const subjectId = String(params?.id || "");
  const draftKey = `bankSoalDraft:${subjectId}`;

  const [subject, setSubject] = useState<Subject | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [index, setIndex] = useState(0);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Load subject and existing questions (then optionally offer draft)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const r = await axios.get(`/api/subjects/${subjectId}`);
        if (mounted) setSubject(r.data);
      } catch {}
      // Always try to load from server first
      try {
        const qres = await axios.get(`/api/questions?subjectId=${subjectId}&page=1&perPage=200`);
        const arr = (qres.data.data || []) as Array<{ id: string; type: "MCQ"|"ESSAY"; text: string; options?: MCQOption[]; correctKey?: string; points?: number; difficulty?: number }>;
        if (arr.length > 0) {
          const mapped: DraftItem[] = arr.map((q) => q.type === "MCQ"
            ? { id: q.id, type: q.type, text: q.text, options: (q.options || []).slice(0, 5), correctKey: q.correctKey || (q.options?.[0]?.key || "A"), points: q.points ?? 1, difficulty: q.difficulty ?? 1 }
            : { id: q.id, type: q.type, text: q.text, attachmentName: null, audioName: null, points: q.points ?? 1, difficulty: q.difficulty ?? 1 });
          if (mounted) { setItems(mapped); setIndex(0); }
        } else {
          if (mounted) { setItems([{ type: "MCQ", text: "", options: [ { key: "A", text: "" }, { key: "B", text: "" }, { key: "C", text: "" }, { key: "D", text: "" } ], correctKey: "A", points: 1, difficulty: 1 }]); setIndex(0); }
        }
      } catch {
        if (mounted) { setItems([{ type: "MCQ", text: "", options: [ { key: "A", text: "" }, { key: "B", text: "" }, { key: "C", text: "" }, { key: "D", text: "" } ], correctKey: "A", points: 1, difficulty: 1 }]); setIndex(0); }
      }
      // After server load, offer draft if exists
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) {
          setHasDraft(true);
          setShowUnsavedModal(true);
        }
      } catch {}
    };
    load();
    return () => { mounted = false; };
  }, [subjectId]);

  // beforeunload guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (items.length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [items]);

  // Persist to localStorage on changes (autosave draft)
  useEffect(() => {
    try {
      const data = JSON.stringify({ items, index });
      localStorage.setItem(draftKey, data);
    } catch {}
  }, [items, index, draftKey]);

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { items: DraftItem[]; index: number };
        setItems(parsed.items || []);
        setIndex(Math.min(parsed.index || 0, (parsed.items || []).length - 1));
      }
    } catch {}
  };

  const clearDraft = () => {
    try { localStorage.removeItem(draftKey); } catch {}
  };

  // Track initial snapshot to detect dirty state
  const initialSigRef = useRef<string>("");
  useEffect(() => {
    if (items.length > 0 && !initialSigRef.current) {
      try { initialSigRef.current = JSON.stringify(items); } catch {}
    }
  }, [items]);
  const isDirty = useMemo(() => {
    try { return !!initialSigRef.current && JSON.stringify(items) !== initialSigRef.current; } catch { return false; }
  }, [items]);

  // Intercept internal navigation and back action to warn user
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const pendingHrefRef = useRef<string | null>(null);
  useEffect(() => {
    const onClick = (e: any) => {
      const a: HTMLAnchorElement | null = e.target?.closest?.('a') ?? null;
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href) return;
      if (href.startsWith('#') || href.startsWith('javascript:')) return;
      const sameOrigin = href.startsWith('/') || href.startsWith(location.origin);
      if (sameOrigin && isDirty) {
        e.preventDefault();
        pendingHrefRef.current = href.startsWith('/') ? href : href.replace(location.origin, '');
        setShowLeaveModal(true);
      }
    };
    const onPop = () => {
      if (isDirty) {
        setShowLeaveModal(true);
        history.forward();
      }
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPop);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPop);
    };
  }, [isDirty]);

  // Navigation helpers
  const addQuestion = (type: "MCQ" | "ESSAY" = "MCQ") => {
    const next: DraftItem =
      type === "MCQ"
        ? { type: "MCQ", text: "", options: [ { key: "A", text: "" }, { key: "B", text: "" }, { key: "C", text: "" }, { key: "D", text: "" } ], correctKey: "A", points: 1, difficulty: 1 }
        : { type: "ESSAY", text: "", attachmentName: null, audioName: null, points: 1, difficulty: 1 };
    setItems((arr) => { const ns = [...arr, next]; return ns; });
    setIndex(items.length);
  };

  const removeQuestion = (i: number) => {
    setItems((arr) => {
      const ns = arr.slice();
      ns.splice(i, 1);
      const newIdx = Math.max(0, Math.min(index, ns.length - 1));
      setIndex(newIdx);
      return ns.length ? ns : [{ type: "MCQ", text: "", options: [ { key: "A", text: "" }, { key: "B", text: "" }, { key: "C", text: "" }, { key: "D", text: "" } ], correctKey: "A", points: 1, difficulty: 1 }];
    });
  };

  const current = items[index] as DraftItem | undefined;

  // MCQ helpers
  const setOption = (idx: number, text: string) => {
    if (!current || current.type !== "MCQ") return;
    const opts = current.options.slice();
    opts[idx] = { ...opts[idx], text };
    setItems((arr) => arr.map((it, i) => (i === index ? { ...current, options: opts } : it)));
  };
  const addOption = () => {
    if (!current || current.type !== "MCQ") return;
    if (current.options.length >= MAX_OPTIONS) return;
    const nextKey = String.fromCharCode(65 + current.options.length); // A,B,C...
    setItems((arr) => arr.map((it, i) => (i === index ? { ...current, options: [...current.options, { key: nextKey, text: "" }] } : it)));
  };
  const removeOption = (idx: number) => {
    if (!current || current.type !== "MCQ") return;
    const opts = current.options.slice();
    opts.splice(idx, 1);
    const newCorrect = opts.find((o) => o.key === (current as any).correctKey) ? (current as any).correctKey : (opts[0]?.key || "A");
    setItems((arr) => arr.map((it, i) => (i === index ? { ...current, options: opts, correctKey: newCorrect } : it)));
  };

  const saveAll = async () => {
    try {
      // validate minimal
      if (!subjectId || items.length === 0) { toast.error("Tidak ada soal untuk disimpan"); return; }
      const payload = { subjectId, items: items.map((it) => (it.type === "MCQ"
        ? { id: (it as any).id, type: it.type, text: it.text, options: it.options, correctKey: it.correctKey, points: it.points, difficulty: it.difficulty }
        : { id: (it as any).id, type: it.type, text: it.text, points: it.points, difficulty: it.difficulty })) };
      const res = await axios.post("/api/questions/sync", payload);
      if (res.data?.ok) {
        clearDraft();
        toast.success(`Perubahan disimpan (buat: ${res.data.created}, ubah: ${res.data.updated}, hapus: ${res.data.deleted})`);
        router.push("/master/bank_soal");
      } else {
        toast.error(res.data?.message || "Gagal simpan");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 reverse">
      {/* Editor area after on mobile */}
      <div className="order-2 lg:order-none lg:col-span-3 space-y-4 sm:order-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Buat Soal</h1>
            {subject && <p className="text-sm opacity-70">Mapel: {subject.name} {subject.grade ? `(Grade ${subject.grade})` : ""} {subject.departmentName ? `• ${subject.departmentName}` : ""}</p>}
          </div>
          <div className="hidden md:flex gap-2">
            <Button variant="flat" startContent={<FiUpload />} onPress={() => setImportOpen(true)}>Import Excel</Button>
            <Button variant="flat" startContent={<FiPlus />} onPress={() => addQuestion("ESSAY")}>Tambah Essay</Button>
            <Button color="secondary" startContent={<FiPlus />} onPress={() => addQuestion("MCQ")}>Tambah Pilihan Ganda</Button>
            <Button color="primary" startContent={<FiSave />} onPress={saveAll}>Simpan Semua</Button>
          </div>
          <div className="md:hidden">
            <Dropdown>
              <DropdownTrigger>
                <Button isIconOnly><FiMenu /></Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Static Actions">
                <DropdownItem key={'import_excel'} startContent={<FiUpload />} onPress={() => setImportOpen(true)}>Import Excel</DropdownItem>
                <DropdownItem key={'tambah_essay'} startContent={<FiPlus />} onPress={() => addQuestion("ESSAY")}>Tambah Essay</DropdownItem>
                <DropdownItem key={'tambah_pilihan_ganda'} startContent={<FiPlus />} onPress={() => addQuestion("MCQ")}>Tambah Pilihan Ganda</DropdownItem>
                <DropdownItem className="text-primary" color="success" key={'simpan_semua'} startContent={<FiSave />} onPress={saveAll}>Simpan Semua</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>

        {/* Editor area */}
        <Card>
          <CardBody className="space-y-4">
            {current && (
              <>
                <div className="flex items-center gap-3">
                  <Chip size="sm" variant="flat">#{index + 1}</Chip>
                  <Chip size="sm" color={current.type === "MCQ" ? "secondary" : "default"} variant="flat">{current.type === "MCQ" ? "Pilihan Ganda" : "Essay"}</Chip>
                </div>
                <Textarea label="Teks Soal" labelPlacement="outside" value={current.text} onChange={(e) => {
                  const v = e.target.value;
                  setItems((arr) => arr.map((it, i) => (i === index ? { ...it, text: v } as DraftItem : it)));
                }} minRows={3} />

                {current.type === "MCQ" ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {current.options.map((o, oi) => (
                        <div key={o.key} className="flex items-end gap-2">
                          <Input label={`Opsi ${o.key}`} value={o.text} onChange={(e) => setOption(oi, e.target.value)} className="flex-1" />
                          <Button variant="flat" startContent={<FiTrash />} color="danger" isDisabled={current.options.length <= 2} onPress={() => removeOption(oi)}>Hapus</Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="flat" onPress={addOption} isDisabled={current.options.length >= MAX_OPTIONS}>Tambah Opsi</Button>
                      <Select label="Jawaban Benar" selectedKeys={new Set([(current as any).correctKey])} onSelectionChange={(keys) => {
                        const k = Array.from(keys as Set<string>)[0] || current.options[0].key;
                        setItems((arr) => arr.map((it, i) => (i === index ? { ...(it as any), correctKey: k } : it)));
                      }} items={current.options.map((o) => ({ key: o.key, label: o.key }))}>
                        {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm">Lampiran (opsional)</label>
                      <input type="file" onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setItems((arr) => arr.map((it, i) => (i === index ? { ...(it as any), attachmentName: f ? f.name : null } : it)));
                      }} />
                      <div className="text-xs opacity-70 mt-1">Disimpan lokal sementara, tidak diunggah hingga Anda klik Simpan.</div>
                    </div>
                    <div>
                      <label className="text-sm">Audio (opsional)</label>
                      <input type="file" accept="audio/*" onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setItems((arr) => arr.map((it, i) => (i === index ? { ...(it as any), audioName: f ? f.name : null } : it)));
                      }} />
                      <div className="text-xs opacity-70 mt-1">Nama file akan tersimpan lokal sampai Anda menyimpan.</div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input type="number" label="Poin" value={String((current as any).points || 1)} onChange={(e) => {
                    const n = Math.max(0, Number(e.target.value) || 0);
                    setItems((arr) => arr.map((it, i) => (i === index ? { ...(it as any), points: n } : it)));
                  }} />
                  <Input type="number" label="Kesulitan (0-10)" value={String((current as any).difficulty || 1)} onChange={(e) => {
                    const n = Math.max(0, Math.min(10, Number(e.target.value) || 0));
                    setItems((arr) => arr.map((it, i) => (i === index ? { ...(it as any), difficulty: n } : it)));
                  }} />
                </div>

                <div className="flex items-center justify-between">
                  <Button variant="flat" startContent={<FiTrash />} color="danger" onPress={() => removeQuestion(index)}>
                    Hapus Soal Ini
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="flat" startContent={<FiArrowLeft />} onPress={() => setIndex(Math.max(0, index - 1))}>Sebelumnya</Button>
                    <Button variant="flat" endContent={<FiArrowRight />} onPress={() => setIndex(Math.min(items.length - 1, index + 1))}>Selanjutnya</Button>
                  </div>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Right panel */}
      <div className="lg:col-span-1 space-y-4 sm:order-1">
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Total Soal</div>
              <Chip size="sm" variant="flat">{items.length}</Chip>
            </div>
            {(() => {
              const mcq = items.map((it, i) => ({ it, i })).filter((x) => x.it.type === 'MCQ');
              const ess = items.map((it, i) => ({ it, i })).filter((x) => x.it.type === 'ESSAY');
              return (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs opacity-70 mb-1">MCQ</div>
                    <div className="grid grid-cols-5 gap-2">
                      {mcq.map(({ i }) => (
                        <Button key={`m-${i}`} size="sm" color={i === index ? 'primary' : 'default'} variant={i === index ? 'solid' : 'flat'} onPress={() => setIndex(i)}>
                          {i + 1}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs opacity-70 mb-1">ESSAY</div>
                    <div className="grid grid-cols-5 gap-2">
                      {ess.map(({ i }) => (
                        <Button key={`e-${i}`} size="sm" color={i === index ? 'primary' : 'default'} variant={i === index ? 'solid' : 'flat'} onPress={() => setIndex(i)}>
                          {i + 1}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-2">
            <div className="font-semibold">Jenis Soal</div>
            {current && (
              <Select selectedKeys={new Set([current.type])} onSelectionChange={(keys) => {
                const k = (Array.from(keys as Set<string>)[0] as "MCQ" | "ESSAY") || current.type;
                if (k === current.type) return;
                // transform shape when switching types
                const transformed: DraftItem =
                  k === "MCQ"
                    ? { type: "MCQ", text: current.text || "", options: [ { key: "A", text: "" }, { key: "B", text: "" }, { key: "C", text: "" }, { key: "D", text: "" } ], correctKey: "A", points: (current as any).points || 1, difficulty: (current as any).difficulty || 1 }
                    : { type: "ESSAY", text: current.text || "", attachmentName: null, audioName: null, points: (current as any).points || 1, difficulty: (current as any).difficulty || 1 };
                setItems((arr) => arr.map((it, i) => (i === index ? transformed : it)));
              }} items={[{ key: "MCQ", label: "MCQ (Pilihan Ganda)" }, { key: "ESSAY", label: "Essay" }]}>
                {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
              </Select>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Load draft modal */}
      <Modal isOpen={showUnsavedModal} onOpenChange={setShowUnsavedModal} backdrop="blur">
        <ModalContent>
          {() => (
            <>
              <ModalHeader>Draft belum disimpan</ModalHeader>
              <ModalBody>
                {hasDraft ? (
                  <p className="text-sm">Terdapat draft soal yang belum disimpan ke database. Ingin melanjutkan mengedit draft tersebut?</p>
                ) : (
                  <p className="text-sm">Draft tidak ditemukan.</p>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={() => { setShowUnsavedModal(false); clearDraft(); }}>Abaikan</Button>
                <Button color="primary" onPress={() => { loadDraft(); setShowUnsavedModal(false); }}>Lanjutkan</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      {/* Leave page modal */}
      <Modal isOpen={showLeaveModal} onOpenChange={setShowLeaveModal} backdrop="blur">
        <ModalContent>
          {() => (
            <>
              <ModalHeader>Perubahan belum disimpan</ModalHeader>
              <ModalBody>
                <p className="text-sm">Anda memiliki perubahan yang belum disimpan. Yakin ingin meninggalkan halaman ini?</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={() => setShowLeaveModal(false)}>Batal</Button>
                <Button color="primary" onPress={() => {
                  const href = pendingHrefRef.current;
                  setShowLeaveModal(false);
                  if (href) router.push(href);
                  else router.push('/master/bank_soal');
                }}>Tinggalkan</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      <QuestionImportModal isOpen={importOpen} onOpenChange={setImportOpen} subjectId={subjectId} subjectName={subject?.name} onImported={() => toast.success("Import selesai")} />
    </div>
  );
}
