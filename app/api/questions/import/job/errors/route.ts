import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { getJob, removeJob } from "@/lib/importJobs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  if (!jobId) return new Response("", { status: 400 });
  const job = getJob(jobId);
  if (!job || job.errors.length === 0) return new Response("", { status: 404 });
  const rows = ["row,message", ...job.errors.map((e) => `${e.row ?? ""},"${(e.message || "").replace(/"/g, '""')}"`)];
  const csv = rows.join("\n");
  removeJob(jobId);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="import_errors_${jobId}.csv"`,
    },
  });
}

