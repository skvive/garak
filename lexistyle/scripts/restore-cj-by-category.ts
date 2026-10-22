/**
 * CJ getCategory → 2단 categoryId로 실상품 크롤 → Neon catalog_index
 * 14개 1단 × 카테고리당 최대 RESTORE_ITEMS_PER_CAT (기본 250)
 *
 * npx tsx scripts/restore-cj-by-category.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const neonUrl = (process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "").trim();
if (!neonUrl) throw new Error("NEON_DATABASE_URL required");
process.env.DATABASE_URL = neonUrl;
if (!process.env.CJ_API_EMAIL || !process.env.CJ_API_KEY) {
  throw new Error("CJ_API_EMAIL / CJ_API_KEY required");
}

import pg from "pg";
import { upsertCatalogMeta, startSyncRun, finishSyncRun } from "../src/lib/catalog/index-store";

const BASE = "https://developers.cjdropshipping.com/api2.0/v1";
const itemsPerCat = Math.min(Number(process.env.RESTORE_ITEMS_PER_CAT || 250), 500);
const pageSize = 50;
const supplierCode = "cjdropshipping";

/** LEXI id ↔ CJ 영문 1단명 */
const LEXI_BY_CJ_EN: Record<string, string> = {
  "Women's Clothing": "women-clothing",
  "Pet Supplies": "pet",
  "Home, Garden & Furniture": "home-garden",
  "Health, Beauty & Hair": "beauty",
  "Jewelry & Watches": "jewelry",
  "Men's Clothing": "men-clothing",
  "Bags & Shoes": "bags-shoes",
  "Toys, Kids & Babies": "kids",
  "Sports & Outdoors": "sports",
  "Consumer Electronics": "electronics",
  "Home Improvement": "home-improve",
  "Automobiles & Motorcycles": "auto",
  "Phones & Accessories": "phones",
  "Computer & Office": "computers",
};

let cachedToken: { token: string; exp: number } | null = null;
async function token() {
  if (cachedToken && cachedToken.exp > Date.now()) return cachedToken.token;
  const res = await fetch(`${BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.CJ_API_EMAIL,
      password: process.env.CJ_API_KEY,
    }),
  });
  const json = await res.json();
  if (!json?.data?.accessToken) throw new Error(`CJ auth failed: ${json?.message}`);
  cachedToken = { token: json.data.accessToken, exp: Date.now() + 10 * 24 * 3600 * 1000 };
  return cachedToken.token;
}

async function cjGet(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", "CJ-Access-Token": await token() },
  });
  const json = await res.json();
  if (json?.code && json.code !== 200) {
    throw new Error(`CJ ${path}: ${json.code} ${json.message}`);
  }
  return json.data;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function neonCount() {
  const c = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`select count(*)::int as n from catalog_index`);
  const cats = await c.query(`
    select coalesce(raw_meta->>'lexCategoryId', category_path[1], '?') as cat, count(*)::int as n
    from catalog_index group by 1 order by n desc`);
  await c.end();
  return { n: r.rows[0].n as number, cats: cats.rows };
}

type CjFirst = {
  categoryFirstId: string;
  categoryFirstName: string;
  categoryFirstList?: { categorySecondId: string; categorySecondName: string }[];
};

async function main() {
  console.log("host", new URL(neonUrl.replace(/^postgresql:/, "http:")).host);
  console.log("itemsPerCat", itemsPerCat);
  console.log("before", await neonCount());

  const catData = await cjGet("/product/getCategory");
  const firsts = Object.values(catData as Record<string, CjFirst>);
  console.log("CJ first categories", firsts.length);

  const summary: Record<string, number> = {};

  for (const first of firsts) {
    const lexId = LEXI_BY_CJ_EN[first.categoryFirstName] || first.categoryFirstName;
    const seconds = first.categoryFirstList?.length
      ? first.categoryFirstList
      : [{ categorySecondId: first.categoryFirstId, categorySecondName: first.categoryFirstName }];

    const runId = await startSyncRun(`${supplierCode}-${lexId}`);
    const seen = new Set<string>();
    let crawled = 0;

    for (const sec of seconds) {
      if (seen.size >= itemsPerCat) break;
      let page = 1;
      let empty = 0;
      while (seen.size < itemsPerCat && empty < 2 && page <= 20) {
        try {
          const data = await cjGet(
            `/product/list?pageNum=${page}&pageSize=${pageSize}&categoryId=${sec.categorySecondId}`,
          );
          const list = (data?.list ?? []) as Record<string, unknown>[];
          if (!list.length) {
            empty += 1;
            page += 1;
            await sleep(200);
            continue;
          }
          empty = 0;
          for (const p of list) {
            if (seen.size >= itemsPerCat) break;
            const externalId = String(p.pid ?? p.productId ?? "");
            if (!externalId || seen.has(externalId)) continue;
            seen.add(externalId);
            const imagesRaw = p.productImage;
            let thumb: string | null = null;
            if (Array.isArray(imagesRaw) && imagesRaw[0]) thumb = String(imagesRaw[0]);
            else if (typeof imagesRaw === "string" && imagesRaw) {
              if (imagesRaw.trim().startsWith("[")) {
                try {
                  const arr = JSON.parse(imagesRaw);
                  thumb = Array.isArray(arr) && arr[0] ? String(arr[0]) : imagesRaw;
                } catch {
                  thumb = imagesRaw;
                }
              } else thumb = imagesRaw;
            }
            const title = String(p.productNameEn ?? p.productName ?? "Untitled");
            const catPath = String(p.categoryName ?? `${first.categoryFirstName}>${sec.categorySecondName}`)
              .split(">")
              .map((s) => s.trim())
              .filter(Boolean);
            const priceRaw = p.sellPrice ?? p.price;
            const price = typeof priceRaw === "number" ? priceRaw : Number(priceRaw) || 0;

            await upsertCatalogMeta({
              supplierCode,
              externalId,
              title,
              categoryPath: catPath.length ? catPath : [first.categoryFirstName, sec.categorySecondName],
              price,
              currency: "USD",
              primaryThumbUrl: thumb,
              sellerName: (typeof p.supplierName === "string" && p.supplierName) || "CJDropshipping",
              sourceUrl: p.productUrl ? String(p.productUrl) : null,
              rawMeta: {
                categoryPath: catPath,
                supplierId: p.supplierId != null ? String(p.supplierId) : null,
                lexCategoryId: lexId,
                cjFirst: first.categoryFirstName,
                cjSecond: sec.categorySecondName,
                cjSecondId: sec.categorySecondId,
              },
              syncRunId: runId,
            });
            crawled += 1;
          }
          page += 1;
          await sleep(250);
        } catch (e) {
          console.warn(`  warn ${lexId}/${sec.categorySecondName} p${page}:`, e instanceof Error ? e.message : e);
          await sleep(800);
          empty += 1;
          page += 1;
        }
      }
    }

    await finishSyncRun(runId, {
      status: "completed",
      pagesDone: 0,
      itemsUpserted: crawled,
    });
    summary[lexId] = crawled;
    console.log(`✓ ${lexId} (${first.categoryFirstName}) crawled=${crawled}`);
  }

  console.log("summary", summary);
  console.log("after", await neonCount());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
