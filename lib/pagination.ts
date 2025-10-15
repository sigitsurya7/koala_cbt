import type { NextRequest } from "next/server";

export type PageQuery = {
  page: number;
  perPage: number;
  q?: string;
  sort?: string;
  order: "asc" | "desc";
};

export type PagedResult<T> = {
  data: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

export function parsePageQuery(req: NextRequest): PageQuery {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const perPage = Math.max(1, Math.min(200, Number(searchParams.get("perPage") ?? "10") || 10));
  const q = (searchParams.get("q") || undefined)?.toString();
  const sort = (searchParams.get("sort") || undefined)?.toString();
  const order = ((searchParams.get("order") || "asc").toString().toLowerCase() === "desc" ? "desc" : "asc") as
    | "asc"
    | "desc";
  return { page, perPage, q, sort, order };
}

export function buildOrderBy(sort: string | undefined, order: "asc" | "desc", allowed: Record<string, string>) {
  const key = sort && allowed[sort] ? allowed[sort] : undefined;
  if (!key) return undefined as any;
  return [{ [key]: order }] as any;
}

export function buildSearchWhere(fields: string[], q?: string) {
  if (!q) return {} as any;
  const OR = fields.map((f) => ({ [f]: { contains: q, mode: "insensitive" } }));
  return { OR } as any;
}

export function pageToSkipTake(page: number, perPage: number) {
  const take = perPage;
  const skip = (page - 1) * perPage;
  return { skip, take };
}
