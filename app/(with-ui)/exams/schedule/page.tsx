"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Input, Select, SelectItem, Switch, DatePicker } from "@heroui/react";
import { CalendarDateTime, DateValue, getLocalTimeZone, fromDate } from "@internationalized/date";
import DataTable, { type FetchParams, type Paged } from "@/components/DataTable";
import { useApp } from "@/stores/useApp";
import { formatJamKoala, formatTanggalKoala } from "@/utils/koalaDates";

type ExamRow = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  totalQuestions: number;
  published: boolean;
  subjectName: string;
  className: string;
  periodType: string;
  academicYearLabel: string;
};

type IdName = { id: string; name: string; grade?: number | null };
type AcademicYear = { id: string; label: string; isActive?: boolean };
type Period = { id: string; type: string; isActive?: boolean };
type School = { id: string; name: string };

export default function ExamSchedulePage() {
  const app = useApp();
  const isSuperAdmin = !!app.user?.isSuperAdmin;
  const activeSchoolId = app.activeSchoolId || "";
  const setActiveSchool = app.setActiveSchool;
  const schools = useMemo(() => app.schools || [], [app.schools]);
  const schoolItems = useMemo(() => schools.map((s) => ({ key: s.id, label: `${s.name} (${s.code})` })), [schools]);
  const [reloadKey, setReloadKey] = useState(0);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Form state
  const [fTitle, setFTitle] = useState("");
  const [fSubject, setFSubject] = useState<string | null>(null);
  const [fClass, setFClass] = useState<string | null>(null);
  const [fYear, setFYear] = useState<string | null>(null);
  const [fPeriod, setFPeriod] = useState<string | null>(null);
  const [startVal, setStartVal] = useState<DateValue | null>(null);
  const [endVal, setEndVal] = useState<DateValue | null>(null);
  const [fDuration, setFDuration] = useState<number>(90);
  const [fTotalQuestions, setFTotalQuestions] = useState<number>(40);
  const [fRandomizeQs, setFRandomizeQs] = useState<boolean>(true);
  const [fRandomizeOpts, setFRandomizeOpts] = useState<boolean>(true);

  // options
  const [subjects, setSubjects] = useState<IdName[]>([]);
  const [classes, setClasses] = useState<IdName[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const schoolId = useMemo(() => {
    if (activeSchoolId) return activeSchoolId;
    if (isSuperAdmin && schools.length > 0) return schools[0].id;
    return "";
  }, [isSuperAdmin, activeSchoolId, schools]);

  // Data is loaded via DataTable fetchData

  async function openModal(id?: string) {
    setOpen(true);
    setEditingId(id ?? null);
    // load dropdowns
    try {
      const params: Record<string, any> = {};
      if (isSuperAdmin && schoolId) params.schoolId = schoolId;
      // subjects
      const rsub = await axios.get<{ items: any[] }>("/api/subjects", { params: { ...params, all: 1 } });
      setSubjects(rsub.data.items.map((s) => ({ id: s.id, name: s.name, grade: s.grade ?? null })));
      // classes (paged)
      const rcls = await axios.get<{ data: any[] }>("/api/classes", { params: { ...params, perPage: 200 } });
      setClasses(rcls.data.data.map((c) => ({ id: c.id, name: c.name, grade: c.grade }) as IdName));
      // academic years
      const ryrs = await axios.get<{ data: any[] }>("/api/academic-years", { params: { ...params, perPage: 200 } });
      const yrs = ryrs.data.data as AcademicYear[];
      setYears(yrs);
      if (id) {
        const r = await axios.get(`/api/exams/schedule/${id}`);
        const d: any = r.data;
        setFTitle(d.title || "");
        setFSubject(d.subjectId || null);
        setFClass(d.classId || null);
        setFYear(d.academicYearId || null);
        setFPeriod(d.periodId || null);
        setStartVal(d.startAt ? fromDate(new Date(d.startAt), getLocalTimeZone()) : null);
        setEndVal(d.endAt ? fromDate(new Date(d.endAt), getLocalTimeZone()) : null);
        setFDuration(d.durationMinutes || 90);
        setFTotalQuestions(d.totalQuestions || 40);
        setFRandomizeQs(!!d.randomizeQs);
        setFRandomizeOpts(!!d.randomizeOpts);
        if (d.academicYearId) await onYearChange(d.academicYearId);
      } else {
        // Defaults for new item
        const activeYear = (yrs || []).find((y) => y.isActive) || (yrs || [])[0] || null;
        setFYear(activeYear ? activeYear.id : null);
        if (activeYear?.id) await onYearChange(activeYear.id);
        // Default duration from school settings (fallback 60)
        let dd = 60;
        try {
          const rs = await axios.get(`/api/school-settings`, { params: { ...params, perPage: 200, q: "durasi_default_ujian" } });
          const match = (rs.data?.data || []).find((x: any) => x.key === "durasi_default_ujian");
          const dv = match ? Number(match.value) : NaN;
          dd = Number.isFinite(dv) && dv > 0 ? dv : 60;
          setFDuration(dd);
        } catch { setFDuration(dd); }
        // Start now rounded to minute; End = start + duration
        const now = new Date(); now.setSeconds(0, 0);
        const sVal = fromDate(now, getLocalTimeZone());
        setStartVal(sVal);
        const end = new Date(now.getTime() + (dd * 60000));
        setEndVal(fromDate(end, getLocalTimeZone()));
      }
    } catch (e) {
      // noop
    }
  }

  async function onYearChange(id: string | null) {
    setFYear(id);
    if (!id) {
      setPeriods([]);
      setFPeriod(null);
      return;
    }
    try {
      const params: Record<string, any> = { academicYearId: id, perPage: 200 };
      if (isSuperAdmin && schoolId) params.schoolId = schoolId;
      const r = await axios.get<{ data: any[] }>("/api/periods", { params });
      const ps = r.data.data as Period[];
      setPeriods(ps);
      if (!editingId) {
        const active = (ps || []).find((p: any) => p.isActive) || (ps || [])[0] || null;
        setFPeriod(active ? (active as any).id : null);
      }
    } catch {}
  }

  function toIso(v: DateValue | null): string | null {
    if (!v) return null;
    try { return v.toDate(getLocalTimeZone()).toISOString(); } catch { return null; }
  }

  async function submit() {
    if (isSuperAdmin && !schoolId) return;
    if (!fTitle || !fSubject || !fClass || !fYear || !fPeriod || !startVal || !endVal) return;
    const startIso = toIso(startVal);
    const endIso = toIso(endVal);
    if (!startIso || !endIso) return;
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) return;
    const payload: any = {
      title: fTitle,
      subjectId: fSubject,
      classId: fClass,
      academicYearId: fYear,
      periodId: fPeriod,
      startAt: startIso,
      endAt: endIso,
      durationMinutes: fDuration,
      totalQuestions: fTotalQuestions,
      randomizeQs: fRandomizeQs,
      randomizeOpts: fRandomizeOpts,
    };
    if (isSuperAdmin && schoolId) payload.schoolId = schoolId;
    if (editingId) {
      await axios.put(`/api/exams/schedule/${editingId}`, payload);
    } else {
      await axios.post("/api/exams/schedule", payload);
    }
    setOpen(false);
    setEditingId(null);
    // reset
    setFTitle("");
    setFSubject(null);
    setFClass(null);
    setFYear(null);
    setFPeriod(null);
    setStartVal(null);
    setEndVal(null);
    setFDuration(90);
    setFTotalQuestions(40);
    setFRandomizeQs(true);
    setFRandomizeOpts(true);
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Jadwal Ujian</h1>
          <p className="text-sm opacity-70">Kelola jadwal ujian.</p>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <Select
              selectedKeys={schoolId ? new Set([schoolId]) : new Set([])}
              onSelectionChange={(keys) => {
                const k = Array.from(keys as Set<string>)[0];
                if (k) setActiveSchool(String(k)).catch(() => {});
              }}
              items={schoolItems}
            >
              {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
            </Select>
          )}
        </div>
      </div>
      <DataTable<ExamRow>
        externalReloadKey={`${reloadKey}-${schoolId ?? ''}`}
        searchPlaceholder="Cari jadwal ujian..."
        columns={[
          { key: "title", header: "Judul" },
          { key: "className", header: "Kelas" },
          { key: "subjectName", header: "Mapel" },
          { key: "academicYearLabel", header: "Tahun" },
          { key: "periodType", header: "Periode", render: (r) => r.periodType.replace('_', ' ') },
          { key: "startAt", header: "Mulai", render: (r) => formatTanggalKoala(r.startAt) },
          { key: "endAt", header: "Selesai", render: (r) => formatTanggalKoala(r.endAt) },
          { key: "durationMinutes", header: "Durasi",
            render: (r) => (
              <div className="flex flex-col justify-center items-center">
                <span>{r.durationMinutes} menit</span>
                <span>
                  ({formatJamKoala(r.startAt)} - {formatJamKoala(r.endAt)})
                </span>
              </div>
            )
          },
          {
            key: "published",
            header: "Publikasi",
            render: (r) => (
              <Switch
                isSelected={r.published}
                onValueChange={async (v) => {
                  await axios.patch(`/api/exams/schedule/${r.id}`, { published: v });
                  setReloadKey((k) => k + 1);
                }}
              >Publik</Switch>
            ),
          },
          {
            key: "actions",
            header: "Aksi",
            render: (r) => (
              <Button size="sm" variant="flat" onPress={() => openModal(r.id)}>Edit</Button>
            ),
          },
        ]}
        rowKey={(r) => r.id}
        fetchData={async ({ page, perPage, q }: FetchParams): Promise<Paged<ExamRow>> => {
          const params: Record<string, any> = { page, perPage, q };
          if (isSuperAdmin && schoolId) params.schoolId = schoolId;
          const res = await axios.get("/api/exams/schedule", { params });
          return res.data as Paged<ExamRow>;
        }}
        toolbarRight={<Button color="primary" onPress={() => openModal()}>Tambah Jadwal</Button>}
      />

      <Modal isOpen={open} isKeyboardDismissDisabled={true} isDismissable={false} onOpenChange={setOpen} size="2xl">
        <ModalContent>
          <ModalHeader>{editingId ? "Edit Jadwal Ujian" : "Tambah Jadwal Ujian"}</ModalHeader>
          <ModalBody>
            <Input label="Judul" value={fTitle} onChange={(e) => setFTitle(e.target.value)} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Kelas"
                placeholder="Pilih kelas"
                selectedKeys={new Set(fClass ? [fClass] : [])}
                onSelectionChange={(keys) => {
                  const k = Array.from(keys as Set<string>)[0];
                  setFClass(k ?? null);
                  setFSubject(null);
                }}
                items={classes.map((c) => ({ key: c.id, label: c.name }))}
              >
                {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
              </Select>
              <Select
                label="Mata Pelajaran"
                placeholder="Pilih mapel"
                isDisabled={!fClass}
                selectedKeys={new Set(fSubject ? [fSubject] : [])}
                onSelectionChange={(keys) => {
                  const k = Array.from(keys as Set<string>)[0];
                  const id = (k ?? null) as string | null;
                  setFSubject(id);
                  if (id && !editingId && !fTitle) {
                    const subj = subjects.find((s) => s.id === id);
                    if (subj?.name) setFTitle(subj.name);
                  }
                }}
                items={(fClass ? (() => {
                  const cls = classes.find((c) => c.id === fClass);
                  const grade = cls?.grade ?? null;
                  return subjects.filter((s) => (s.grade ?? null) === grade).map((s) => ({ key: s.id, label: s.name + (s.grade != null ? ` - Kelas ${s.grade}` : '') }));
                })() : [])}
              >
                {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Tahun Ajaran"
                placeholder="Pilih tahun"
                selectedKeys={new Set(fYear ? [fYear] : [])}
                onSelectionChange={(keys) => {
                  const k = Array.from(keys as Set<string>)[0] || null;
                  void onYearChange(k);
                }}
                items={years.map((y) => ({ key: y.id, label: y.label + (y.isActive ? ' (Aktif)' : '') }))}
              >
                {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
              </Select>
              <Select
                label="Periode"
                placeholder="Pilih periode"
                selectedKeys={new Set(fPeriod ? [fPeriod] : [])}
                onSelectionChange={(keys) => {
                  const k = Array.from(keys as Set<string>)[0];
                  setFPeriod(k ?? null);
                }}
                items={periods.map((p) => ({ key: p.id, label: p.type + (p.isActive ? ' (Aktif)' : '') }))}
              >
                {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DatePicker
                label="Mulai"
                granularity="minute"
                value={startVal as any}
                onChange={(v) => {
                  setStartVal(v);
                  try {
                    const base = v?.toDate(getLocalTimeZone());
                    if (base) {
                      const end = new Date(base.getTime() + (Math.max(1, fDuration || 0) * 60000));
                      setEndVal(fromDate(end, getLocalTimeZone()));
                    }
                  } catch {}
                }}
              />
              <DatePicker
                label="Selesai"
                granularity="minute"
                value={endVal as any}
                minValue={startVal as any}
                onChange={(v) => setEndVal(v)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input type="number" label="Durasi (menit)" value={String(fDuration)} onChange={(e) => setFDuration(Number(e.target.value || 0))} />
              <Input type="number" label="Jumlah Soal" value={String(fTotalQuestions)} onChange={(e) => setFTotalQuestions(Number(e.target.value || 0))} />
            </div>
            <div className="flex items-center gap-4">
              <Switch isSelected={fRandomizeQs} onValueChange={setFRandomizeQs}>Acak Soal</Switch>
              <Switch isSelected={fRandomizeOpts} onValueChange={setFRandomizeOpts}>Acak Opsi</Switch>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => { setOpen(false); setEditingId(null); }}>Batal</Button>
            <Button color="primary" onPress={submit}>Simpan</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
