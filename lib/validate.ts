import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { Prisma } from "@prisma/client";

export function zparse<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function handleApiError(e: any) {
  if (e instanceof ZodError) {
    return NextResponse.json({ message: "Invalid input", errors: e.flatten() }, { status: 400 });
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      return NextResponse.json({ message: "Duplicate record" }, { status: 409 });
    }
    if (e.code === "P2025") {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
  }
  const msg = e?.message && typeof e.message === "string" ? e.message : "Server error";
  return NextResponse.json({ message: msg }, { status: 500 });
}

