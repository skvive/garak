/**
 * Fashion top-5 PDP + multi-channel export Pipeline
 * catalog_index → fastUpsert → PDP generate → coupang/shopee/amazon_au/lexi export
 *
 * 로컬 DB 전용 (DATABASE_URL = localhost). Neon 동기화는 별도.
 *
 *   npm run db:local:use
 *   npx tsx scripts/pipeline-fashion-top5.ts
 */
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config();

const TARGET_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!TARGET_URL) throw new Error("DATABASE_URL required");

process.env.DATABASE_URL = TARGET_URL;

// Force template PDP mode — no AI key needed for batch template PDPs
process.env.PDP_FORCE_TEMPLATE = "1";

import pg from "pg";
import {
  LEXI_CJ_BUCKETS,
  mapCategorySlug,
  departmentOfCategorySlug,
  type LexiDept,
} from "../src/lib/catalog/lexi-cj-categories";
import { stableReviewCount } from "../src/lib/catalog/pagination";
import { getCatalogById } from "../src/lib/catalog/index-store";
import { generatePdpForCatalog } from "../src/lib/pdp/generate";
import { enqueueCrafted, promoteToShelf } from "../src/lib/export/shelf";
import { enqueueExport, processExportQueue } from "../src/lib/export/jobs";
import { resolveCjExportOptions } from "../src/lib/catalog/cj-options";
import { computeGlobalPrice, guessHsCategory, jurisdictionForChannel } from "../src/lib/pricing/global-calculator";

const PER_BUCKET = 5;
const TARGET_DEPT: LexiDept = "fashion";
const EXPORT_CHANNELS = ["lexi", "coupang", "shopee", "amazon_au"] as const;

const LOG = path.join(process.cwd(), "scripts", "pipeline-fashion-top5.log");

function log(line: string) {
  console.log(line);
  fs.appendFileSync(LOG, `${line}\n`);
}

type Cand = {
  id: number;
  externalId: string;
  title: string;
  bucket: string;
  listed: number;
  price: number;
  thumb: string;
  score: number;
  categoryPath: string[] | null;
};

function slugify(title: string, externalId: string) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "item"}-${externalId}`.slice(0, 72);
}

function bucketKeyForRow(categoryPath: string[] | null): string | null {
  const bucket = mapCategorySlug(categoryPath ?? []);
  const dept = departmentOfCategorySlug(bucket);
  if (dept !== TARGET_DEPT) return null;
  return bucket;
}

function rankScore(externalId: string, listed: number): number {
  if (Number.isFinite(listed) && listed > 0) return listed * 1e6 + stableReviewCount(externalId);
  return stableReviewCount(externalId);
}

async function pickCandidates(): Promise<Cand[]> {
  const client = new pg.Client({ connectionString: TARGET_URL });
  await client.connect();
  const { rows } = await client.query<{
    id: string; external_id: string; title: string; category_path: string[] | null;
    min_price: string | null; primary_thumb_url: string; listed: string;
  }>(
    `SELECT id, external_id, title, category_path, min_price, primary_thumb_url,
            COALESCE(NULLIF(raw_meta->>'listedNum',''),'0') AS listed
     FROM catalog_index
     WHERE supplier_code = 'cjdropshipping' AND source_status <> 'gone'
       AND primary_thumb_url IS NOT NULL AND primary_thumb_url <> ''
       AND min_price IS NOT NULL AND CAST(min_price AS numeric) > 0
     ORDER BY CAST(COALESCE(NULLIF(raw_meta->>'listedNum',''),'0') AS numeric) DESC
     LIMIT 200`,
  );
  await client.end();

  const candidates: Cand[] = [];
  for (const r of rows) {
    const key = bucketKeyForRow(r.category_path);
    if (!key) continue;
    candidates.push({
      id: Number(r.id),
      externalId: r.external_id,
      title: r.title,
      bucket: key,
      listed: Number(r.listed) || 0,
      price: Number(r.min_price) || 0,
      thumb: r.primary_thumb_url,
      score: rankScore(r.external_id, Number(r.listed) || 0),
      categoryPath: r.category_path,
    });
  }

  candidates.sort((a, b) => b.score - a.score || a.price - b.price);
  return candidates.slice(0, PER_BUCKET);
}

async function fastUpsert(cands: Cand[]): Promise<Map<number, { slug: string; priceUsd: number }>> {
  const client = new pg.Client({ connectionString: TARGET_URL });
  await client.connect();
  const result = new Map<number, { slug: string; priceUsd: number }>();
  log("fastUpsert: connected");

  try {
    let brandId = (await client.query<{ id: string }>(`SELECT id FROM brands WHERE slug='lexi-sourced' LIMIT 1`)).rows[0]?.id;
    if (!brandId) {
      brandId = (await client.query<{ id: string }>(`INSERT INTO brands (slug,name,story) VALUES ('lexi-sourced','LEXI Sourced','Curated') RETURNING id`)).rows[0]!.id;
    }

    const catCache = new Map<string, string>();
    const ensureCat = async (slug: string, name: string) => {
      let id = (await client.query<{ id: string }>(`SELECT id FROM categories WHERE slug=$1 LIMIT 1`, [slug])).rows[0]?.id;
      if (!id) id = (await client.query<{ id: string }>(`INSERT INTO categories (slug,name,sort) VALUES ($1,$2,99) RETURNING id`, [slug, name])).rows[0]!.id;
      catCache.set(slug, id);
    };

    for (const c of cands) {
      const catSlug = mapCategorySlug(c.categoryPath);
      await ensureCat(catSlug, catSlug);

      const slug = slugify(c.title, c.externalId);
      const hsCategory = guessHsCategory(c.categoryPath);
      const price = computeGlobalPrice({ productCostUsd: c.price, shippingCostUsd: 0, targetCountry: "KR", channelCode: "lexi", hsCategory }).finalPriceUsd;

      const existing = await client.query<{ id: string }>(`SELECT id FROM products WHERE slug=$1 LIMIT 1`, [slug]);
      let productId: string;
      if (existing.rows.length > 0) {
        productId = existing.rows[0]!.id;
        await client.query(
          `UPDATE products SET name=$1, description=$2, price_usd=$3, stock=10, category_id=$4, brand_id=$5, hs_category=$6 WHERE id=$7`,
          [c.title, c.title, String(price), catCache.get(catSlug)!, brandId!, hsCategory, productId],
        );
      } else {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO products (slug,brand_id,category_id,name,description,price_usd,stock,is_dummy,hs_category) VALUES ($1,$2,$3,$4,$5,$6,10,false,$7) RETURNING id`,
          [slug, brandId!, catCache.get(catSlug)!, c.title, c.title, String(price), hsCategory],
        );
        productId = inserted.rows[0]!.id;
      }

      await client.query(`DELETE FROM product_images WHERE product_id=$1`, [productId]);
      await client.query(`INSERT INTO product_images (product_id,url,sort,is_dummy) VALUES ($1,$2,0,false)`, [productId, c.thumb]);
      await client.query(`UPDATE catalog_index SET import_state='imported',product_id=$1,updated_at=NOW() WHERE id=$2`, [productId, c.id]);

      result.set(c.id, { slug, priceUsd: price });
    }

    log(`fastUpsert done: ${cands.length} products`);
  } finally {
    await client.end();
  }
  return result;
}

async function ensurePdp(catalogId: number, thumb: string): Promise<number | null> {
  const cat = await getCatalogById(catalogId);
  if (cat?.documentId) {
    try {
      const { getPdpDocument } = await import("../src/lib/pdp/generate");
      const doc = await getPdpDocument(cat.documentId);
      const urls = (doc?.body as { assetUrls?: string[] } | undefined)?.assetUrls ?? [];
      if (urls.length > 0) return cat.documentId;
    } catch { /* regenerate */ }
  }
  try {
    const pdp = await generatePdpForCatalog(catalogId, { locale: "ko", extraAssetUrls: thumb ? [thumb] : undefined });
    return pdp.documentId;
  } catch (e) {
    log(`  PDP fail #${catalogId}: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

async function main() {
  fs.writeFileSync(LOG, `# pipeline-fashion-top5 ${new Date().toISOString()}\n`);
  log(`DB: ${TARGET_URL.slice(0, 50)}...`);

  // Step 1: pick candidates
  const candidates = await pickCandidates();
  if (!candidates.length) { log("No fashion candidates found"); return; }

  log(`\n=== Selected ${candidates.length} fashion products ===`);
  for (const c of candidates) {
    log(`  #${c.id} listed=${c.listed} $${c.price} ${c.title.slice(0, 60)}`);
  }

  // Step 2: fast upsert
  log(`\n=== fastUpsert (local products table) ===`);
  const productMap = await fastUpsert(candidates);

  // Step 3: PDP generate + export per channel
  let done = 0;
  let exportOk = 0;
  let exportFail = 0;

  for (const c of candidates) {
    done++;
    log(`\n[${done}/${candidates.length}] PDP + export #${c.id} ${c.title.slice(0, 40)}`);

    const docId = await ensurePdp(c.id, c.thumb);
    if (docId == null) { exportFail++; continue; }

    // Enqueue to shelf
    const crafted = await enqueueCrafted([docId]);
    if (crafted.length) await promoteToShelf(crafted.map((x) => x.id));

    // CJ options
    let options = undefined as Awaited<ReturnType<typeof resolveCjExportOptions>>;
    try {
      options = await Promise.race([
        resolveCjExportOptions(c.id),
        new Promise<undefined>((_, rej) => setTimeout(() => rej(new Error("cj-timeout")), 8000)),
      ]) as typeof options;
    } catch (e) { log(`  options warn: ${e instanceof Error ? e.message : e}`); }

    // Per-channel export
    for (const channel of EXPORT_CHANNELS) {
      const jur = jurisdictionForChannel(channel);
      const hs = guessHsCategory(c.categoryPath);
      const pricing = computeGlobalPrice({
        productCostUsd: c.price,
        shippingCostUsd: 0,
        targetCountry: jur,
        channelCode: channel,
        hsCategory: hs,
      });

      try {
        const jobs = await enqueueExport({
          documentId: docId,
          channels: [channel],
          options: options ?? undefined,
          pricing: { sellPriceUsd: pricing.finalPriceUsd },
        });
        log(`  ${channel.padEnd(12)} sell=$${pricing.finalPriceUsd.toFixed(2)} (${pricing.currency} ${pricing.localPrice.toLocaleString()}) jobs=${jobs.length}`);
        const processed = await processExportQueue(4);
        for (const p of processed) {
          if (p.ok) exportOk++; else exportFail++;
          log(`    export #${p.id} ok=${p.ok} ${(p as { externalRef?: string }).externalRef ?? "-"}`);
        }
      } catch (e) {
        exportFail++;
        log(`  ${channel} export fail: ${e instanceof Error ? e.message : e}`);
      }
    }
  }

  // Drain
  for (let i = 0; i < 10; i++) {
    const processed = await processExportQueue(10);
    if (!processed.length) break;
    for (const p of processed) {
      if (p.ok) exportOk++; else exportFail++;
    }
  }

  // Counts
  const client = new pg.Client({ connectionString: TARGET_URL });
  await client.connect();
  const { rows: counts } = await client.query<{ slug: string; cnt: string }>(
    `SELECT c.slug, count(p.id)::text AS cnt FROM products p JOIN categories c ON c.id=p.category_id WHERE p.is_dummy=false AND p.deleted_at IS NULL GROUP BY c.slug ORDER BY count(p.id) DESC`,
  );
  await client.end();

  log("\n=== Storefront product counts ===");
  for (const r of counts) log(`  ${r.slug}: ${r.cnt}`);
  log(`\nexportOk=${exportOk} exportFail=${exportFail}`);
  log("pipeline-fashion-top5 complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});