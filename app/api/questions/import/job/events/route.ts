import { NextRequest } from "next/server";
export const runtime = "nodejs";
import { getJob } from "@/lib/importJobs";
import { prisma } from "@/lib/prisma";
import { ACTIVE_SCHOOL_COOKIE } from "@/lib/app";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  if (!jobId) return new Response("", { status: 400 });
  const job = getJob(jobId);
  if (!job) return new Response("", { status: 404 });
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  const payload = token ? await verifyAccessToken(token) : null;
  const activeSchoolId = req.cookies.get(ACTIVE_SCHOOL_COOKIE)?.value || null;

  let onProgress: ((payload: any) => void) | null = null;
  const stream = new ReadableStream({
    start(controller) {
      const enc = (data: any) => `data: ${JSON.stringify(data)}\n\n`;
      const send = (data: any) => controller.enqueue(new TextEncoder().encode(enc(data)));

      send({ type: "status", status: job.status, total: job.total, processed: job.processed });

      onProgress = (payload: any) => send({ type: "progress", ...payload });
      job.emitter.on("progress", onProgress);

      (async () => {
        try {
          job.status = "validating";
          job.emitter.emit("progress", { status: job.status, total: job.total, processed: job.processed });
          for (let i = 0; i < job.total; i++) {
            await new Promise((r) => setTimeout(r, 10));
            job.processed = i + 1;
            job.emitter.emit("progress", { status: job.status, total: job.total, processed: job.processed });
          }

          job.status = "committing";
          job.processed = 0;
          job.emitter.emit("progress", { status: job.status, total: job.total, processed: 0 });
          let failureIndex = -1;
          await prisma.$transaction(async (tx) => {
            // Pre-fetch subjects for tenant verification
            const uniqueIds = Array.from(new Set(job.items.map((it: any) => String(it.subjectId))));
            const subjects = await tx.subject.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, schoolId: true } });
            const subMap = new Map(subjects.map((s) => [s.id, s.schoolId]));
            if (activeSchoolId) {
              for (const sid of uniqueIds) {
                if (subMap.get(sid) !== activeSchoolId) throw new Error("Subject tidak valid untuk sekolah aktif");
              }
            }
            for (let i = 0; i < job.items.length; i++) {
              const it = job.items[i];
              failureIndex = i;
              // Resolve subject to get schoolId
              const schoolId = subMap.get(String(it.subjectId));
              if (!schoolId) throw new Error("Subject tidak valid");
              await tx.question.create({
                data: {
                  schoolId,
                  subjectId: it.subjectId,
                  type: it.type,
                  text: it.text,
                  options: it.options ?? undefined,
                  correctKey: it.correctKey ?? undefined,
                  points: it.points ?? 1,
                  difficulty: it.difficulty ?? 1,
                  createdById: payload?.sub || undefined,
                },
              });
              job.processed = i + 1;
              job.emitter.emit("progress", { status: job.status, total: job.total, processed: job.processed });
            }
          }, { timeout: 120_000, maxWait: 10_000 });

          job.status = "completed";
          job.emitter.emit("progress", { status: job.status, total: job.total, processed: job.total });
          controller.close();
        } catch (e: any) {
          job.status = "failed";
          const row = job.processed > 0 ? job.processed + 1 : 2;
          job.errors.push({ row, message: e?.message || "Gagal import" });
          job.emitter.emit("progress", { status: job.status, total: job.total, processed: job.processed, errors: job.errors.length });
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
