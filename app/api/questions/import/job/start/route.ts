import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { createJob } from "@/lib/importJobs";
import { rateLimit, getClientKey } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const rl = rateLimit(`qimport-start:${getClientKey(req)}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ message: "Terlalu banyak permintaan import. Coba lagi nanti." }, { status: 429 });
  const body = await req.json();
  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) return NextResponse.json({ message: "items kosong" }, { status: 400 });
  const job = createJob(items);
  return NextResponse.json({ jobId: job.id });
}

