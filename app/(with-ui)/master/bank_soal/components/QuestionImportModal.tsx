"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Chip, Card, CardBody, Spinner, Select, SelectItem, Textarea } from "@heroui/react";
import * as XLSX from "xlsx";
import axios from "axios";
import toast from "react-hot-toast";
import { FiUpload, FiDownload, FiAlertTriangle } from "react-icons/fi";

type Props = { isOpen: boolean; onOpenChange: (v: boolean) => void; subjectId: string | null; subjectName?: string | null; schoolId?: string | null; onImported?: () => void };

type Row = { type?: string; text?: string; A?: string; B?: string; C?: string; D?: string; E?: string; correctKey?: string; points?: number; difficulty?: number };

export default function QuestionImportModal({ isOpen, onOpenChange, subjectId, subjectName, schoolId, onImported }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [errors, setErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobProcessed, setJobProcessed] = useState(0);
  const [jobTotal, setJobTotal] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [importingName, setImportingName] = useState<string>("");

  // Academic context
  const [years, setYears] = useState<Array<{ id: string; label: string; isActive?: boolean }>>([]);
  const [periods, setPeriods] = useState<Array<{ id: string; type: string; isActive?: boolean; academicYearId: string }>>([]);
  const [fYear, setFYear] = useState<string | null>(null);
  const [fPeriod, setFPeriod] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    // load years
    (async () => {
      try {
        const r = await axios.get<{ data: Array<{ id: string; label: string; isActive?: boolean }> }>("/api/academic-years", { params: { perPage: 200 } });
        const ys = r.data.data || [];
        const active = ys.find((y) => (y as any).isActive) || ys[0] || null;
        setYears(ys);
        setFYear(active ? active.id : null);
      } catch {
        setYears([]);
        setFYear(null);
      }
    })();
  }, [isOpen]);

  useEffect(() => {
    if (!fYear) { setPeriods([]); setFPeriod(null); return; }
    (async () => {
      try {
        const r = await axios.get<{ data: Array<{ id: string; type: string; isActive?: boolean; academicYearId: string }> }>("/api/periods", { params: { academicYearId: fYear, perPage: 200 } });
        const ps = r.data.data || [];
        const active = ps.find((p) => (p as any).isActive) || ps[0] || null;
        setPeriods(ps);
        setFPeriod(active ? active.id : null);
      } catch {
        setPeriods([]);
        setFPeriod(null);
      }
    })();
  }, [fYear]);

  useEffect(() => { if (!isOpen) { setRows([]); setPreview([]); setErrors([]); setFileName(""); setIsImporting(false); setJobId(null); setJobStatus(null); setJobProcessed(0); setJobTotal(0); } }, [isOpen]);

  const onFile = async (f: File | null) => {
    if (!f) return;
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws) as Row[];
    setRows(data);
    setFileName(f.name);
    toast.success(`Terbaca ${data.length} baris`);
  };

  const downloadTemplate = async () => {
    try {
      const res = await fetch(`/api/questions/import/sample`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "template_import_soal.xlsx"; a.click(); URL.revokeObjectURL(url);
    } catch { toast.error("Gagal download template"); }
  };

  const validate = async () => {
    if (!subjectId || rows.length === 0) { toast.error("Pilih subject & upload file"); return; }
    if (!schoolId) { toast.error("Sekolah belum dipilih"); return; }
    // AY/Period optional, no hard block; but keep association if chosen
    setLoading(true);
    try {
      const res = await axios.post("/api/questions/import/validate", { subjectId, rows, schoolId, academicYearId: fYear, periodId: fPeriod });
      setErrors(res.data.errors || []);
      if (res.data.ok) { setPreview(res.data.items); toast.success("Validasi OK, siap import"); }
      else { toast.error("Ada error pada data. Perbaiki terlebih dahulu"); }
    } catch (e: any) { toast.error(e?.response?.data?.message || "Gagal validasi"); }
    finally { setLoading(false); }
  };

  const startJob = async () => {
    if (errors.length > 0) { toast.error("Masih ada error. Perbaiki dulu"); return; }
    if (preview.length === 0) { toast.error("Tidak ada data yang valid"); return; }
    if (!schoolId) { toast.error("Sekolah belum dipilih"); return; }
    setIsImporting(true);
    try {
      const res = await axios.post("/api/questions/import/job/start", { items: preview, schoolId });
      const id = res.data.jobId as string;
      setJobId(id); setJobStatus("pending"); setJobProcessed(0); setJobTotal(preview.length);
      const es = new EventSource(`/api/questions/import/job/events?jobId=${id}`);
      let done = false;
      es.onmessage = (ev) => {
        const data = JSON.parse(ev.data);
        if (data.type === "progress") {
          setJobStatus(data.status);
          setJobProcessed(data.processed || 0);
          setJobTotal(data.total || jobTotal);
          if (data.status === "committing" && data.processed && data.processed <= preview.length) {
            const idx = Math.max(0, data.processed - 1);
            setImportingName(preview[idx]?.text || "");
          }
          if (data.status === "completed") {
            done = true; es.close(); toast.success("Import selesai"); setIsImporting(false); onImported && onImported();
          }
          if (data.status === "failed") {
            done = true; es.close(); toast.error("Import gagal. Unduh CSV errors untuk memperbaiki."); setIsImporting(false);
          }
        }
      };
      es.onerror = async () => {
        es.close();
        if (!done) {
          try {
            setJobStatus("committing"); setJobProcessed(0); setJobTotal(preview.length);
            let idx = 0;
            const timer = setInterval(() => {
              if (idx < preview.length) { setImportingName(preview[idx].text || ""); setJobProcessed(idx + 1); idx++; }
            }, 200);
            const r = await axios.post("/api/questions/import/commit", { items: preview, schoolId });
            clearInterval(timer);
            if (r.data?.ok) { setJobStatus("completed"); setJobProcessed(preview.length); toast.success("Import selesai"); onImported && onImported(); }
            else {
              setJobStatus("failed"); toast.error(r.data?.message || "Import gagal");
              try {
                const failedRow = (typeof r.data?.failedIndex === 'number' && r.data.failedIndex >= 0) ? (r.data.failedIndex + 2) : '';
                const rows = ["row,message", `${failedRow},"${String(r.data?.message || 'Gagal import').replace(/"/g, '""')}"`];
                const csv = rows.join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = "import_errors_fallback.csv"; a.click(); URL.revokeObjectURL(url);
              } catch {}
            }
          } catch (e: any) { setJobStatus("failed"); toast.error(e?.response?.data?.message || "Import gagal"); }
          finally { setIsImporting(false); }
        }
      };
    } catch (e: any) { toast.error(e?.response?.data?.message || "Gagal memulai import"); setIsImporting(false); }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="5xl" backdrop="blur">
      <ModalContent>
        {() => (
          <>
            <ModalHeader>Import Soal {subjectName ? `- ${subjectName}` : ""}</ModalHeader>
            <ModalBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Select label="Tahun Ajaran" selectedKeys={new Set(fYear ? [fYear] : [])} onSelectionChange={(keys) => {
                      const k = Array.from(keys as Set<string>)[0] || null;
                      setFYear(k);
                    }} items={years.map((y) => ({ key: y.id, label: y.label + ((y as any).isActive ? " (Aktif)" : "") }))}>
                      {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
                    </Select>
                    <Select label="Periode" selectedKeys={new Set(fPeriod ? [fPeriod] : [])} onSelectionChange={(keys) => {
                      const k = Array.from(keys as Set<string>)[0] || null;
                      setFPeriod(k);
                    }} items={periods.map((p) => ({ key: p.id, label: p.type + ((p as any).isActive ? " (Aktif)" : "") }))}>
                      {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
                    </Select>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
                    <Button variant="flat" startContent={<FiUpload />} onPress={() => fileInputRef.current?.click()} isDisabled={isImporting}>Upload Excel</Button>
                    <Button variant="flat" color="success" className="w-max" startContent={<FiDownload />} onPress={downloadTemplate} isDisabled={isImporting}>Download Template</Button>
                    {fileName && <span className="text-xs opacity-70">{fileName}</span>}
                  </div>
                  {rows.length > 0 && (
                    <Button color="warning" startContent={<FiAlertTriangle />} onPress={validate} isLoading={loading} isDisabled={isImporting}>Validasi</Button>
                  )}
                  {errors.length > 0 && (
                    <div className="text-sm text-danger">
                      Terdapat {errors.length} error:
                      <ul className="list-disc ml-5">
                        {errors.slice(0, 10).map((er, i) => (<li key={i}>Baris {er.row}: {er.message}</li>))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="text-sm opacity-80 flex flex-col gap-2">
                  <p className="font-semibold">Panduan</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Kolom: tipe (MCQ/ESSAY), teks, A, B, C, D, E, kunci, poin, kesulitan.</li>
                    <li>Pilihan ganda (MCQ) wajib minimal 2 opsi (contoh: A dan B). Kolom <span className="font-medium">kunci</span> harus salah satu dari opsi yang diisi.</li>
                    <li>Essay cukup isi kolom <span className="font-medium">teks</span>. Lampiran/audio tidak didukung via Excel.</li>
                    <li><span className="font-medium">poin</span> bilangan bulat, <span className="font-medium">kesulitan</span> 0..10.</li>
                    <li>Gunakan tombol <span className="font-medium">Validasi</span> untuk melihat error sebelum import.</li>
                  </ul>
                </div>
              </div>

              {preview.length > 0 && (
                <div className="min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">Preview ({preview.length})</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {jobStatus && (<Chip size="sm" variant="flat">{jobStatus} {jobProcessed}/{jobTotal}</Chip>)}
                      {isImporting && importingName && (
                        <Chip size="sm" variant="flat" startContent={<Spinner size="sm" />}>Sedang import: {importingName.slice(0,50)}</Chip>
                      )}
                      {jobStatus === "failed" && jobId && (
                        <a className="text-sm underline" href={`/api/questions/import/job/errors?jobId=${jobId}`}>Download CSV Errors</a>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[50vh] overflow-auto pr-2 p-4">
                    {preview.slice(0, 60).map((it: any, idx: number) => (
                      <Card key={idx} radius="lg" shadow="sm">
                        <CardBody className="p-4 space-y-1">
                          <div className="text-xs opacity-60">{it.type}</div>
                          <div className="text-sm font-semibold truncate" title={it.text}>{it.text}</div>
                          {it.type === 'MCQ' && (
                            <div className="text-xs">
                              Opsi: {(it.options || []).map((o: any) => `${o.key}`).join(", ")} • Benar: {it.correctKey}
                            </div>
                          )}
                          <div className="text-xs opacity-60">Poin: {it.points ?? 1} • Kesulitan: {it.difficulty ?? 1}</div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={() => onOpenChange(false)} isDisabled={isImporting}>Tutup</Button>
              <Button color="primary" onPress={startJob} isDisabled={isImporting || errors.length > 0 || preview.length === 0} isLoading={isImporting}>Mulai Import</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
