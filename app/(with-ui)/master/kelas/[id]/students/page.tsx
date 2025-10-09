"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { Button, Chip, Switch } from "@heroui/react";
import DataTable, { type FetchParams, type Paged } from "@/components/DataTable";
import toast from "react-hot-toast";

type Row = { userId: string; name: string; nis?: string | null; status?: string | null };

export default function ClassStudentsPage() {
  const params = useParams<{ id: string }>();
  const classId = params?.id as string;
  const [reloadKey, setReloadKey] = useState(0);
  const [className, setClassName] = useState<string>("");

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Siswa Kelas</h1>
          {className && <p className="text-sm opacity-70">Kelas: {className}</p>}
        </div>
      </div>

      <DataTable<Row>
        externalReloadKey={reloadKey + classId}
        searchPlaceholder="Cari siswa..."
        columns={[
          { key: "name", header: "Nama" },
          { key: "nis", header: "NIS", render: (r) => (<span className="font-mono text-xs">{r.nis || "-"}</span>) },
          { key: "status", header: "Status", render: (r) => (<Chip size="sm" variant="flat" color={(r.status || '').toUpperCase() === 'AKTIF' ? 'success' : 'default'}>{r.status || '-'}</Chip>) },
          { key: "actions", header: "Aksi", render: (r) => (
            <div className="flex items-center gap-3">
              <Switch isSelected={(r.status || '').toUpperCase() === 'AKTIF'} onValueChange={(v) => toggleActive(r, v)}>Aktif</Switch>
            </div>
          ) },
        ]}
        rowKey={(r) => r.userId}
        fetchData={async ({ page, perPage, q }: FetchParams): Promise<Paged<Row>> => {
          const res = await axios.get(`/api/classes/${classId}/students?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}`);
          return res.data as Paged<Row>;
        }}
      />
    </div>
  );
}

