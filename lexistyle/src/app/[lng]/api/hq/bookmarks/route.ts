import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { getState, mutate } from "@/lib/hq/store";
import type { Bookmark, BookmarkStatus } from "@/lib/hq/types";
import { getCatalogByIds } from "@/lib/catalog/index-store";
import { mapCjCategory } from "@/lib/catalog/cj-categories";

export const dynamic = "force-dynamic";

const STATUSES: BookmarkStatus[] = ["bookmarked", "archived", "trash"];

function asStatus(v: unknown): BookmarkStatus | undefined {
  return STATUSES.includes(v as BookmarkStatus) ? (v as BookmarkStatus) : undefined;
}

function upsertOne(
  s: { seq: number; bookmarks: Bookmark[] },
  email: string,
  catalogId: number,
  patch: { status?: BookmarkStatus; groupName?: string; note?: string },
) {
  const existing = s.bookmarks.find((b) => b.catalogId === catalogId && b.ownerEmail === email);
  if (existing) {
    if (patch.status) existing.status = patch.status;
    if (patch.groupName !== undefined) existing.groupName = patch.groupName;
    if (patch.note !== undefined) existing.note = patch.note;
    return existing;
  }
  const bookmark: Bookmark = {
    id: ++s.seq,
    catalogId,
    ownerEmail: email,
    status: patch.status ?? "bookmarked",
    groupName: patch.groupName,
    note: patch.note,
    createdAt: new Date().toISOString(),
  };
  s.bookmarks.push(bookmark);
  return bookmark;
}

/** GET — 내 컬렉션. status=bookmarked|archived|trash|all */
export async function GET(req: Request) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "bookmarked";
  const group = url.searchParams.get("group") ?? "";
  const category = url.searchParams.get("category") ?? "";
  const email = actor;

  const s = await getState();
  const mine = ((s.bookmarks ?? []) as Bookmark[]).filter((b) => b.ownerEmail === email);
  let filtered = status === "all" ? mine : mine.filter((b) => b.status === status);
  if (group === "__none") filtered = filtered.filter((b) => !b.groupName);
  else if (group) filtered = filtered.filter((b) => b.groupName === group);

  const catalog = await getCatalogByIds(filtered.map((b) => b.catalogId));
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const groups = [...new Set(mine.map((b) => b.groupName).filter(Boolean) as string[])];

  const withProduct = filtered.map((b) => {
    const p = byId.get(b.catalogId);
    const categoryPath = p?.categoryPath ?? [];
    return {
      ...b,
      product: p
        ? {
            id: p.id,
            title: p.title,
            thumbUrl: p.primaryThumbUrl,
            price: p.minPrice,
            currency: p.currency,
            categoryPath,
            sellerName: p.sellerName,
            externalId: p.externalId,
          }
        : null,
    };
  });
  const categories = [...new Set(withProduct.map((i) => mapCjCategory(i.product?.categoryPath ?? [])).filter((c) => c))];
  const items = category
    ? withProduct.filter((row) => mapCjCategory(row.product?.categoryPath ?? []) === category)
    : withProduct;

  return NextResponse.json({
    bookmarks: items,
    groups,
    categories,
    counts: {
      bookmarked: mine.filter((b) => b.status === "bookmarked").length,
      archived: mine.filter((b) => b.status === "archived").length,
      trash: mine.filter((b) => b.status === "trash").length,
    },
  });
}

/** POST — { catalogId } | { catalogIds } + status? groupName? note? */
export async function POST(req: Request) {
  const actor = await hqActor(req);
  if (!actor) return unauthorized();
  const body = (await req.json()) as {
    catalogId?: number;
    catalogIds?: number[];
    status?: string;
    groupName?: string;
    note?: string;
  };
  const ids = (body.catalogIds?.length ? body.catalogIds : body.catalogId ? [body.catalogId] : [])
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!ids.length) return bad("catalogId or catalogIds required");
  const status = asStatus(body.status);
  const patch = { status, groupName: body.groupName, note: body.note };

  const result = await mutate((s) => {
    if (!s.bookmarks) s.bookmarks = [];
    const updated = ids.map((id) => upsertOne(s, actor, id, patch));
    return { updated: updated.length, items: updated };
  });
  return NextResponse.json(result);
}
