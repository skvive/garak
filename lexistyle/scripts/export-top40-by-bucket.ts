/**
 * Storefront 하위버킷당 listedNum(없으면 review proxy) 상위 N개
 * → 빠른 상품 upsert(CJ thumb) → template PDP → shelf → LEXI export
 * (원가·판매가·CJ 옵션을 PublishInput에 반영 — 쿠팡/쇼피/아마존용 필드 동일)
 *
 *   $env:DATABASE_URL = $env:NEON_DATABASE_URL
 *   $env:PER_BUCKET = "40"
 *   npx tsx scripts/export-top40-by-bucket.ts
 *   DRY_RUN=1 선별만
 */
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config();

if (process.env.NEON_DATABASE_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.NEON_DATABASE_URL;
}

if (process.env.PDP_FORCE_TEMPLATE !== "0") {
  process.env.PDP_FORCE_TEMPLATE = "1";
  for (const k of [
    "DEEPSEEK_API_KEY",
    "OPENROUTER_API_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "OPENAI_API_KEY",
  ]) {
    delete process.env[k];
  }
}

import pg from "pg";
import {
  STOREFRONT_BUCKET_ORDER,
  CATEGORY_NAMES,
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
import { computeSellPrice, computeRetailPrice } from "../src/lib/hq/types";

const PER_BUCKET = Math.min(Math.max(Number(process.env.PER_BUCKET || 40), 1), 40);
const DRY_RUN = process.env.DRY_RUN === "1";
const SKIP_CJ_OPTIONS = process.env.SKIP_CJ_OPTIONS === "1";
const LOG = path.join(process.cwd(), "scripts", "export-top40-by-bucket.log");

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
};

function slugify(title: string, externalId: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${base || "item"}-${externalId}`.slice(0, 72);
}

function storefrontTargets(): string[] {
  const out: string[] = [];
  for (const [dept, buckets] of Object.entries(STOREFRONT_BUCKET_ORDER) as [
    LexiDept,
    readonly string[],
  ][]) {
    if (!buckets.length) out.push(dept);
    else out.push(...buckets);
  }
  return out;
}

function bucketKeyForRow(categoryPath: string[] | null): string | null {
  const bucket = mapCategorySlug(categoryPath ?? []);
  const dept = departmentOfCategorySlug(bucket);
  if (dept === "kids") return "kids";
  if (dept === "others" || bucket === "unmapped" || bucket === "sourced") return "others";
  if (dept === "sourced") return null;
  return bucket;
}

function rankScore(externalId: string, listed: number): number {
  if (Number.isFinite(listed) && listed > 0) return listed * 1_000_000 + stableReviewCount(externalId);
  return stableReviewCount(externalId);
}

async function pickCandidates(): Promise<Map<string, Cand[]>> {
  const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL / NEON_DATABASE_URL required");
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const { rows } = await client.query<{
    id: string;
    external_id: string;
    title: string;
    category_path: string[] | null;
    min_price: string | null;
    primary_thumb_url: string;
    listed: string;
  }>(
    `SELECT id, external_id, title, category_path, min_price, primary_thumb_url,
            COALESCE(NULLIF(raw_meta->>'listedNum',''),'0') AS listed
     FROM catalog_index
     WHERE supplier_code = 'cjdropshipping'
       AND source_status <> 'gone'
       AND primary_thumb_url IS NOT NULL
       AND primary_thumb_url <> ''
       AND min_price IS NOT NULL
       AND CAST(min_price AS numeric) > 0
     ORDER BY id DESC`,
  );
  await client.end();

  const byBucket = new Map<string, Cand[]>();
  for (const r of rows) {
    const key = bucketKeyForRow(r.category_path);
    if (!key) continue;
    const listed = Number(r.listed) || 0;
    const cand: Cand = {
      id: Number(r.id),
      externalId: r.external_id,
      title: r.title,
      bucket: key,
      listed,
      price: Number(r.min_price) || 0,
      thumb: r.primary_thumb_url,
      score: rankScore(r.external_id, listed),
    };
    const arr = byBucket.get(key) ?? [];
    arr.push(cand);
    byBucket.set(key, arr);
  }

  const picked = new Map<string, Cand[]>();
  for (const t of storefrontTargets()) {
    const arr = (byBucket.get(t) ?? []).sort(
      (a, b) => b.score - a.score || a.price - b.price || b.id - a.id,
    );
    picked.set(t, arr.slice(0, PER_BUCKET));
  }
  return picked;
}

/** Blob 없이 CJ thumb으로 상품 진열 + catalog import 링크 (raw pg, 진행 로그) */
async function fastUpsert(cands: Cand[]): Promise<void> {
  const url = process.env.DATABASE_URL!;
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  log("fastUpsert: connected");

  try {
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS retail_price_usd numeric(10,2)`);

    let brandId = (
      await client.query<{ id: string }>(`SELECT id FROM brands WHERE slug = 'lexi-sourced' LIMIT 1`)
    ).rows[0]?.id;
    if (!brandId) {
      brandId = (
        await client.query<{ id: string }>(
          `INSERT INTO brands (slug, name, story) VALUES ('lexi-sourced','LEXI Sourced','Curated via LEXI sourcing pipeline') RETURNING id`,
        )
      ).rows[0]!.id;
    }

    const cats = new Map<string, string>();
    const ensureCat = async (slug: string, name: string) => {
      let id = (await client.query<{ id: string }>(`SELECT id FROM categories WHERE slug = $1 LIMIT 1`, [slug]))
        .rows[0]?.id;
      if (!id) {
        id = (
          await client.query<{ id: string }>(
            `INSERT INTO categories (slug, name, sort) VALUES ($1,$2,99) RETURNING id`,
            [slug, name],
          )
        ).rows[0]!.id;
      }
      cats.set(slug, id);
    };
    for (const b of LEXI_CJ_BUCKETS) {
      await ensureCat(b.key, CATEGORY_NAMES[b.key] ?? b.label);
    }
    for (const slug of ["kids", "others", "unmapped"] as const) {
      await ensureCat(slug, CATEGORY_NAMES[slug] ?? slug);
    }
    log(`fastUpsert: categories ready brand=${brandId}`);

    let created = 0;
    let updated = 0;
    for (let i = 0; i < cands.length; i++) {
      const c = cands[i]!;
      const catSlug = c.bucket === "others" ? "others" : c.bucket;
      const categoryId = cats.get(catSlug) ?? cats.get("others")!;
      const slug = slugify(c.title, c.externalId);
      const sell = computeSellPrice(c.price);
      const retail = computeRetailPrice(sell);

      const existing = await client.query<{ id: string }>(
        `SELECT id FROM products WHERE slug = $1 LIMIT 1`,
        [slug],
      );
      let productId: string;
      if (existing.rows[0]) {
        productId = existing.rows[0].id;
        await client.query(
          `UPDATE products SET name=$1, description=$1, price_usd=$2, retail_price_usd=$3,
             brand_id=$4, category_id=$5, is_dummy=false, deleted_at=NULL, stock=10
           WHERE id=$6`,
          [c.title, String(sell), String(retail), brandId, categoryId, productId],
        );
        updated++;
      } else {
        productId = (
          await client.query<{ id: string }>(
            `INSERT INTO products (slug, brand_id, category_id, name, description, price_usd, retail_price_usd, stock, is_dummy, discount_rate, rating_avg, review_count)
             VALUES ($1,$2,$3,$4,$4,$5,$6,10,false,0,'4.5',12) RETURNING id`,
            [slug, brandId, categoryId, c.title, String(sell), String(retail)],
          )
        ).rows[0]!.id;
        created++;
      }

      await client.query(`DELETE FROM product_images WHERE product_id = $1`, [productId]);
      await client.query(
        `INSERT INTO product_images (product_id, url, sort, is_dummy) VALUES ($1,$2,0,false)`,
        [productId, c.thumb],
      );
      await client.query(
        `UPDATE catalog_index SET import_state='imported', product_id=$1, updated_at=NOW() WHERE id=$2`,
        [productId, c.id],
      );

      if ((i + 1) % 25 === 0 || i === 0 || i === cands.length - 1) {
        log(`  upsert ${i + 1}/${cands.length} created=${created} updated=${updated}`);
      }
    }

    await client.query(
      `INSERT INTO site_settings (key, value, updated_by, updated_at)
       VALUES ('data_mode', '{"mode":"real"}'::jsonb, 'export-top40-by-bucket', NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    );
    log(`fastUpsert created=${created} updated=${updated}`);
  } finally {
    await client.end();
  }
}

async function ensurePdp(catalogId: number, thumb: string): Promise<number | null> {
  const cat = await getCatalogById(catalogId);
  if (cat?.documentId) {
    // reuse only if hero assets exist
    try {
      const { getPdpDocument } = await import("../src/lib/pdp/generate");
      const doc = await getPdpDocument(cat.documentId);
      const urls = (doc?.body as { assetUrls?: string[] } | undefined)?.assetUrls ?? [];
      if (urls.length > 0) return cat.documentId;
    } catch {
      /* regenerate below */
    }
  }
  try {
    const pdp = await generatePdpForCatalog(catalogId, {
      locale: "ko",
      extraAssetUrls: thumb ? [thumb] : undefined,
    });
    return pdp.documentId;
  } catch (e) {
    log(`  PDP fail #${catalogId}: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

async function main() {
  fs.writeFileSync(LOG, `# export-top40-by-bucket ${new Date().toISOString()}\n`);
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");

  log(
    `PER_BUCKET=${PER_BUCKET} DRY_RUN=${DRY_RUN} SKIP_CJ_OPTIONS=${SKIP_CJ_OPTIONS} targets=${storefrontTargets().join(",")}`,
  );

  const picked = await pickCandidates();
  let total = 0;
  for (const [bucket, rows] of picked) {
    const withListed = rows.filter((r) => r.listed > 0).length;
    log(
      `  ${bucket}: ${rows.length} (listedNum>0: ${withListed}, topScore=${rows[0]?.score ?? 0}, #${rows[0]?.id ?? "-"})`,
    );
    total += rows.length;
  }
  log(`total selected: ${total}`);

  if (DRY_RUN) {
    for (const [bucket, rows] of picked) {
      log(`\n## ${bucket}`);
      rows.forEach((r, i) =>
        log(`  ${i + 1}. #${r.id} listed=${r.listed} $${r.price} ${r.title.slice(0, 60)}`),
      );
    }
    log("dry-run done.");
    return;
  }

  const all = [...picked.values()].flat();
  log(`\n=== fastUpsert ${all.length} ===`);
  await fastUpsert(all);

  let done = 0;
  let exportOk = 0;
  let exportFail = 0;

  for (const [bucket, rows] of picked) {
    for (const row of rows) {
      done++;
      const eta = `???`;
      log(`[${done}/${total} ${Math.round((done / total) * 100)}% ETA ${eta}] ${bucket} #${row.id}`);

      const docId = await ensurePdp(row.id, row.thumb);
      if (docId == null) {
        exportFail++;
        continue;
      }

      const crafted = await enqueueCrafted([docId]);
      if (crafted.length) await promoteToShelf(crafted.map((c) => c.id));

      const sell = computeSellPrice(row.price);
      let options = undefined as Awaited<ReturnType<typeof resolveCjExportOptions>>;
      if (!SKIP_CJ_OPTIONS) {
        try {
          options = (await Promise.race([
            resolveCjExportOptions(row.id),
            new Promise<undefined>((_, rej) =>
              setTimeout(() => rej(new Error("cj-options-timeout")), 8_000),
            ),
          ])) as typeof options;
        } catch (e) {
          log(`  options warn: ${e instanceof Error ? e.message : e}`);
        }
      }

      try {
        const jobs = await enqueueExport({
          documentId: docId,
          channels: ["lexi"],
          options: options ?? undefined,
          pricing: { sellPriceUsd: sell },
        });
        log(
          `  doc #${docId} sell=$${sell} options=${options?.length ?? 0} jobs=${jobs.length}`,
        );
        const processed = await processExportQueue(4);
        for (const p of processed) {
          if (p.ok) exportOk++;
          else exportFail++;
          log(
            `    export #${p.id} ok=${p.ok} ref=${(p as { externalRef?: string }).externalRef ?? "-"} err=${(p as { error?: string }).error ?? ""}`,
          );
        }
      } catch (e) {
        exportFail++;
        log(`  export fail: ${e instanceof Error ? e.message : e}`);
      }
    }
  }

  for (let i = 0; i < 30; i++) {
    const processed = await processExportQueue(20);
    if (!processed.length) break;
    for (const p of processed) {
      if (p.ok) exportOk++;
      else exportFail++;
      log(`  drain #${p.id} ok=${p.ok}`);
    }
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL! });
  await client.connect();
  const { rows: counts } = await client.query<{ slug: string; cnt: string }>(
    `SELECT c.slug, count(p.id)::text AS cnt
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.is_dummy = false AND p.deleted_at IS NULL
     GROUP BY c.slug
     ORDER BY count(p.id) DESC`,
  );
  await client.end();
  log("\n=== Storefront product counts ===");
  for (const r of counts) log(`  ${r.slug}: ${r.cnt}`);
  log(`\nexportOk=${exportOk} exportFail=${exportFail}`);
  log("done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
