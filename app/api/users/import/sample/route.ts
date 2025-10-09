import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/acl";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/USERS" });
  if (deny) return deny;

  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId") || undefined;
  if (!schoolId) return NextResponse.json({ message: "schoolId wajib" }, { status: 400 });
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { code: true, name: true } });
  if (!school) return NextResponse.json({ message: "Sekolah tidak ditemukan" }, { status: 404 });

  // types.ts (optional kalau mau pisah)
  interface Student {
    fullName: string;
    nis: string;
    className: string;
    departmentName: string;
    entryYear: number;
    gender: "L" | "P";
    birthPlace: string;
    birthDate: string;
    guardianName: string;
    guardianPhone: string;
    guardianJob: string;
    address: string;
    status: "Aktif" | "Nonaktif";
  }

  // utils
  const getRandom = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const firstNames = [
    "Budi", "Andi", "Rina", "Siti", "Dewi", "Ahmad", "Agus", "Tono", "Lina", "Wulan",
    "Bayu", "Fitri", "Rizky", "Dian", "Fajar", "Teguh", "Maya", "Dinda", "Reza", "Tari",
    "Arif", "Putri", "Bagus", "Nabila", "Dwi", "Rafi", "Citra", "Yoga", "Indah", "Rahmat",
    "Hana", "Eka", "Rama", "Salsa", "Doni", "Farah", "Gilang", "Laras", "Ayu", "Tegar",
    "Daffa", "Nadia", "Vina", "Ilham", "Anisa", "Vito", "Fauzan", "Rara", "Rendi", "Fina",
  ] as const;

  const lastNames = [
    "Santoso", "Saputra", "Wijaya", "Pratama", "Siregar", "Hidayat", "Nugraha", "Susanto",
    "Permata", "Lestari", "Maulana", "Putri", "Ramadhan", "Fauzi", "Gunawan", "Yulianto",
    "Syahputra", "Prabowo", "Wibowo", "Setiawan", "Kurniawan", "Suhendra", "Hardiansyah",
    "Iskandar", "Kusuma", "Mahendra", "Saputri", "Pangestu", "Saragih", "Wijayanti",
  ] as const;

  const guardianFirstNames = [
    "Sutrisno", "Kartini", "Supriyadi", "Rahmawati", "Yulianto", "Sulastri", "Mulyono",
    "Nuraini", "Setiawan", "Kusnadi", "Handayani", "Suprapto", "Rohmah", "Sumardi",
    "Taufik", "Sri", "Rusdi", "Wati", "Ismail", "Utami", "Warsito", "Sarif", "Jumadi",
    "Slamet", "Joko", "Nurhayati", "Tuminah", "Darto", "Suyono", "Herman",
  ] as const;

  const jobs = [
    "PNS", "Wiraswasta", "Guru", "Karyawan Swasta", "Petani", "Nelayan", "Pedagang",
    "Dokter", "Perawat", "Sopir", "Satpam", "Polisi", "Tentara", "Buruh", "Arsitek",
    "Pegawai Bank", "Desainer", "Montir", "Fotografer", "Programmer", "Akuntan",
    "Teknisi", "Koki", "Penjahit",
  ] as const;

  const cities = [
    "Jakarta", "Bandung", "Surabaya", "Medan", "Yogyakarta", "Semarang", "Palembang",
    "Denpasar", "Makassar", "Manado", "Malang", "Padang", "Bogor", "Bekasi", "Cirebon",
    "Pontianak", "Banjarmasin", "Kupang", "Mataram", "Pekanbaru",
  ] as const;

  const streets = [
    "Jl. Merdeka", "Jl. Sudirman", "Jl. Diponegoro", "Jl. Gajah Mada", "Jl. Ahmad Yani",
    "Jl. Siliwangi", "Jl. Gatot Subroto", "Jl. Asia Afrika", "Jl. Anggrek", "Jl. Melati",
    "Jl. Kenanga", "Jl. Mawar", "Jl. Flamboyan", "Jl. Cempaka", "Jl. Dahlia", "Jl. Wijaya Kusuma",
  ] as const;

  // helper buat unique names
  const usedStudentNames = new Set<string>();
  const usedGuardianNames = new Set<string>();

  const generateUniqueName = (firsts: readonly string[], lasts: readonly string[], usedSet: Set<string>): string => {
    let name = "";
    do {
      name = `${getRandom(firsts)} ${getRandom(lasts)}`;
    } while (usedSet.has(name));
    usedSet.add(name);
    return name;
  };

  // generate function
  function generateStudents(
    kelas: string,
    entryYear: number,
    birthYear: number,
    prefix: string,
    count: number
  ): Student[] {
    return Array.from({ length: count }, (_, i) => {
      const fullName = generateUniqueName(firstNames, lastNames, usedStudentNames);
      const guardianName = generateUniqueName(guardianFirstNames, lastNames, usedGuardianNames);
      const city = getRandom(cities);
      const address = `${getRandom(streets)} No.${Math.floor(Math.random() * 200) + 1}, ${city}`;

      const student: Student = {
        fullName,
        nis: `${entryYear}${prefix}${(i + 1).toString().padStart(2, "0")}`,
        className: kelas,
        departmentName: "Science",
        entryYear,
        gender: i % 2 === 0 ? "L" : "P",
        birthPlace: city,
        birthDate: `${birthYear}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
        guardianName,
        guardianPhone: `08${Math.floor(100000000 + Math.random() * 899999999)}`,
        guardianJob: getRandom(jobs),
        address,
        status: "Aktif",
      };
      return student;
    });
  }

  const templateData: Student[] = [
    ...generateStudents("X IPA", 2025, 2009, "00", 30),
    ...generateStudents("XI IPA", 2025, 2008, "10", 30),
    ...generateStudents("XII IPA A", 2025, 2007, "20", 30),
    ...generateStudents("XII IPA B", 2025, 2007, "30", 30),
  ];

  console.log(templateData);

  // Build Indonesian header labels
  const header = [
    "Nama Lengkap",
    "NIS",
    "Kelas",
    "Jurusan",
    "Tahun Masuk",
    "Jenis Kelamin",
    "Tempat Lahir",
    "Tanggal Lahir",
    "Orang tua / Wali",
    "Telepon Orang tua / Wali",
    "Pekerjaan Orang tua / Wali",
    "Alamat",
    "Status",
  ];
  const rows = templateData.map((s) => ({
    "Nama Lengkap": s.fullName,
    "NIS": s.nis,
    "Kelas": s.className,
    "Jurusan": s.departmentName,
    "Tahun Masuk": s.entryYear,
    "Jenis Kelamin": s.gender,
    "Tempat Lahir": s.birthPlace,
    "Tanggal Lahir": s.birthDate,
    "Orang tua / Wali": s.guardianName,
    "Telepon Orang tua / Wali": s.guardianPhone,
    "Pekerjaan Orang tua / Wali": s.guardianJob,
    "Alamat": s.address,
    "Status": s.status,
  }));
  const ws = XLSX.utils.json_to_sheet(rows, { header });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");

  const panduan = [
    ["Panduan Pengisian Template Siswa"],
    ["- Kolom wajib: fullName, nis, className (atau kosong), departmentName (hanya untuk sekolah berjurusan), entryYear"],
    ["- Gender diisi: L atau P"],
    ["- Tanggal lahir format YYYY-MM-DD"],
    ["- Email siswa dibuat otomatis: <nis>@" + school.code + ".com"],
    ["- Password dibuat otomatis (minimal 6 char, huruf besar, angka, karakter khusus)."],
    ["- className dan departmentName harus sesuai dengan data master di sekolah."],
    ["- Setelah upload, Anda akan melihat preview kartu (nama, NIS, jurusan jika ada, username, password) sebelum import final."],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(panduan);
  XLSX.utils.book_append_sheet(wb, ws2, "Panduan");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="template_import_siswa_${school.code}.xlsx"`,
    },
  });
}
