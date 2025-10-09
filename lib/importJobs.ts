import { EventEmitter } from "events";

export type ImportJob = {
  id: string;
  status: "pending" | "validating" | "committing" | "failed" | "completed";
  total: number;
  processed: number;
  errors: Array<{ row?: number; message: string }>;
  emitter: EventEmitter;
  items: any[];
};

const jobs = new Map<string, ImportJob>();

export function createJob(items: any[]): ImportJob {
  const id = Math.random().toString(36).slice(2);
  const job: ImportJob = { id, status: "pending", total: items.length, processed: 0, errors: [], emitter: new EventEmitter(), items };
  job.emitter.setMaxListeners(1000);
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): ImportJob | undefined {
  return jobs.get(id);
}

export function removeJob(id: string) {
  jobs.delete(id);
}

