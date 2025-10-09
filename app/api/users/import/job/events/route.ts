import { NextRequest } from "next/server";
export const runtime = "nodejs";
import { getJob, removeJob } from "@/lib/importJobs";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  if (!jobId) return new Response("", { status: 400 });
  const job = getJob(jobId);
  if (!job) return new Response("", { status: 404 });

  let onProgress: ((payload: any) => void) | null = null;
  const stream = new ReadableStream({
    start(controller) {
      const enc = (data: any) => `data: ${JSON.stringify(data)}\n\n`;
      const send = (data: any) => controller.enqueue(new TextEncoder().encode(enc(data)));

      // Emit initial
      send({ type: "status", status: job.status, total: job.total, processed: job.processed });

      onProgress = (payload: any) => send({ type: "progress", ...payload });
      job.emitter.on("progress", onProgress);

      // Start async runner
      (async () => {
        try {
          job.status = "validating";
          job.emitter.emit("progress", { status: job.status, total: job.total, processed: job.processed });
          // Simulasi validasi per item (klien sudah melakukan validate sebelumnya)
          for (let i = 0; i < job.total; i++) {
            await new Promise((r) => setTimeout(r, 10));
            job.processed = i + 1;
            job.emitter.emit("progress", { status: job.status, total: job.total, processed: job.processed });
          }

          // Commit atomic
          job.status = "committing";
          job.processed = 0;
          job.emitter.emit("progress", { status: job.status, total: job.total, processed: 0 });
          let failureIndex = -1;
          await prisma.$transaction(async (tx) => {
            for (let i = 0; i < job.items.length; i++) {
              const it = job.items[i];
              failureIndex = i;
              const hash = await bcrypt.hash(it.passwordPlain, 10);
              const user = await tx.user.create({ data: { name: it.fullName, email: it.email, username: it.username, passwordHash: hash, type: "SISWA" } });
              await tx.userDetail.create({ data: { userId: user.id, fullName: it.fullName, gender: it.gender ?? undefined, birthPlace: it.birthPlace ?? undefined, birthDate: it.birthDate ? new Date(it.birthDate) : undefined, phone: null, address: it.address ?? undefined, religion: null, avatarUrl: null } });
              await tx.studentDetail.create({ data: { userId: user.id, nis: it.nis, schoolId: it.schoolId, classId: it.classId ?? undefined, departmentId: it.departmentId ?? undefined, entryYear: it.entryYear ?? undefined, status: it.status ?? undefined, guardianName: it.guardianName ?? undefined, guardianPhone: it.guardianPhone ?? undefined, guardianJob: it.guardianJob ?? undefined, address: it.address ?? undefined } });
              // Emit pseudo progress during commit
              job.processed = i + 1;
              job.emitter.emit("progress", { status: job.status, total: job.total, processed: job.processed });
            }
          }, { timeout: 120_000, maxWait: 10_000 });

          job.status = "completed";
          job.emitter.emit("progress", { status: job.status, total: job.total, processed: job.total });
          controller.close();
        } catch (e: any) {
          job.status = "failed";
          // Row index based on last attempted item in transaction
          const row = failureIndex >= 0 ? failureIndex + 2 : (job.processed > 0 ? job.processed + 1 : 2);
          job.errors.push({ row, message: e?.message || "Gagal import" });
          job.emitter.emit("progress", { status: job.status, total: job.total, processed: job.processed, errors: job.errors.length });
          // do not remove yet; allow client to download CSV errors
          controller.close();
        }
      })();
    },
    cancel() {
      if (onProgress) job.emitter.off("progress", onProgress);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
