"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem } from "@heroui/react";
import toast from "react-hot-toast";

type IdName = { id: string; name: string };
type AcademicYear = { id: string; label: string; isActive?: boolean };
type Period = { id: string; type: string; isActive?: boolean };
type Room = { id: string; name: string };

export default function ExamRoomModal({ isOpen, onOpenChange, presetRoomId, onCreated }: {
  isOpen: boolean; onOpenChange: (v: boolean) => void;
  presetRoomId?: string | null;
  onCreated?: () => void;
}) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [classes, setClasses] = useState<IdName[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);

  const [roomId, setRoomId] = useState<string | null>(null);
  const [selClasses, setSelClasses] = useState<Set<string>>(new Set());
  const [yearId, setYearId] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const [rrooms, rclasses, ryrs] = await Promise.all([
          axios.get<{ data: any[] }>("/api/rooms", { params: { perPage: 200 } }),
          axios.get<{ data: any[] }>("/api/classes", { params: { perPage: 200 } }),
          axios.get<{ data: any[] }>("/api/academic-years", { params: { perPage: 200 } }),
        ]);
        setRooms((rrooms.data.data || []).map((r: any) => ({ id: r.id, name: r.name })));
        setClasses((rclasses.data.data || []).map((c: any) => ({ id: c.id, name: c.name })));
        const ys = (ryrs.data.data || []) as AcademicYear[];
        setYears(ys);
        const active = ys.find((y) => y.isActive) || ys[0] || null;
        setYearId(active ? active.id : null);
        setRoomId(presetRoomId || null);
      } catch {
        setRooms([]); setClasses([]); setYears([]); setYearId(null);
      }
    })();
  }, [isOpen, presetRoomId]);

  useEffect(() => {
    if (!yearId) { setPeriods([]); setPeriodId(null); return; }
    (async () => {
      try {
        const r = await axios.get<{ data: any[] }>("/api/periods", { params: { academicYearId: yearId, perPage: 200 } });
        const ps = (r.data.data || []) as Period[];
        setPeriods(ps);
        const act = ps.find((p) => p.isActive) || ps[0] || null;
        setPeriodId(act ? act.id : null);
      } catch { setPeriods([]); setPeriodId(null); }
    })();
  }, [yearId]);

  const save = async () => {
    try {
      if (!roomId || !yearId || !periodId || selClasses.size === 0) {
        toast.error("Lengkapi ruangan, tahun, periode, dan kelas");
        return;
      }
      const payload = { roomId, academicYearId: yearId, periodId, classIds: Array.from(selClasses) };
      await axios.post('/api/exam-rooms', payload);
      toast.success("Ruang ujian dibuat");
      onOpenChange(false);
      onCreated && onCreated();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Gagal membuat ruang ujian');
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur">
      <ModalContent>
        {() => (
          <>
            <ModalHeader>Buat Ruang Ujian</ModalHeader>
            <ModalBody className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Select label="Ruangan" selectedKeys={new Set(roomId ? [roomId] : [])} onSelectionChange={(keys) => { const k = Array.from(keys as Set<string>)[0] || null; setRoomId(k); }} items={rooms.map((r) => ({ key: r.id, label: r.name }))}>
                {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
              </Select>
              <Select label="Tahun Ajaran" selectedKeys={new Set(yearId ? [yearId] : [])} onSelectionChange={(keys) => { const k = Array.from(keys as Set<string>)[0] || null; setYearId(k); }} items={years.map((y) => ({ key: y.id, label: y.label + ((y as any).isActive ? ' (Aktif)' : '') }))}>
                {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
              </Select>
              <Select label="Periode" selectedKeys={new Set(periodId ? [periodId] : [])} onSelectionChange={(keys) => { const k = Array.from(keys as Set<string>)[0] || null; setPeriodId(k); }} items={periods.map((p) => ({ key: p.id, label: p.type + ((p as any).isActive ? ' (Aktif)' : '') }))}>
                {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
              </Select>
              <Select label="Kelas" selectionMode="multiple" selectedKeys={selClasses} onSelectionChange={(keys) => setSelClasses(new Set(Array.from(keys as Set<string>)))} items={classes.map((c) => ({ key: c.id, label: c.name }))}>
                {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
              </Select>
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
