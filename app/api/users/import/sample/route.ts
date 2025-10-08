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

  const templateData = [
    {
      fullName: "Budi Santoso",
      nis: "20250001",
      className: "XII IPA A",
      departmentName: "Science",
      entryYear: 2025,
      gender: "L",
      birthPlace: "Bandung",
      birthDate: "2008-06-01",
      guardianName: "Sutrisno",
      guardianPhone: "08123456789",
      guardianJob: "Wiraswasta",
      address: "Jl. Mawar No.1",
      status: "Aktif",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
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

