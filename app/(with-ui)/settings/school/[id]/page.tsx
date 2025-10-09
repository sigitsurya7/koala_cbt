"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import { Button, Chip, User, Card, CardBody } from "@heroui/react";
import DataTable, { type FetchParams, type Paged } from "@/components/DataTable";
import AcademicYearModal from "./components/AcademicYearModal";
import SchoolSettingModal from "./components/SchoolSettingModal";
import PeriodModal from "./components/PeriodModal";
import ConfirmModal from "@/components/ConfirmModal";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

type School = { id: string; name: string; code: string; logoUrl?: string | null; isActive: boolean };
type AcademicYear = { id: string; label: string; startDate: string; endDate: string; isActive: boolean };
type SchoolSetting = { id: string; key: string; type: string; value: string; updatedAt: string };
type Period = { id: string; academicYearId: string; type: string; startDate: string; endDate: string; isActive: boolean };

export default function SchoolDetailPage() {
  const params = useParams();
  const schoolId = String(params?.id || "");
  const router = useRouter();

  const [school, setSchool] = useState<School | null>(null);
  const [reloadAY, setReloadAY] = useState(0);
  const [reloadSS, setReloadSS] = useState(0);
  const [reloadPD, setReloadPD] = useState(0);

  const [ayOpen, setAyOpen] = useState(false);
  const [ayEditing, setAyEditing] = useState<AcademicYear | null>(null);
  const [ayConfirm, setAyConfirm] = useState<{ open: boolean; target?: AcademicYear | null }>({ open: false });

  const [ssOpen, setSsOpen] = useState(false);
  const [ssEditing, setSsEditing] = useState<SchoolSetting | null>(null);
  const [ssConfirm, setSsConfirm] = useState<{ open: boolean; target?: SchoolSetting | null }>({ open: false });

  const [pdOpen, setPdOpen] = useState(false);
  const [pdEditing, setPdEditing] = useState<Period | null>(null);
  const [pdConfirm, setPdConfirm] = useState<{ open: boolean; target?: Period | null }>({ open: false });

  const [ayList, setAyList] = useState<Array<{ id: string; label: string }>>([]);

  useEffect(() => {
    if (!schoolId) return;
    axios.get(`/api/schools/${schoolId}`).then((res) => setSchool(res.data.school)).catch(() => setSchool(null));
  }, [schoolId]);

  useEffect(() => {
    // keep AY list for Period modal select
    const loadAllAY = async () => {
      const res = await axios.get(`/api/academic-years?page=1&perPage=999&schoolId=${schoolId}`);
      const items = (res.data.data || []) as AcademicYear[];
      setAyList(items.map((i) => ({ id: i.id, label: i.label })));
    };
    if (schoolId) loadAllAY();
  }, [schoolId, reloadAY]);

  if (!school) return <div>Memuat...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar left: Logo + basic */}
      <div className="lg:col-span-1">
        <Card>
          <CardBody className="flex flex-col items-center gap-4">
            <User name={school.name} description={school.code} avatarProps={{ src: school.logoUrl ?? undefined, name: school.name.charAt(0) }} />
            <Chip size="sm" color={school.isActive ? "success" : "default"} variant="flat">{school.isActive ? "Aktif" : "Tidak Aktif"}</Chip>
            <div className="text-xs opacity-60">ID: {school.id}</div>
            <Button size="sm" onPress={() => router.push(`/settings/school`)}>Kembali</Button>
          </CardBody>
        </Card>
      </div>

      {/* Content right */}
      <div className="lg:col-span-3 space-y-8">
        {/* Academic Years */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Tahun Ajaran</h2>
            <Button size="sm" color="primary" onPress={() => { setAyEditing(null); setAyOpen(true); }}>Tambah</Button>
          </div>
          <DataTable<AcademicYear>
            externalReloadKey={reloadAY}
            searchPlaceholder="Cari tahun ajaran..."
            columns={[
              { key: "label", header: "Label" },
              { key: "startDate", header: "Mulai" },
              { key: "endDate", header: "Selesai" },
              { key: "isActive", header: "Status", render: (i) => (<Chip size="sm" color={i.isActive ? "success" : "default"} variant="flat">{i.isActive ? "Aktif" : "Nonaktif"}</Chip>) },
              { key: "actions", header: "Aksi", render: (i) => (
                <div className="flex gap-2">
                  <Button size="sm" variant="flat" onPress={() => { setAyEditing(i); setAyOpen(true); }}>Edit</Button>
                  <Button size="sm" color="danger" variant="flat" onPress={() => setAyConfirm({ open: true, target: i })}>Hapus</Button>
                </div>
              ) },
            ]}
            rowKey={(i) => i.id}
            fetchData={async ({ page, perPage, q }: FetchParams): Promise<Paged<AcademicYear>> => {
              const res = await axios.get(`/api/academic-years?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}&schoolId=${schoolId}`);
              return res.data as Paged<AcademicYear>;
            }}
          />
        </section>

        {/* School Settings */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Settings</h2>
            <Button size="sm" color="primary" onPress={() => { setSsEditing(null); setSsOpen(true); }}>Tambah</Button>
          </div>
          <DataTable<SchoolSetting>
            externalReloadKey={reloadSS}
            searchPlaceholder="Cari setting..."
            columns={[
              { key: "key", header: "Key" },
              { key: "type", header: "Type" },
              { key: "value", header: "Value" },
              { key: "actions", header: "Aksi", render: (i) => (
                <div className="flex gap-2">
                  <Button size="sm" variant="flat" onPress={() => { setSsEditing(i); setSsOpen(true); }}>Edit</Button>
                  <Button size="sm" color="danger" variant="flat" onPress={() => setSsConfirm({ open: true, target: i })}>Hapus</Button>
                </div>
              ) },
            ]}
            rowKey={(i) => i.id}
            fetchData={async ({ page, perPage, q }: FetchParams): Promise<Paged<SchoolSetting>> => {
              const res = await axios.get(`/api/school-settings?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}&schoolId=${schoolId}`);
              return res.data as Paged<SchoolSetting>;
            }}
          />
        </section>

        {/* Periods */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Periode</h2>
            <Button size="sm" color="primary" onPress={() => { setPdEditing(null); setPdOpen(true); }}>Tambah</Button>
          </div>
          <DataTable<Period>
            externalReloadKey={reloadPD}
            searchPlaceholder="Cari periode..."
            columns={[
              { key: "type", header: "Jenis" },
              { key: "startDate", header: "Mulai" },
              { key: "endDate", header: "Selesai" },
              { key: "isActive", header: "Status", render: (i) => (<Chip size="sm" color={i.isActive ? "success" : "default"} variant="flat">{i.isActive ? "Aktif" : "Nonaktif"}</Chip>) },
              { key: "actions", header: "Aksi", render: (i) => (
                <div className="flex gap-2">
                  <Button size="sm" variant="flat" onPress={() => { setPdEditing(i); setPdOpen(true); }}>Edit</Button>
                  <Button size="sm" color="danger" variant="flat" onPress={() => setPdConfirm({ open: true, target: i })}>Hapus</Button>
                </div>
              ) },
            ]}
            rowKey={(i) => i.id}
            fetchData={async ({ page, perPage }: FetchParams): Promise<Paged<Period>> => {
              const res = await axios.get(`/api/periods?page=${page}&perPage=${perPage}&schoolId=${schoolId}`);
              return res.data as Paged<Period>;
            }}
          />
        </section>
      </div>

      <AcademicYearModal isOpen={ayOpen} onOpenChange={setAyOpen} onSaved={() => setReloadAY((k) => k + 1)} schoolId={schoolId} initial={ayEditing} />
      <SchoolSettingModal isOpen={ssOpen} onOpenChange={setSsOpen} onSaved={() => setReloadSS((k) => k + 1)} schoolId={schoolId} initial={ssEditing} />
      <PeriodModal isOpen={pdOpen} onOpenChange={setPdOpen} onSaved={() => setReloadPD((k) => k + 1)} schoolId={schoolId} academicYears={ayList} initial={pdEditing} />

      <ConfirmModal
        isOpen={ayConfirm.open}
        onOpenChange={(v) => setAyConfirm({ open: v, target: v ? ayConfirm.target : null })}
        title="Hapus Tahun Ajaran"
        description={ayConfirm.target ? `Yakin hapus TA "${ayConfirm.target.label}"?` : undefined}
        confirmLabel="Hapus"
        confirmColor="danger"
        onConfirm={async () => {
          try {
            if (ayConfirm.target) await axios.delete(`/api/academic-years/${ayConfirm.target.id}`);
            setReloadAY((k) => k + 1);
            toast.success("Tahun ajaran dihapus");
          } catch (e: any) {
            toast.error(e?.response?.data?.message || "Gagal menghapus");
          }
        }}
      />
      <ConfirmModal
        isOpen={ssConfirm.open}
        onOpenChange={(v) => setSsConfirm({ open: v, target: v ? ssConfirm.target : null })}
        title="Hapus Setting"
        description={ssConfirm.target ? `Yakin hapus setting "${ssConfirm.target.key}"?` : undefined}
        confirmLabel="Hapus"
        confirmColor="danger"
        onConfirm={async () => {
          try {
            if (ssConfirm.target) await axios.delete(`/api/school-settings/${ssConfirm.target.id}`);
            setReloadSS((k) => k + 1);
            toast.success("Setting dihapus");
          } catch (e: any) {
            toast.error(e?.response?.data?.message || "Gagal menghapus");
          }
        }}
      />
      <ConfirmModal
        isOpen={pdConfirm.open}
        onOpenChange={(v) => setPdConfirm({ open: v, target: v ? pdConfirm.target : null })}
        title="Hapus Periode"
        description={pdConfirm.target ? `Yakin hapus periode "${pdConfirm.target.type}"?` : undefined}
        confirmLabel="Hapus"
        confirmColor="danger"
        onConfirm={async () => {
          try {
            if (pdConfirm.target) await axios.delete(`/api/periods/${pdConfirm.target.id}`);
            setReloadPD((k) => k + 1);
            toast.success("Periode dihapus");
          } catch (e: any) {
            toast.error(e?.response?.data?.message || "Gagal menghapus");
          }
        }}
      />
    </div>
  );
}
