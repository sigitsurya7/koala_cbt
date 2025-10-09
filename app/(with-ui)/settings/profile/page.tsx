"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, CardBody, Chip, Divider, Input, Select, SelectItem, Skeleton, User, Switch } from "@heroui/react";
import axios from "axios";
import toast from "react-hot-toast";
import { useApp } from "@/stores/useApp";

type DetailResponse = {
  user: { id: string; name: string; email: string; type: string; isSuperAdmin: boolean };
  userDetail: any;
  studentDetail?: { class?: { name: string }; department?: { name: string }; school?: { id: string; name: string; code: string } } | null;
  teacherDetail?: { subject?: { name: string }; school?: { id: string; name: string; code: string } } | null;
  staffDetail?: { school?: { id: string; name: string; code: string } } | null;
};

export default function ProfilePage() {
  const app = useApp();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<DetailResponse | null>(null);

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<string | undefined>(undefined);
  const [birthPlace, setBirthPlace] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [religion, setReligion] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // typed fields
  const [classId, setClassId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [entryYear, setEntryYear] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [guardianName, setGuardianName] = useState<string>("");
  const [guardianPhone, setGuardianPhone] = useState<string>("");
  const [guardianJob, setGuardianJob] = useState<string>("");

  const [subjectId, setSubjectId] = useState<string>("");
  const [position, setPosition] = useState<string>("");
  const [education, setEducation] = useState<string>("");
  const [tPhone, setTPhone] = useState<string>("");
  const [tAddress, setTAddress] = useState<string>("");
  const [tActive, setTActive] = useState<boolean>(true);

  const [sPosition, setSPosition] = useState<string>("");
  const [sPhone, setSPhone] = useState<string>("");
  const [sAddress, setSAddress] = useState<string>("");
  const [sActive, setSActive] = useState<boolean>(true);

  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);

  const [currPw, setCurrPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confPw, setConfPw] = useState("");

  const userId = app.user?.id;

  useEffect(() => {
    (async () => {
      try {
        if (!app.user) await app.loadBootstrap();
        if (!userId) return;
        const res = await axios.get(`/api/users/${userId}/detail`);
        setDetail(res.data);
        const ud = res.data.userDetail || {};
        setFullName(ud.fullName || app.user?.name || "");
        setGender(ud.gender || undefined);
        setBirthPlace(ud.birthPlace || "");
        setBirthDate(ud.birthDate ? String(ud.birthDate).slice(0, 10) : "");
        setPhone(ud.phone || "");
        setAddress(ud.address || "");
        setReligion(ud.religion || "");
        // fetch lists for selects based on active school
        const schoolId = app.activeSchoolId;
        if (schoolId) {
          try {
            const [cls, deps, subs] = await Promise.all([
              axios.get(`/api/classes?page=1&perPage=999&schoolId=${schoolId}`),
              axios.get(`/api/departments?all=1&schoolId=${schoolId}`),
              axios.get(`/api/subjects?schoolId=${schoolId}`),
            ]);
            setClasses((cls.data.data || []).map((x: any) => ({ id: x.id, name: x.name })));
            setDepartments(((deps.data.items || deps.data.data) || []).map((x: any) => ({ id: x.id, name: x.name })));
            setSubjects((subs.data.items || []).map((x: any) => ({ id: x.id, name: x.name })));
          } catch {}
        }
        // init typed values if exist
        if (res.data.studentDetail) {
          const sd = res.data.studentDetail;
          setClassId(sd.class?.id || "");
          setDepartmentId(sd.department?.id || "");
          setEntryYear(sd.entryYear ? String(sd.entryYear) : "");
          setStatus(sd.status || "");
          setGuardianName(sd.guardianName || "");
          setGuardianPhone(sd.guardianPhone || "");
          setGuardianJob(sd.guardianJob || "");
        }
        if (res.data.teacherDetail) {
          const td = res.data.teacherDetail;
          setSubjectId(td.subject?.id || "");
          setPosition(td.position || "");
          setEducation(td.education || "");
          setTPhone(td.phone || "");
          setTAddress(td.address || "");
          setTActive(td.isActive ?? true);
        }
        if (res.data.staffDetail) {
          const st = res.data.staffDetail;
          setSPosition(st.position || "");
          setSPhone(st.phone || "");
          setSAddress(st.address || "");
          setSActive(st.isActive ?? true);
        }
      } catch (e) {
      } finally { setLoading(false); }
    })();
  }, [userId]);

  const avatarUrl = detail?.userDetail?.avatarUrl || "https://api.dicebear.com/7.x/thumbs/svg?seed=Koala";

  const saveDetail = async () => {
    try {
      if (!userId) return;
      const payload: any = { userDetail: { fullName, gender, birthPlace, birthDate: birthDate || null, phone, address, religion } };
      if (detail?.user?.type === "SISWA") payload.studentDetail = { schoolId: app.activeSchoolId, classId: classId || null, departmentId: departmentId || null, entryYear: entryYear ? Number(entryYear) : null, status, guardianName, guardianPhone, guardianJob, address };
      if (detail?.user?.type === "GURU") payload.teacherDetail = { schoolId: app.activeSchoolId, subjectId: subjectId || null, position, education, phone: tPhone, address: tAddress, isActive: tActive };
      if (detail?.user?.type === "STAFF") payload.staffDetail = { schoolId: app.activeSchoolId, position: sPosition, phone: sPhone, address: sAddress, isActive: sActive };
      await axios.put(`/api/users/${userId}/detail`, payload);
      toast.success("Detail disimpan");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal simpan detail");
    }
  };

  const uploadAvatar = async (file?: File | null) => {
    try {
      const f = file ?? avatarFile;
      if (!f || !userId) return;
      const fd = new FormData();
      fd.append("file", f);
      await axios.post(`/api/users/${userId}/avatar`, fd);
      toast.success("Avatar diupdate");
      setAvatarFile(null);
      const res = await axios.get(`/api/users/${userId}/detail`);
      setDetail(res.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal upload avatar");
    }
  };

  const changePassword = async () => {
    try {
      if (newPw !== confPw) { toast.error("Konfirmasi password tidak sama"); return; }
      await axios.post(`/api/users/change-password`, { currentPassword: currPw, newPassword: newPw });
      toast.success("Password diperbarui");
      setCurrPw(""); setNewPw(""); setConfPw("");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal mengganti password");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-w-0">
      <div className="lg:col-span-1">
        <Card>
          <CardBody className="flex flex-col items-center gap-4">
            {loading ? (
              <Skeleton className="h-24 w-24 rounded-full" />
            ) : (
              <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()} title="Klik untuk ganti foto profil">
                <User
                  name={detail?.user?.name}
                  description={detail?.user?.email}
                  avatarProps={{ src: avatarUrl, name: detail?.user?.name?.charAt(0) }}
                />
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={(e) => { const f = e.target.files?.[0] ?? null; setAvatarFile(f); uploadAvatar(f); }} />
            {detail?.user && (
              <>
                <Chip size="sm" variant="flat">{detail.user.type}</Chip>
                {/* Info spesifik tipe */}
                {detail.user.type === "GURU" && (
                  <div className="text-sm opacity-80">Mengajar: {detail.teacherDetail?.subject?.name || "-"}</div>
                )}
                {detail.user.type === "SISWA" && (
                  <div className="text-sm opacity-80">
                    Kelas: {detail.studentDetail?.class?.name || "-"}
                    <br />
                    Jurusan: {detail.studentDetail?.department?.name || "-"}
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="lg:col-span-3 space-y-8 min-w-0">
        <Card>
          <CardBody className="space-y-3">
            <div className="text-lg font-semibold">Ubah Password</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input type="password" label="Password Saat Ini" labelPlacement="outside" value={currPw} onChange={(e) => setCurrPw(e.target.value)} />
              <Input type="password" label="Password Baru" labelPlacement="outside" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
              <Input type="password" label="Konfirmasi Password" labelPlacement="outside" value={confPw} onChange={(e) => setConfPw(e.target.value)} />
            </div>
            <div className="flex justify-end"><Button color={"primary"} onPress={changePassword}>Simpan</Button></div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <div className="text-lg font-semibold">Detail Akun</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input label="Nama Lengkap" labelPlacement="outside" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <Select label="Gender" labelPlacement="outside" selectedKeys={new Set(gender ? [gender] : [])} onSelectionChange={(keys) => { const k = Array.from(keys as Set<string>)[0]; setGender(k as string); }} items={[{ key: "L", label: "Laki-laki" }, { key: "P", label: "Perempuan" }]}>
                {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
              </Select>
              <Input label="Tempat Lahir" labelPlacement="outside" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} />
              <Input type="date" label="Tanggal Lahir" labelPlacement="outside" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              <Input label="Telepon" labelPlacement="outside" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input label="Agama" labelPlacement="outside" value={religion} onChange={(e) => setReligion(e.target.value)} />
              <Input label="Alamat" labelPlacement="outside" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>

            {detail?.user?.type === "SISWA" && (
              <div className="space-y-2">
                <Divider />
                <div className="text-base font-semibold">Detail Siswa</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Select label="Kelas" labelPlacement="outside" selectedKeys={new Set(classId ? [classId] : [])} onSelectionChange={(keys) => setClassId(Array.from(keys as Set<string>)[0] || "")} items={classes}>
                    {(it: any) => <SelectItem key={it.id}>{it.name}</SelectItem>}
                  </Select>
                  <Select label="Jurusan" labelPlacement="outside" selectedKeys={new Set(departmentId ? [departmentId] : [])} onSelectionChange={(keys) => setDepartmentId(Array.from(keys as Set<string>)[0] || "")} items={departments}>
                    {(it: any) => <SelectItem key={it.id}>{it.name}</SelectItem>}
                  </Select>
                  <Input label="Tahun Masuk" type="number" labelPlacement="outside" value={entryYear} onChange={(e) => setEntryYear(e.target.value)} />
                  <Input label="Status" labelPlacement="outside" value={status} onChange={(e) => setStatus(e.target.value)} />
                  <Input label="Nama Wali" labelPlacement="outside" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />
                  <Input label="Telepon Wali" labelPlacement="outside" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} />
                  <Input label="Pekerjaan Wali" labelPlacement="outside" value={guardianJob} onChange={(e) => setGuardianJob(e.target.value)} />
                </div>
              </div>
            )}

            {detail?.user?.type === "GURU" && (
              <div className="space-y-2">
                <Divider />
                <div className="text-base font-semibold">Detail Guru</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Select label="Mapel Utama" labelPlacement="outside" selectedKeys={new Set(subjectId ? [subjectId] : [])} onSelectionChange={(keys) => setSubjectId(Array.from(keys as Set<string>)[0] || "")} items={subjects}>
                    {(it: any) => <SelectItem key={it.id}>{it.name}</SelectItem>}
                  </Select>
                  <Input label="Jabatan" labelPlacement="outside" value={position} onChange={(e) => setPosition(e.target.value)} />
                  <Input label="Pendidikan" labelPlacement="outside" value={education} onChange={(e) => setEducation(e.target.value)} />
                  <Input label="Telepon" labelPlacement="outside" value={tPhone} onChange={(e) => setTPhone(e.target.value)} />
                  <Input label="Alamat" labelPlacement="outside" value={tAddress} onChange={(e) => setTAddress(e.target.value)} />
                  <div className="flex items-center gap-3"><Switch isSelected={tActive} onValueChange={setTActive}>Aktif</Switch></div>
                </div>
              </div>
            )}

            {detail?.user?.type === "STAFF" && (
              <div className="space-y-2">
                <Divider />
                <div className="text-base font-semibold">Detail Staff</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input label="Posisi" labelPlacement="outside" value={sPosition} onChange={(e) => setSPosition(e.target.value)} />
                  <Input label="Telepon" labelPlacement="outside" value={sPhone} onChange={(e) => setSPhone(e.target.value)} />
                  <Input label="Alamat" labelPlacement="outside" value={sAddress} onChange={(e) => setSAddress(e.target.value)} />
                  <div className="flex items-center gap-3"><Switch isSelected={sActive} onValueChange={setSActive}>Aktif</Switch></div>
                </div>
              </div>
            )}
            <div className="flex justify-end"><Button color={"primary"} onPress={saveDetail}>Simpan</Button></div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
