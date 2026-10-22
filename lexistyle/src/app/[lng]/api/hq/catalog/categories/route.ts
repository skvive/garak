import { NextResponse } from "next/server";
import { hqActor, unauthorized } from "@/lib/hq/auth";
import {
  LEXI_CJ_BUCKETS,
  activeImportCjChips,
  allMappedCjChips,
} from "@/lib/catalog/lexi-cj-categories";
import { listCatalogCategories, listCatalogLeafChips } from "@/lib/catalog/index-store";

export const dynamic = "force-dynamic";

/**
 * GET /api/hq/catalog/categories
 * LEXI 14버킷만 반환 (CJ 293개 중 매핑된 leaf만).
 * ?mode=active → 현재 Import 취급 7버킷만
 * ?mode=chips → 매핑된 CJ leaf 이름 배열
 * ?mode=raw → DB 실제 카테고리
 */
export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const mode = new URL(req.url).searchParams.get("mode") ?? "buckets";

  if (mode === "raw") {
    const supplier = new URL(req.url).searchParams.get("supplier") ?? "cjdropshipping";
    const categories = await listCatalogCategories(supplier);
    return NextResponse.json({ categories });
  }

  if (mode === "chips") {
    return NextResponse.json({
      categories: allMappedCjChips().sort(),
      activeChips: activeImportCjChips().sort(),
    });
  }

  // 크롤된 CJ leaf 중 LEXI 매핑 안 된(orphan) 목록 — 취급 재검토 대상
  if (mode === "orphan") {
    const supplier = new URL(req.url).searchParams.get("supplier") ?? "cjdropshipping";
    const leafs = await listCatalogLeafChips(supplier);
    const mapped = new Set(allMappedCjChips());
    const mappedCount = leafs.filter((l) => mapped.has(l.name)).length;
    const orphans = leafs
      .filter((l) => !mapped.has(l.name))
      .sort((a, b) => b.count - a.count)
      .map((l) => ({ name: l.name, count: l.count }));
    return NextResponse.json({
      supplier,
      totalLeaf: leafs.length,
      mappedLeaf: mappedCount,
      orphanLeaf: orphans.length,
      orphans,
    });
  }

  const buckets =
    mode === "active"
      ? LEXI_CJ_BUCKETS.filter((b) => b.activeImport)
      : LEXI_CJ_BUCKETS;

  return NextResponse.json({
    buckets: buckets.map((b) => ({
      key: b.key,
      label: b.label,
      department: b.department,
      activeImport: b.activeImport,
      chipCount: b.cjChips.length,
    })),
    /** 하위 호환: 칩 레일 라벨 */
    categories: buckets.map((b) => b.label),
  });
}
