/**
 * 미생성 상품페이지 대상 큐 (읽기 전용) — docs/pdp-bulk-cj-original-plan.md
 * 조건: 게시된 PDP·SAMPLE3 오버라이드 없음 / 판매가 ≥ 50,000원 / 여성의류·남성의류·화장품(스킨케어·메이크업·헤어케어) 버킷 제외 / 아우터 포함
 * 순서: LEXI_CJ_BUCKETS 순서 → CJ leaf → 상품 id
 * Usage: npx tsx scripts/pdp-bulk/queue.ts   → tmp/pdp-bulk/queue.json
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

import { mkdir, writeFile } from "node:fs/promises";
import { Client } from "pg";

export const MIN_KRW = 50_000;
export const KRW_PER_USD = 1 / 0.00072;
// PDP_BULK_MODE=women: 여성의류 버킷만, 기존 PDP·오버라이드도 재생성 대상
const WOMEN_MODE = process.env.PDP_BULK_MODE === "women";
const EXCLUDED_BUCKETS = new Set(["women", "men", "skincare", "makeup", "haircare"]);

export type QueueItem = {
  productId: number;
  slug: string;
  name: string;
  priceUsd: number;
  krw: number;
  catalogId: number;
  externalId: string;
  supplierCode: string;
  leaf: string;
  bucket: string;
};

export async function buildQueue(): Promise<QueueItem[]> {
  const { LEXI_CJ_BUCKETS } = await import("../../src/lib/catalog/lexi-cj-categories");
  const { getSample3StorefrontOverride } = await import("../../src/lib/pdp/sample3-overrides");
  const { getSample3BatchOverride } = await import("../../src/lib/pdp/sample3-batch-overrides");
  const order = new Map<string, number>(LEXI_CJ_BUCKETS.map((b, i) => [b.key, i]));
  const bucketOfLeaf = new Map<string, string>();
  for (const b of LEXI_CJ_BUCKETS) for (const chip of b.cjChips) bucketOfLeaf.set(chip, b.key);

  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const rows = (
    await c.query(`
      with ci as (
        select distinct on (product_id) product_id, id catalog_id, external_id, supplier_code, category_path[1] leaf, document_id
        from catalog_index where product_id is not null order by product_id, id)
      select p.id product_id, p.slug, p.name, p.price_usd::float price_usd, ci.catalog_id, ci.external_id, ci.supplier_code, ci.leaf,
             ((d.body->'published'->>'html') is not null or coalesce(length(d.rendered_html), 0) > 200) generated
      from products p
      join ci on ci.product_id = p.id
      left join content_documents d on d.id = ci.document_id
      where p.deleted_at is null and coalesce(p.is_dummy, false) = false`)
  ).rows;
  await c.end();

  const out: QueueItem[] = [];
  for (const r of rows) {
    const bucket = bucketOfLeaf.get(r.leaf) ?? "unmapped";
    if (WOMEN_MODE) {
      if (bucket !== "women") continue;
    } else {
      if (r.generated) continue;
      if (getSample3StorefrontOverride(r.slug) || getSample3BatchOverride(r.slug)) continue;
      if (EXCLUDED_BUCKETS.has(bucket)) continue;
    }
    const krw = Math.round(r.price_usd * KRW_PER_USD);
    if (krw < MIN_KRW) continue;
    out.push({
      productId: Number(r.product_id), slug: r.slug, name: r.name, priceUsd: r.price_usd, krw,
      catalogId: Number(r.catalog_id), externalId: r.external_id, supplierCode: r.supplier_code, leaf: r.leaf ?? "", bucket,
    });
  }
  out.sort((a, b) => (order.get(a.bucket) ?? 99) - (order.get(b.bucket) ?? 99) || a.leaf.localeCompare(b.leaf) || a.productId - b.productId);
  return out;
}

async function main() {
  const queue = await buildQueue();
  await mkdir("tmp/pdp-bulk", { recursive: true });
  await writeFile("tmp/pdp-bulk/queue.json", JSON.stringify(queue, null, 1));
  const byBucket: Record<string, number> = {};
  for (const q of queue) byBucket[q.bucket] = (byBucket[q.bucket] ?? 0) + 1;
  console.log("queue:", queue.length, JSON.stringify(byBucket));
  console.log("first:", JSON.stringify(queue.slice(0, 3).map((q) => [q.productId, q.bucket, q.leaf, q.krw, q.externalId])));
}

if (process.argv[1]?.includes("queue")) main().catch((e) => { console.error("failed:", e.message); process.exit(1); });
