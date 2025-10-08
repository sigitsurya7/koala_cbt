"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Chip } from "@heroui/react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [errors, setErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [loading, setLoading] = useState(false);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    axios.get<{ schools: School[] }>("/api/schools?all=1").then((r) => { setSchools(r.data.schools); setSchoolId(r.data.schools[0]?.id ?? ""); });
  }, [isOpen]);

  const onFile = async (f: File | null) => {
    if (!f) return;
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws) as Row[];
    setRows(data);
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
    if (!cardsRef.current) return;
    const canvas = await html2canvas(cardsRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const ratio = canvas.width / canvas.height;
    const imgWidth = pageWidth - 60;
    const imgHeight = imgWidth / ratio;
    let y = 30;
    pdf.addImage(imgData, "PNG", 30, y, imgWidth, imgHeight);
    pdf.save("preview_kartu.pdf");
  };

  const commit = async () => {
    if (errors.length > 0) { toast.error("Masih ada error. Perbaiki dulu"); return; }
    if (preview.length === 0) { toast.error("Tidak ada data yang valid"); return; }
    setLoading(true);
    try {
      const res = await axios.post("/api/users/import/commit", { items: preview });
      if (res.data.ok) {
        toast.success(`Import berhasil: ${res.data.inserted} data`);
        onImported();
        onOpenChange(false);
      } else {
        toast.error(res.data.message || "Import gagal");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal import");
    } finally { setLoading(false); }
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
                  <Select label="Pilih Sekolah" selectedKeys={new Set(schoolId ? [schoolId] : [])} onSelectionChange={(keys) => { const k = Array.from(keys as Set<string>)[0]; setSchoolId(k ?? schoolId); }} items={schools}>
                    {(s: any) => <SelectItem key={s.id}>{s.name} ({s.code})</SelectItem>}
                  </Select>
                  <div className="flex gap-2">
                    <Button variant="flat" onPress={downloadTemplate}>Download Template</Button>
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm">
                      <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
                      Upload Excel
                    </label>
                    <Button onPress={validate} isLoading={loading}>Validasi</Button>
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

                <div className="text-sm opacity-80">
                  <p className="font-semibold mb-2">Panduan</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Isi sheet Template sesuai contoh. Wajib: Nama Lengkap, NIS.</li>
                    <li>Email siswa dibuat otomatis: NIS@kode_sekolah.com</li>
                    <li>Password otomatis (6+ char) kombinasi huruf besar, angka, karakter khusus dan mudah dibaca.</li>
                    <li>className dan departmentName harus cocok dengan master di sekolah.</li>
                    <li>Setelah validasi, akan muncul preview kartu untuk dicek sebelum import.</li>
                  </ul>
                </div>
              </div>

              {preview.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">Preview Kartu ({preview.length})</p>
                    <Button variant="flat" onPress={downloadPDF}>Download PDF</Button>
                  </div>
                  <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {preview.map((it, idx) => (
                      <div key={idx} className="border rounded-xl p-4 bg-white/60 dark:bg-default-100/50">
                        <div className="text-sm opacity-60">Kartu Siswa</div>
                        <div className="text-lg font-semibold">{it.fullName}</div>
                        <div className="text-sm">NIS: <span className="font-mono">{it.nis}</span></div>
                        {it.departmentId && <div className="text-sm">Jurusan: <span>{it.departmentName ?? "-"}</span></div>}
                        <div className="mt-2 text-sm">Username: <span className="font-mono">{it.email}</span></div>
                        <div className="text-sm">Password: <span className="font-mono">{it.passwordPlain}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={() => onOpenChange(false)}>Batal</Button>
              <Button color="primary" onPress={commit} isLoading={loading} isDisabled={errors.length > 0 || preview.length === 0}>Import ke Database</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

