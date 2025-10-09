import { randomUUID } from "node:crypto";

export function generateJti() {
  return randomUUID();
}

export function parseDuration(input: string): number {
  const m = /^\s*(\d+)\s*([smhd])\s*$/i.exec(String(input || ""));
  if (!m) return 0;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  switch (unit) {
    case "s":
      return n * 1000;
    case "m":
      return n * 60 * 1000;
    case "h":
      return n * 60 * 60 * 1000;
    case "d":
      return n * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
}

