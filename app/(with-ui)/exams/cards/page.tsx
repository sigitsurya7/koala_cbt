"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { Button, Select, SelectItem } from "@heroui/react";
import DataTable, { type FetchParams, type Paged } from "@/components/DataTable";
import ExamRoomModal from "./component/ExamRoomModal";
import { useApp } from "@/stores/useApp";

type RoomRow = { id: string; name: string; capacity?: number | null; isActive: boolean };

export default function ExamCardsPage() {
  const app = useApp();
  const isSuperAdmin = !!app.user?.isSuperAdmin;
  const schools = useMemo(() => app.schools || [], [app.schools]);
  const activeSchoolId = app.activeSchoolId || (isSuperAdmin && schools.length > 0 ? schools[0].id : "");
  const [reloadKey, setReloadKey] = useState(0);
  const setActiveSchool = app.setActiveSchool;
  const schoolItems = useMemo(() => schools.map((s) => ({ key: s.id, label: `${s.name} (${s.code})` })), [schools]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const openCreate = (roomId?: string) => {
    setSelectedRoomId(roomId || null);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Kartu Ujian</h1>
          <p className="text-sm opacity-70">Kelola ruang ujian dan anggota untuk pencetakan kartu.</p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <Select
              selectedKeys={activeSchoolId ? new Set([activeSchoolId]) : new Set([])}
              onSelectionChange={(keys) => {
                const k = Array.from(keys as Set<string>)[0];
                if (k) setActiveSchool(String(k)).then(() => setReloadKey((rk) => rk + 1)).catch(() => {});
              }}
              items={schoolItems}
            >
              {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
            </Select>
          )}
        </div>
      </div>

      <DataTable<RoomRow>
        externalReloadKey={`${reloadKey}-${activeSchoolId}`}
        searchPlaceholder="Cari ruangan..."
        columns={[
          { key: "name", header: "Nama Ruangan" },
          { key: "capacity", header: "Kapasitas", render: (r) => (r.capacity ?? "-") },
          { key: "isActive", header: "Status", render: (r) => (r.isActive ? "Aktif" : "Nonaktif") },
          // no actions per row per request
        ]}
        rowKey={(r) => r.id}
        fetchData={async ({ page, perPage, q }: FetchParams): Promise<Paged<RoomRow>> => {
          const params: Record<string, any> = { page, perPage, q };
          if (isSuperAdmin && activeSchoolId) params.schoolId = activeSchoolId;
          const res = await axios.get(`/api/rooms`, { params });
          return res.data as Paged<RoomRow>;
        }}
      />
    </div>
  );
}
