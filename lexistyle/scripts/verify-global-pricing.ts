/**
 * 실검증: CJ 상품 → Global Price Engine 적용
 * DB 연결 확인 후 catalog_index에서 3개 상품 샘플, KR/AU/SG/MY/ID 각국 + 각 채널별 가격을 계산하고 출력한다
 *
 * $env:DATABASE_URL = $env:NEON_DATABASE_URL
 * npx tsx scripts/verify-global-pricing.ts
 */

import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config();
if (process.env.NEON_DATABASE_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.NEON_DATABASE_URL;
}

import pg from "pg";
import {
  computeGlobalPrice,
  calculateImportTax,
  guessHsCategory,
  jurisdictionForChannel,
  isPlatformFacilitator,
} from "../src/lib/pricing/global-calculator";

interface Product {
  product_id: number;
  slug: string;
  name: string;
  min_price: string | null;
  category_path: string[] | null;
}

interface PriceRow {
  pvid: number;
  slug: string;
  name: string;
  costUsd: number;
  categoryPath?: string[] | null;
}

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL! });
  try {
    await client.connect();
    console.log("Connected to DB");
  } catch {
    console.log("No DB — using local JSON");
    await verifyLocal();
    return;
  }

  // Fetch sample products with actual cost
  const { rows } = await client.query<Product>(`
    SELECT p.id AS product_id, p.slug, p.name, ci.min_price, ci.category_path
    FROM products p
    JOIN catalog_index ci ON ci.product_id = p.id
    WHERE p.is_dummy = false AND p.deleted_at IS NULL
      AND ci.min_price IS NOT NULL AND ci.min_price::numeric > 0
    ORDER BY ci.min_price::numeric DESC
    LIMIT 5
  `);

  if (!rows.length) {
    console.log("No products found. Running local fallback...");
    await verifyLocal();
    return;
  }

  const products: PriceRow[] = rows.map((r) => ({
    pvid: Number(r.product_id),
    slug: r.slug,
    name: r.name.slice(0, 50),
    costUsd: r.min_price ? Number(r.min_price) : 0,
    categoryPath: r.category_path,
  }));

  await verify(products);
  await client.end();
}

async function verifyLocal() {
  const samples: PriceRow[] = [
    { pvid: 1, slug: "local-sample-1", name: "Skincare Serum (beauty)", costUsd: 25 },
    { pvid: 2, slug: "local-sample-2", name: "T-Shirt (apparel)", costUsd: 15 },
    { pvid: 3, slug: "local-sample-3", name: "Phone Case (electronics)", costUsd: 8 },
    { pvid: 4, slug: "local-sample-4", name: "Canvas Bag (bags)", costUsd: 12 },
    { pvid: 5, slug: "local-sample-5", name: "Sneakers (shoes)", costUsd: 35 },
  ];
  const samplePaths: (string[] | null)[] = [
    ["Beauty", "Skincare"],
    ["Clothing", "Women", "T-Shirts"],
    ["Electronics", "Mobile Accessories"],
    ["Fashion", "Bags"],
    ["Fashion", "Shoes"],
  ];
  const start = Date.now();
  for (let i = 0; i < samples.length; i++) {
    const p = samples[i];
    const hsCat = guessHsCategory(samplePaths[i]);
    console.log(`\n=== #${p.pvid} ${p.name} | $${p.costUsd} | HS:${hsCat} ===`);
    printForProduct(p, hsCat);
  }
  console.log(`\n[local] ${Date.now() - start}ms`);
}

const CHANNELS = ["coupang", "lexi", "amazon_au", "shopee"] as const;

function printForProduct(p: PriceRow, hsCategory?: Parameters<typeof computeGlobalPrice>[0]["hsCategory"]) {
  for (const ch of CHANNELS) {
    const jur = jurisdictionForChannel(ch);
    const isFac = isPlatformFacilitator(ch);

    try {
      const result = computeGlobalPrice({
        productCostUsd: p.costUsd,
        shippingCostUsd: 0,
        targetCountry: jur,
        channelCode: ch,
        hsCategory,
      });

      const tax = result.dutyBreakdown;
      console.log(
        `  ${ch.padEnd(12)} ${jur} | CIF $${result.cifUsd.toFixed(2)}` +
        ` | tax $${result.importTaxUsd.toFixed(2)}` +
        ` (tariff $${tax.tariff.toFixed(2)} vat/gst $${tax.vatOrGst.toFixed(2)} income $${tax.incomeTax.toFixed(2)})` +
        ` | sell $${result.finalPriceUsd.toFixed(2)}` +
        ` | ${result.currency} ${result.localPrice.toLocaleString()}` +
        ` (fx ${result.fxRateUsed.toFixed(4)})` +
        `${isFac ? " [FACILITATOR]" : ""}`,
      );
    } catch (e) {
      console.log(`  ${ch.padEnd(12)} ${jur} | ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

async function verify(products: PriceRow[]) {
  const start = Date.now();
  let totalTaxExceeded = 0;
  let totalCifExceeded = 0;
  let totalProducts = products.length;

  for (const p of products) {
    const hsCat = guessHsCategory(p.categoryPath ?? null);
    console.log(`\n=== #${p.pvid} ${p.name} | $${p.costUsd} | HS:${hsCat} ===`);
    printForProduct(p, hsCat);

    for (const ch of CHANNELS) {
      const jur = jurisdictionForChannel(ch);
      const cifUsd = p.costUsd;
      const deMinimis: Record<string, number> = { KR: 150, AU: 650, SG: 300, MY: 106, ID: 3, US: 800 };
      if (cifUsd > (deMinimis[jur] ?? Infinity)) totalCifExceeded++;

      const tax = calculateImportTax(cifUsd, jur, hsCat);
      if (tax.tariff > 0 || tax.vatOrGst > 0) totalTaxExceeded++;
    }
  }

  console.log(`\n--- SUMMARY ---`);
  console.log(`Products: ${totalProducts}`);
  console.log(`Channels × products: ${totalProducts * CHANNELS.length}`);
  console.log(`CIF threshold exceeded: ${totalCifExceeded}`);
  console.log(`Taxed (tariff/vat > 0): ${totalTaxExceeded}`);
  console.log(`Compute time: ${Date.now() - start}ms`);
  console.log(`\n✅ Global Pricing Engine verification complete`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});