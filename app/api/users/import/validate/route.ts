import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";

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

function genPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const specials = "!@#$%";
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const parts = [pick(upper), pick(lower), pick(digits), pick(specials)];
  const rest = Array.from({ length: 2 }, () => pick(lower)).join("");
  return (parts.join("") + rest).slice(0, 6);
}

function normalizeKey(k: string) {
  return k.toLowerCase().replace(/\s+/g, " ").trim();
}

function mapRow(obj: any): Row {
  const keys = Object.keys(obj);
  const get = (...aliases: string[]) => {
    for (const a of aliases) {
      const idx = keys.findIndex((k) => normalizeKey(k) === normalizeKey(a));
      if (idx >= 0) return obj[keys[idx]];
    }
    return undefined;
  };
  const r: Row = {
    fullName: get("fullName", "nama lengkap", "nama") || "",
    nis: get("nis") || "",
    className: get("className", "kelas", "nama kelas"),
    departmentName: get("departmentName", "jurusan", "nama jurusan"),
    entryYear: get("entryYear", "tahun masuk", "tahun ajaran") ?? undefined,
    gender: get("gender", "jenis kelamin", "jk") ?? undefined,
    birthPlace: get("birthPlace", "tempat lahir") ?? undefined,
    birthDate: get("birthDate", "tanggal lahir") ?? undefined,
    guardianName: get("guardianName", "orang tua / wali", "nama orang tua atau wali", "nama wali", "nama orang tua") ?? undefined,
    guardianPhone: get("guardianPhone", "telepon orang tua / wali", "telepon wali", "no hp wali", "no telp wali") ?? undefined,
    guardianJob: get("guardianJob", "pekerjaan orang tua / wali", "pekerjaan wali") ?? undefined,
    address: get("address", "alamat") ?? undefined,
    status: get("status", "status siswa") ?? undefined,
  } as any;
  if (r.birthDate instanceof Date) r.birthDate = r.birthDate.toISOString().slice(0, 10) as any;
  if (typeof r.entryYear === "string") {
    const parsed = parseInt(r.entryYear as any, 10);
    r.entryYear = isNaN(parsed) ? undefined : parsed;
  }
  return r;
}

export async function POST(req: NextRequest) {
  const deny = await requirePermission(req, { action: "CREATE", resource: "API/USERS" });
  if (deny) return deny;
  const body = await req.json();
  const schoolId: string = body?.schoolId;
  const rawRows: any[] = Array.isArray(body?.rows) ? body.rows : [];
  const rows: Row[] = rawRows.map(mapRow);
  if (!schoolId || rows.length === 0) return NextResponse.json({ message: "schoolId dan rows wajib" }, { status: 400 });

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true, code: true } });
  if (!school) return NextResponse.json({ message: "Sekolah tidak ditemukan" }, { status: 404 });

  const nisList = rows.map((r) => r.nis).filter(Boolean);
  const existingNis = await prisma.studentDetail.findMany({ where: { schoolId, nis: { in: nisList } }, select: { nis: true } });
  const emailList = nisList.map((n) => `${n}@${school.code}.com`.toLowerCase());
  const usernameList = nisList.map((n) => `${school.code.toLowerCase()}_${n}`.toLowerCase());
  const [existingEmails, existingUsernames] = await Promise.all([
    prisma.user.findMany({ where: { email: { in: emailList } }, select: { email: true } }),
    prisma.user.findMany({ where: { username: { in: usernameList } }, select: { username: true } }),
  ]);

  const classMap = new Map<string, string>();
  const deptMap = new Map<string, string>();
  const classes = await prisma.class.findMany({ where: { schoolId }, select: { id: true, name: true } });
  classes.forEach((c) => classMap.set(c.name.toLowerCase(), c.id));
  const depts = await prisma.department.findMany({ where: { schoolId }, select: { id: true, name: true } });
  depts.forEach((d) => deptMap.set(d.name.toLowerCase(), d.id));

  const errors: Array<{ row: number; message: string }> = [];
  const prepared: any[] = [];

  rows.forEach((r, idx) => {
    if (!r.fullName || !r.nis) {
      errors.push({ row: idx + 2, message: "fullName dan nis wajib" });
      return;
    }
    if (existingNis.find((e) => e.nis === r.nis)) {
      errors.push({ row: idx + 2, message: `NIS ${r.nis} sudah terpakai` });
      return;
    }
    const email = `${r.nis}@${school.code}.com`.toLowerCase();
    const username = `${school.code.toLowerCase()}_${r.nis}`;
    if (existingEmails.find((e) => e.email === email)) {
      errors.push({ row: idx + 2, message: `Email ${email} sudah terpakai` });
      return;
    }
    if (existingUsernames.find((e) => e.username === username)) {
      errors.push({ row: idx + 2, message: `Username ${username} sudah terpakai` });
      return;
    }
    const classId = r.className ? classMap.get(r.className.toLowerCase()) : undefined;
    const departmentId = r.departmentName ? deptMap.get(r.departmentName.toLowerCase()) : undefined;
    if (r.className && !classId) errors.push({ row: idx + 2, message: `Kelas '${r.className}' tidak ditemukan` });
    if (r.departmentName && !departmentId) errors.push({ row: idx + 2, message: `Jurusan '${r.departmentName}' tidak ditemukan` });
    const passwordPlain = genPassword();
    prepared.push({
      fullName: r.fullName,
      nis: r.nis,
      email,
      username,
      passwordPlain,
      schoolId,
      classId: classId || null,
      className: r.className || null,
      departmentId: departmentId || null,
      departmentName: r.departmentName || null,
      entryYear: r.entryYear || null,
      gender: r.gender || null,
      birthPlace: r.birthPlace || null,
      birthDate: r.birthDate || null,
      guardianName: r.guardianName || null,
      guardianPhone: r.guardianPhone || null,
      guardianJob: r.guardianJob || null,
      address: r.address || null,
      status: r.status || null,
    });
  });

  const ok = errors.length === 0;
  return NextResponse.json({ ok, errors, items: prepared });
}
