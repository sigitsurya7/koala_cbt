"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Chip, Card, CardBody, Spinner } from "@heroui/react";
import { FiUpload, FiAlertTriangle } from "react-icons/fi";
import { useApp } from "@/stores/useApp";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import axios from "axios";
import jsPDF from "jspdf";
import { FiDownload } from "react-icons/fi";

type Props = { isOpen: boolean; onOpenChange: (v: boolean) => void; onImported: () => void };
type School = { id: string; name: string; code: string };

type Row = {
  fullName: string;
  nis: string;
  className?: string;
  departmentName?: string;
  entryYear?: number;
  gender?: string;
  birthPlace?: string;
  birthDate?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianJob?: string;
  address?: string;
  status?: string;
};

export default function ImportModal({ isOpen, onOpenChange, onImported }: Props) {
  const app = useApp();
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [errors, setErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobProcessed, setJobProcessed] = useState(0);
  const [jobTotal, setJobTotal] = useState(0);
  const cardsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [importingName, setImportingName] = useState<string>("");

  const groupedByClass = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const it of preview) {
      const key = it.className || "Tanpa Kelas";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries());
  }, [preview]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const r = await axios.get<{ schools: School[] }>("/api/schools?all=1");
        const list = r.data.schools || [];
        setSchools(list);
        setSchoolId((prev) => prev || app.activeSchoolId || list[0]?.id || "");
      } catch {
        const list = app.schools || [];
        if (list.length) {
          setSchools(list as any);
          setSchoolId((prev) => prev || app.activeSchoolId || list[0]?.id || "");
        }
      }
    })();
  }, [isOpen]);

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

  const validate = async () => {
    if (!schoolId || rows.length === 0) { toast.error("Pilih sekolah & upload file"); return; }
    setLoading(true);
    try {
      const res = await axios.post("/api/users/import/validate", { schoolId, rows });
      setErrors(res.data.errors || []);
      if (res.data.ok) {
        setPreview(res.data.items);
        toast.success("Validasi OK, siap import");
      } else {
        toast.error("Ada error pada data. Perbaiki terlebih dahulu");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal validasi");
    } finally { setLoading(false); }
  };

  const downloadTemplate = async () => {
    if (!schoolId) { toast.error("Pilih sekolah lebih dulu"); return; }
    try {
      const res = await fetch(`/api/users/import/sample?schoolId=${schoolId}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "template_import_siswa.xlsx"; a.click(); URL.revokeObjectURL(url);
    } catch { toast.error("Gagal download template"); }
  };

  const downloadPDF = async () => {
    if (!preview || preview.length === 0) return;
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 30;
    const gapX = 20, gapY = 16;
    const cols = 2;
    const cardW = (pageWidth - margin * 2 - gapX * (cols - 1)) / cols;
    const cardH = 128;
    const headerH = 22;
    const rCount = Math.max(1, Math.floor((pageHeight - margin * 2 - gapY - headerH) / (cardH + gapY)));
    const perPage = cols * rCount;
    pdf.setFontSize(12);
    groupedByClass.forEach(([klass, items], gi) => {
      if (gi > 0) pdf.addPage();
      pdf.setFontSize(14);
      pdf.setTextColor(20);
      pdf.text(`Kelas: ${klass}`, margin, margin);
      let offsetY = margin + headerH;
      pdf.setFontSize(12);
      for (let i = 0; i < items.length; i++) {
        const idxInPage = i % perPage;
        if (i > 0 && idxInPage === 0) {
          pdf.addPage();
          pdf.setFontSize(14); pdf.setTextColor(20); pdf.text(`Kelas: ${klass}`, margin, margin);
          offsetY = margin + headerH;
          pdf.setFontSize(12);
        }
        const row = Math.floor(idxInPage / cols);
        const col = idxInPage % cols;
        const x = margin + col * (cardW + gapX);
        const y = offsetY + row * (cardH + gapY);
        pdf.setDrawColor(180);
        pdf.roundedRect(x, y, cardW, cardH, 8, 8);
        const it: any = items[i];
        const lineY = (off: number) => y + off;
        pdf.setTextColor(100);
        pdf.setFontSize(10);
        pdf.text("Kartu Siswa", x + 12, lineY(20));
        pdf.setTextColor(30);
        pdf.setFontSize(14);
        pdf.text(String(it.fullName || "-"), x + 12, lineY(40), { maxWidth: cardW - 24 });
        pdf.setFontSize(11);
        pdf.setTextColor(60);
        pdf.text(`Kelas: ${String(it.className || klass)}`, x + 12, lineY(58));
        pdf.text(`NIS: ${String(it.nis || "-")}`, x + 12, lineY(76));
        if (it.departmentName) pdf.text(`Jurusan: ${String(it.departmentName)}`, x + 12, lineY(94), { maxWidth: cardW - 24 });
        pdf.text(`Username: ${String(it.email || "-")}`, x + 12, lineY(it.departmentName ? 112 : 94), { maxWidth: cardW - 24 });
        pdf.text(`Password: ${String(it.passwordPlain || "-")}`, x + 12, lineY(it.departmentName ? 130 : 112));
      }
    });
    pdf.save("kartu_siswa.pdf");
  };

  const startJob = async () => {
    if (errors.length > 0) { toast.error("Masih ada error. Perbaiki dulu"); return; }
    if (preview.length === 0) { toast.error("Tidak ada data yang valid"); return; }
    setIsImporting(true);
    try {
      const res = await axios.post("/api/users/import/job/start", { items: preview });
      const id = res.data.jobId as string;
      setJobId(id); setJobStatus("pending"); setJobProcessed(0); setJobTotal(preview.length);
      const es = new EventSource(`/api/users/import/job/events?jobId=${id}`);
      let done = false;
      es.onmessage = (ev) => {
        const data = JSON.parse(ev.data);
        if (data.type === "progress") {
          setJobStatus(data.status);
          setJobProcessed(data.processed || 0);
          setJobTotal(data.total || jobTotal);
          if (data.status === "committing" && data.processed && data.processed <= preview.length) {
            const idx = Math.max(0, data.processed - 1);
            setImportingName(preview[idx]?.fullName || "");
          }
          if (data.status === "completed") {
            done = true; es.close(); toast.success("Import selesai"); setIsImporting(false);
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
              if (idx < preview.length) {
                setImportingName(preview[idx].fullName || "");
                setJobProcessed(idx + 1);
                idx++;
              }
            }, 200);
            const r = await axios.post("/api/users/import/commit", { items: preview });
            clearInterval(timer);
            if (r.data?.ok) {
              setJobStatus("completed"); setJobProcessed(preview.length); toast.success("Import selesai");
            } else {
              setJobStatus("failed"); toast.error(r.data?.message || "Import gagal");
              // Fallback CSV generation when job-based CSV is unavailable
              try {
                const failedRow = (typeof r.data?.failedIndex === 'number' && r.data.failedIndex >= 0) ? (r.data.failedIndex + 2) : '';
                const rows = ["row,message", `${failedRow},"${String(r.data?.message || 'Gagal import').replace(/"/g, '""')}"`];
                const csv = rows.join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = "import_errors_fallback.csv"; a.click(); URL.revokeObjectURL(url);
              } catch {}
            }
          } catch (e: any) {
            setJobStatus("failed"); toast.error(e?.response?.data?.message || "Import gagal");
          } finally { setIsImporting(false); }
        }
      };
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal memulai import");
      setIsImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="5xl" backdrop="blur">
      <ModalContent>
        {() => (
          <>
            <ModalHeader>Import Data Siswa</ModalHeader>
            <ModalBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Select
                    label="Pilih Sekolah"
                    items={schools}
                    selectionMode="single"
                    disallowEmptySelection
                    selectedKeys={new Set(schoolId ? [schoolId] : [])}
                    onSelectionChange={(keys) => {
                      const k = Array.from(keys as Set<string>)[0];
                      setSchoolId(k ?? "");
                    }}
                    renderValue={(items) => {
                      const it = (items && items[0]) as any;
                      return it ? `${it.data.name} (${it.data.code})` : null;
                    }}
                  >
                    {(s: any) => (
                      <SelectItem key={s.id} textValue={`${s.name} (${s.code})`}>
                        {s.name} ({s.code})
                      </SelectItem>
                    )}
                  </Select>
                  <div className="flex flex-wrap items-center gap-2">
                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
                    <Button variant="flat" startContent={<FiUpload />} onPress={() => fileInputRef.current?.click()} isDisabled={isImporting}>Upload Excel</Button>
                    {fileName && <span className="text-xs opacity-70">{fileName}</span>}
                    {rows.length > 0 && (
                      <Button color="warning" startContent={<FiAlertTriangle />} onPress={validate} isLoading={loading} isDisabled={isImporting}>Validasi</Button>
                    )}
                  </div>
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
                  <Button variant="flat" color="success" className="w-max" startContent={<FiDownload />} onPress={downloadTemplate} isDisabled={isImporting}>Download Template</Button>
                  <p className="font-semibold mb-2">Panduan</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Isi sheet Template sesuai contoh. Wajib: Nama Lengkap, NIS.</li>
                    <li>Email siswa dibuat otomatis: NIS@kode_sekolah.com</li>
                    <li>Password otomatis (6+ char) kombinasi huruf besar, angka, karakter khusus dan mudah dibaca.</li>
                    <li>Nama kelas dan Jurusan harus cocok dengan master di sekolah.</li>
                    <li>Setelah validasi, akan muncul preview kartu untuk dicek sebelum import.</li>
                  </ul>
                </div>
              </div>

              {preview.length > 0 && (
                <div className="min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">Preview Kartu ({preview.length})</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {jobStatus && (
                        <Chip size="sm" variant="flat">{jobStatus} {jobProcessed}/{jobTotal}</Chip>
                      )}
                      {isImporting && importingName && (
                        <Chip size="sm" variant="flat" startContent={<Spinner size="sm" />}>Sedang import: {importingName}</Chip>
                      )}
                      {jobStatus === "failed" && jobId && (
                        <a className="text-sm underline" href={`/api/users/import/job/errors?jobId=${jobId}`}>Download CSV Errors</a>
                      )}
                      {jobStatus === "completed" && (
                        <Button variant="flat" onPress={downloadPDF}>Download PDF</Button>
                      )}
                    </div>
                  </div>
                  <div ref={cardsRef} className="space-y-4 max-h-[50vh] overflow-auto pr-2">
                    {groupedByClass.map(([klass, items], gidx) => (
                      <div key={String(klass) + gidx}>
                        <div className="text-sm font-semibold mb-2">Kelas: {klass}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {items.map((it: any, idx: number) => (
                            <Card key={idx} radius="lg" shadow="sm">
                              <CardBody className="p-4">
                                <div className="text-sm opacity-60">Kartu Siswa</div>
                                <div className="text-lg font-semibold truncate" title={it.fullName}>{it.fullName}</div>
                                <div className="text-sm">Kelas: <span>{it.className || klass}</span></div>
                                <div className="text-sm">NIS: <span className="font-mono break-all">{it.nis}</span></div>
                                {it.departmentName && <div className="text-sm">Jurusan: <span>{it.departmentName ?? "-"}</span></div>}
                                <div className="mt-2 text-sm">Username: <span className="font-mono break-all">{it.email}</span></div>
                                <div className="text-sm">Password: <span className="font-mono break-all">{it.passwordPlain}</span></div>
                              </CardBody>
                            </Card>
                          ))}
                        </div>
                      </div>
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
