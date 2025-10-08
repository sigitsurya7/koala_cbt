"use client";

import { useEffect, useMemo, useState } from "react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Input, Select, SelectItem, Button, Card, CardBody, Skeleton } from "@heroui/react";
import { Pagination } from "@heroui/pagination";
import { FiSearch } from "react-icons/fi";

export type DTColumn<T> = {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
};

export type FetchParams = { page: number; perPage: number; q: string; sort?: string; order?: "asc" | "desc" };
export type Paged<T> = { data: T[]; page: number; perPage: number; total: number; totalPages: number };

export type DataTableProps<T> = {
  columns: DTColumn<T>[];
  fetchData: (params: FetchParams) => Promise<Paged<T>>;
  rowKey: (item: T) => string;
  toolbarRight?: React.ReactNode;
  initialPerPage?: number;
  externalReloadKey?: any;
  searchPlaceholder?: string;
};

export default function DataTable<T>({
  columns,
  fetchData,
  rowKey,
  toolbarRight,
  initialPerPage = 10,
  externalReloadKey,
  searchPlaceholder = "Cari...",
}: DataTableProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(initialPerPage);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<string | undefined>(undefined);
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / perPage)), [total, perPage]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchData({ page, perPage, q: debouncedQ, sort: sortKey, order });
      setItems(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // refetch when controls change or external key changes
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, debouncedQ, externalReloadKey, sortKey, order]);

  const perPageItems = [5, 10, 20, 50].map((n) => ({ key: String(n), label: String(n) }));

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 w-max">
            <Input
              size="md"
              className="w-64 sm:w-72 md:w-80 lg:w-96"
              startContent={<FiSearch />}
              placeholder={searchPlaceholder}
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
            />
            <div className="flex items-center gap-2">
              <Select
                size="sm"
                className="w-16"
                aria-label="Rows per page"
                selectedKeys={new Set([String(perPage)])}
                onSelectionChange={(keys) => {
                  const k = Array.from(keys as Set<string>)[0];
                  const n = Number(k || initialPerPage) || initialPerPage;
                  setPerPage(n);
                  setPage(1);
                }}
                items={perPageItems}
              >
                {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
              </Select>
              <span className="text-xs opacity-70">/ halaman</span>
            </div>
          </div>
          <div className="flex items-center gap-2">{toolbarRight}</div>
        </div>

        <Table aria-label="Data table" removeWrapper className="min-w-full" aria-busy={loading}>
          <TableHeader>
            {columns.map((c) => (
              <TableColumn key={c.key} className={c.className} aria-sort={sortKey === c.key ? (order === "asc" ? "ascending" : "descending") : "none"}>
                {c.sortable ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 focus-visible:ring-2 rounded-md"
                    aria-label={`Urutkan kolom ${c.header}`}
                    onClick={() => {
                      if (sortKey === c.key) setOrder(order === "asc" ? "desc" : "asc");
                      else { setSortKey(c.key); setOrder("asc"); }
                    }}
                  >
                    {c.header}
                    {sortKey === c.key ? (order === "asc" ? " ▲" : " ▼") : ""}
                  </button>
                ) : c.header}
              </TableColumn>
            ))}
          </TableHeader>
          {loading ? (
            <TableBody items={Array.from({ length: 5 }).map((_, i) => ({ __k: String(i) })) as any}>
              {(it: any) => (
                <TableRow key={it.__k}>
                  {columns.map((c) => (
                    <TableCell key={c.key}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              )}
            </TableBody>
          ) : (
            <TableBody items={items} emptyContent={"Tidak ada data"}>
              {(item) => (
                <TableRow key={rowKey(item)}>
                  {columns.map((c) => (
                    <TableCell key={c.key}>{c.render ? c.render(item) : (item as any)[c.key]}</TableCell>
                  ))}
                </TableRow>
              )}
            </TableBody>
          )}
        </Table>

        <div className="flex items-center justify-between">
          <div className="text-xs opacity-70">
            Menampilkan {(items.length === 0 ? 0 : (page - 1) * perPage + 1)} - {Math.min(page * perPage, total)} dari {total}
          </div>
          <Pagination total={totalPages} page={page} onChange={setPage} showControls size="sm" />
        </div>
      </CardBody>
    </Card>
  );
}
