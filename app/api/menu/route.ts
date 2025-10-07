import { NextResponse } from "next/server";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";

type MenuNode = {
  id: string;
  name: string;
  key: string;
  path: string;
  icon?: string | null;
  order: number;
  visibility: string;
  needLogin: boolean;
  children: MenuNode[];
};

export async function GET() {
  const items = await prisma.menu.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }],
  });

  const byId = new Map(items.map((m) => [m.id, m]));

  const nodes = new Map<string, MenuNode>();
  const roots: MenuNode[] = [];

  for (const m of items) {
    const node: MenuNode = {
      id: m.id,
      name: m.name,
      key: m.key,
      path: m.path,
      icon: m.icon,
      order: m.order,
      visibility: m.visibility,
      // Heuristic: PRIVATE menus require login. You can later add a field in schema.
      needLogin: m.visibility !== "PUBLIC",
      children: [],
    };
    nodes.set(m.id, node);
  }

  for (const m of items) {
    const node = nodes.get(m.id)!;
    if (m.parentId && byId.has(m.parentId)) {
      nodes.get(m.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return NextResponse.json({ menu: roots });
}
