import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import * as XLSX from "xlsx";
import { requirePermission } from "@/lib/acl";

export async function GET(req: NextRequest) {
  const deny = await requirePermission(req, { action: "READ", resource: "API/QUESTIONS" });
  if (deny) return deny;
  // Build a sample workbook with headers and examples
  const rows = [
    ["tipe", "teks", "A", "B", "C", "D", "E", "kunci", "poin", "kesulitan"],
    ["MCQ", "Ibu kota Indonesia?", "Jakarta", "Bandung", "Surabaya", "Medan", "", "A", 1, 1],
    ["MCQ", "2 + 2 = ?", "3", "4", "5", "", "", "B", 1, 1],
    ["ESSAY", "Jelaskan proses fotosintesis secara singkat.", "", "", "", "", "", "", 5, 3],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as unknown as Uint8Array;
  return new NextResponse(out, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="template_import_soal.xlsx"`,
    },
  });
}
