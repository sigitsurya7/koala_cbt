"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Switch } from "@heroui/react";
import axios from "axios";
import toast from "react-hot-toast";

type UserRow = { id: string; name: string; email: string; type: string; isSuperAdmin: boolean };

type School = { id: string; name: string; code: string };
type Department = { id: string; name: string };
type ClassRow = { id: string; name: string };
type Subject = { id: string; name: string };

type Props = {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  user: UserRow | null;
};

export default function UserDetailModal({ isOpen, onOpenChange, user }: Props) {
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [userDetail, setUserDetail] = useState<any>({ fullName: "", gender: "", birthPlace: "", birthDate: "", phone: "", address: "", religion: "", avatarUrl: "" });
  const [student, setStudent] = useState<any>({ schoolId: "", classId: "", departmentId: "", nis: "", nisn: "", entryYear: "", status: "", guardianName: "", guardianPhone: "", guardianJob: "", address: "" });
  const [teacher, setTeacher] = useState<any>({ schoolId: "", nip: "", nuptk: "", subjectId: "", position: "", education: "", phone: "", address: "", isActive: true });
  const [staff, setStaff] = useState<any>({ schoolId: "", nip: "", position: "", phone: "", address: "", isActive: true });

  useEffect(() => {
    if (!isOpen || !user) return;
    (async () => {
      try {
        setLoading(true);
        const [sc] = await Promise.all([
          axios.get<{ schools: School[] }>("/api/schools?all=1"),
        ]);
        setSchools(sc.data.schools);
        const res = await axios.get(`/api/users/${user.id}/detail`);
        if (res.data.userDetail) setUserDetail({ ...userDetail, ...res.data.userDetail, birthDate: res.data.userDetail.birthDate ? String(res.data.userDetail.birthDate).slice(0, 10) : "" });
        if (res.data.studentDetail) setStudent({ ...student, ...res.data.studentDetail });
        if (res.data.teacherDetail) setTeacher({ ...teacher, ...res.data.teacherDetail });
        if (res.data.staffDetail) setStaff({ ...staff, ...res.data.staffDetail });
      } catch {}
      finally { setLoading(false); }
    })();
  }, [isOpen, user]);

  useEffect(() => {
    const schoolId = student.schoolId || teacher.schoolId || staff.schoolId;
    if (schoolId) {
      axios.get(`/api/departments?all=1&schoolId=${schoolId}`).then((r) => setDepartments((r.data.items || r.data.data || []).map((x: any) => ({ id: x.id, name: x.name }))));
      axios.get(`/api/classes?page=1&perPage=999&schoolId=${schoolId}`).then((r) => setClasses((r.data.data || []).map((x: any) => ({ id: x.id, name: x.name }))));
      axios.get(`/api/subjects?schoolId=${schoolId}`).then((r) => setSubjects((r.data.items || []).map((x: any) => ({ id: x.id, name: x.name }))));
    }
  }, [student.schoolId, teacher.schoolId, staff.schoolId]);

  const save = async () => {
    if (!user) return;
    try {
      const payload: any = { userDetail: { ...userDetail, birthDate: userDetail.birthDate || null } };
      if (user.type === "SISWA") payload.studentDetail = { ...student, schoolId: student.schoolId };
      if (user.type === "GURU") payload.teacherDetail = { ...teacher, schoolId: teacher.schoolId };
      if (user.type === "STAFF") payload.staffDetail = { ...staff, schoolId: staff.schoolId };
      await axios.put(`/api/users/${user.id}/detail`, payload);
      toast.success("Detail disimpan");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menyimpan detail");
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="5xl" backdrop="blur">
      <ModalContent>
        {() => (
          <>
            <ModalHeader>Detail User</ModalHeader>
            <ModalBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nama Lengkap" labelPlacement="outside" value={userDetail.fullName} onChange={(e) => setUserDetail((d: any) => ({ ...d, fullName: e.target.value }))} />
              <Select label="Gender" labelPlacement="outside" selectedKeys={new Set(userDetail.gender ? [userDetail.gender] : [])} onSelectionChange={(keys) => { const k = Array.from(keys as Set<string>)[0]; setUserDetail((d: any) => ({ ...d, gender: k ?? null })); }} items={[{ key: "L", label: "Laki-laki" }, { key: "P", label: "Perempuan" }]}>
                {(it) => <SelectItem key={it.key}>{it.label}</SelectItem>}
              </Select>
              <Input label="Tempat Lahir" labelPlacement="outside" value={userDetail.birthPlace || ""} onChange={(e) => setUserDetail((d: any) => ({ ...d, birthPlace: e.target.value }))} />
              <Input type="date" label="Tanggal Lahir" labelPlacement="outside" value={userDetail.birthDate || ""} onChange={(e) => setUserDetail((d: any) => ({ ...d, birthDate: e.target.value }))} />
              <Input label="Telepon" labelPlacement="outside" value={userDetail.phone || ""} onChange={(e) => setUserDetail((d: any) => ({ ...d, phone: e.target.value }))} />
              <Input label="Alamat" labelPlacement="outside" value={userDetail.address || ""} onChange={(e) => setUserDetail((d: any) => ({ ...d, address: e.target.value }))} />
              <Input label="Agama" labelPlacement="outside" value={userDetail.religion || ""} onChange={(e) => setUserDetail((d: any) => ({ ...d, religion: e.target.value }))} />
              <Input label="Avatar URL" labelPlacement="outside" value={userDetail.avatarUrl || ""} onChange={(e) => setUserDetail((d: any) => ({ ...d, avatarUrl: e.target.value }))} />

              {user?.type === "SISWA" && (
                <>
                  <Select label="Sekolah" labelPlacement="outside" selectedKeys={new Set(student.schoolId ? [student.schoolId] : [])} onSelectionChange={(keys) => { const k = Array.from(keys as Set<string>)[0]; setStudent((s: any) => ({ ...s, schoolId: k ?? s.schoolId })); }} items={schools}>
                    {(it: any) => <SelectItem key={it.id}>{it.name}</SelectItem>}
                  </Select>
                  <Select label="Kelas" labelPlacement="outside" selectedKeys={new Set(student.classId ? [student.classId] : [])} onSelectionChange={(keys) => { const k = Array.from(keys as Set<string>)[0]; setStudent((s: any) => ({ ...s, classId: k ?? s.classId })); }} items={classes}>
                    {(it: any) => <SelectItem key={it.id}>{it.name}</SelectItem>}
                  </Select>
                  <Select label="Jurusan" labelPlacement="outside" selectedKeys={new Set(student.departmentId ? [student.departmentId] : [])} onSelectionChange={(keys) => { const k = Array.from(keys as Set<string>)[0]; setStudent((s: any) => ({ ...s, departmentId: k ?? s.departmentId })); }} items={departments}>
                    {(it: any) => <SelectItem key={it.id}>{it.name}</SelectItem>}
                  </Select>
                  <Input label="NIS" labelPlacement="outside" value={student.nis || ""} onChange={(e) => setStudent((s: any) => ({ ...s, nis: e.target.value }))} />
                  <Input label="NISN" labelPlacement="outside" value={student.nisn || ""} onChange={(e) => setStudent((s: any) => ({ ...s, nisn: e.target.value }))} />
                  <Input label="Tahun Masuk" type="number" labelPlacement="outside" value={student.entryYear || ""} onChange={(e) => setStudent((s: any) => ({ ...s, entryYear: Number(e.target.value || 0) }))} />
                  <Input label="Status" labelPlacement="outside" value={student.status || ""} onChange={(e) => setStudent((s: any) => ({ ...s, status: e.target.value }))} />
                  <Input label="Nama Wali" labelPlacement="outside" value={student.guardianName || ""} onChange={(e) => setStudent((s: any) => ({ ...s, guardianName: e.target.value }))} />
                  <Input label="Telepon Wali" labelPlacement="outside" value={student.guardianPhone || ""} onChange={(e) => setStudent((s: any) => ({ ...s, guardianPhone: e.target.value }))} />
                  <Input label="Pekerjaan Wali" labelPlacement="outside" value={student.guardianJob || ""} onChange={(e) => setStudent((s: any) => ({ ...s, guardianJob: e.target.value }))} />
                  <Input label="Alamat Siswa" labelPlacement="outside" value={student.address || ""} onChange={(e) => setStudent((s: any) => ({ ...s, address: e.target.value }))} />
                </>
              )}

              {user?.type === "GURU" && (
                <>
                  <Select label="Sekolah" labelPlacement="outside" selectedKeys={new Set(teacher.schoolId ? [teacher.schoolId] : [])} onSelectionChange={(keys) => { const k = Array.from(keys as Set<string>)[0]; setTeacher((t: any) => ({ ...t, schoolId: k ?? t.schoolId })); }} items={schools}>
                    {(it: any) => <SelectItem key={it.id}>{it.name}</SelectItem>}
                  </Select>
                  <Select label="Mapel Utama" labelPlacement="outside" selectedKeys={new Set(teacher.subjectId ? [teacher.subjectId] : [])} onSelectionChange={(keys) => { const k = Array.from(keys as Set<string>)[0]; setTeacher((t: any) => ({ ...t, subjectId: k ?? t.subjectId })); }} items={subjects}>
                    {(it: any) => <SelectItem key={it.id}>{it.name}</SelectItem>}
                  </Select>
                  <Input label="NIP" labelPlacement="outside" value={teacher.nip || ""} onChange={(e) => setTeacher((t: any) => ({ ...t, nip: e.target.value }))} />
                  <Input label="NUPTK" labelPlacement="outside" value={teacher.nuptk || ""} onChange={(e) => setTeacher((t: any) => ({ ...t, nuptk: e.target.value }))} />
                  <Input label="Jabatan" labelPlacement="outside" value={teacher.position || ""} onChange={(e) => setTeacher((t: any) => ({ ...t, position: e.target.value }))} />
                  <Input label="Pendidikan" labelPlacement="outside" value={teacher.education || ""} onChange={(e) => setTeacher((t: any) => ({ ...t, education: e.target.value }))} />
                  <Input label="Telepon" labelPlacement="outside" value={teacher.phone || ""} onChange={(e) => setTeacher((t: any) => ({ ...t, phone: e.target.value }))} />
                  <Input label="Alamat" labelPlacement="outside" value={teacher.address || ""} onChange={(e) => setTeacher((t: any) => ({ ...t, address: e.target.value }))} />
                  <div className="flex items-center gap-3"><Switch isSelected={!!teacher.isActive} onValueChange={(v) => setTeacher((t: any) => ({ ...t, isActive: v }))}>Aktif</Switch></div>
                </>
              )}

              {user?.type === "STAFF" && (
                <>
                  <Select label="Sekolah" labelPlacement="outside" selectedKeys={new Set(staff.schoolId ? [staff.schoolId] : [])} onSelectionChange={(keys) => { const k = Array.from(keys as Set<string>)[0]; setStaff((s: any) => ({ ...s, schoolId: k ?? s.schoolId })); }} items={schools}>
                    {(it: any) => <SelectItem key={it.id}>{it.name}</SelectItem>}
                  </Select>
                  <Input label="NIP" labelPlacement="outside" value={staff.nip || ""} onChange={(e) => setStaff((s: any) => ({ ...s, nip: e.target.value }))} />
                  <Input label="Posisi" labelPlacement="outside" value={staff.position || ""} onChange={(e) => setStaff((s: any) => ({ ...s, position: e.target.value }))} />
                  <Input label="Telepon" labelPlacement="outside" value={staff.phone || ""} onChange={(e) => setStaff((s: any) => ({ ...s, phone: e.target.value }))} />
                  <Input label="Alamat" labelPlacement="outside" value={staff.address || ""} onChange={(e) => setStaff((s: any) => ({ ...s, address: e.target.value }))} />
                  <div className="flex items-center gap-3"><Switch isSelected={!!staff.isActive} onValueChange={(v) => setStaff((s: any) => ({ ...s, isActive: v }))}>Aktif</Switch></div>
                </>
              )}
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
