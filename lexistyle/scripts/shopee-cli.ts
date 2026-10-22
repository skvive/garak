/**
 * LEXI Shopee Open Platform v2 CLI.
 * Read-only commands run directly. Mutating commands require --live.
 *
 * npm run shopee -- health
 * npm run shopee -- products
 * npm run shopee -- orders --days 7
 * npm run shopee -- logistics
 * npm run shopee -- inventory --item-id 123 --qty 10 --live
 * npm run shopee -- register --input path/to/products.json --live
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import * as api from "../src/lib/channels/shopee/api";
import * as constants from "../src/lib/channels/shopee/constants";
import * as listings from "../src/lib/channels/shopee/listings";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const args = process.argv.slice(2);
const command = args[0] ?? "dashboard";
const has = (name: string) => args.includes(name);
const value = (name: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const json = (data: unknown) => console.log(JSON.stringify(data, null, 2));
const requireLive = () => {
  if (!has("--live")) throw new Error("변경 작업은 --live를 명시해야 합니다.");
};

const inputSchema = z.array(z.object({
  sku: z.string().min(1).max(50),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(3000),
  categoryId: z.number().int().positive(),
  logisticId: z.number().int().positive().optional(),
  price: z.number().positive(),
  stock: z.number().int().nonnegative(),
  weightKg: z.number().positive(),
  imageUrls: z.array(z.string().url()).min(1).max(9),
}));

async function allProducts() {
  const rows: Array<{ item_id?: number; item_status?: string }> = [];
  let offset = 0;
  for (let page = 0; page < 100; page++) {
    const response = await api.getItemList(offset);
    rows.push(...(response.item ?? []));
    if (!response.has_next_page || response.next_offset == null) break;
    offset = Number(response.next_offset);
  }
  const ids = rows.map(row => Number(row.item_id)).filter(Boolean);
  const info = [];
  for (let index = 0; index < ids.length; index += 50) {
    info.push(...((await api.getItemBaseInfo(ids.slice(index, index + 50))).item_list ?? []));
  }
  return info;
}

async function main() {
  if (command === "help" || has("--help")) {
    console.log("Commands: health | dashboard | products | orders --days N | logistics | inventory --item-id ID --qty N --live | register --input FILE --live");
    return;
  }
  if (!constants.shopeeFullyConfigured()) throw new Error("Shopee API credentials are not fully configured.");

  if (command === "health") {
    const [shop, channels] = await Promise.all([api.getShopInfo(), api.getChannelList()]);
    json({ ok: true, shop, enabledLogistics: (channels.logistics_channel_list ?? []).filter(row => row.enabled), mode: constants.shopeeListingMode() });
    return;
  }
  if (command === "products") { json({ products: await allProducts() }); return; }
  if (command === "orders") {
    const days = Math.min(15, Math.max(1, Number(value("--days") ?? 7) || 7));
    const now = Math.floor(Date.now() / 1000);
    json({ orders: await api.getOrderDetailsForRange({ timeFrom: now - days * 86400, timeTo: now }) });
    return;
  }
  if (command === "logistics") { json(await api.getChannelList()); return; }
  if (command === "inventory") {
    requireLive();
    const itemId = Number(value("--item-id"));
    const qty = Number(value("--qty"));
    if (!Number.isInteger(itemId) || itemId <= 0 || !Number.isInteger(qty) || qty < 0) throw new Error("--item-id and non-negative --qty are required.");
    json(await api.updateStock(itemId, qty));
    return;
  }
  if (command === "register") {
    requireLive();
    const inputPath = value("--input");
    if (!inputPath) throw new Error("--input JSON path is required.");
    const products = inputSchema.parse(JSON.parse(readFileSync(resolve(inputPath), "utf8")));
    if (new Set(products.map(row => row.sku)).size !== products.length) throw new Error("Duplicate SKU in input.");
    const results = [];
    for (const product of products) {
      const existing = await listings.findShopeeItemIdBySku(product.sku);
      if (existing) { results.push({ sku: product.sku, itemId: existing, status: "existing" }); continue; }
      const imageIds = [];
      for (const url of product.imageUrls) {
        const imageId = await api.uploadImageFromUrl(url);
        if (imageId) imageIds.push(imageId);
      }
      if (!imageIds.length) throw new Error(`${product.sku}: image upload failed.`);
      const logisticId = product.logisticId ?? constants.shopeeDefaultLogisticId();
      if (!logisticId) throw new Error(`${product.sku}: logisticId is required.`);
      const response = await api.addItem({
        item_name: product.title,
        description: product.description,
        item_sku: product.sku,
        category_id: product.categoryId,
        original_price: product.price,
        seller_stock: [{ stock: product.stock }],
        logistic_info: [{ enabled: true, logistic_id: logisticId }],
        image: { image_id_list: imageIds },
        weight: product.weightKg,
        item_status: "NORMAL",
        brand: { brand_id: 0, original_brand_name: "LEXI" },
      });
      results.push({ sku: product.sku, itemId: response.item_id ?? null, status: "created" });
    }
    json({ count: results.length, results });
    return;
  }
  if (command === "dashboard") {
    const [shop, channels, products] = await Promise.all([api.getShopInfo(), api.getChannelList(), allProducts()]);
    json({ shop, enabledLogistics: (channels.logistics_channel_list ?? []).filter(row => row.enabled), productCount: products.length, products });
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

main().catch(error => {
  console.error(`shopee-cli error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
