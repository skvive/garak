import type { PdpStructured } from "@/lib/pdp/ruleset";
import type { CatalogRow } from "@/lib/catalog/index-store";
import { projectForShopee } from "@/lib/export/channel-projection";
import { shopeeDefaultCategoryId, shopeeDefaultLogisticId, shopeeListingMode } from "./constants";
import { addItem, getChannelList, getItemBaseInfo, getItemList, updateStock, uploadImageFromUrl } from "./api";

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function resolveLogisticId(): Promise<number> {
  const envId = shopeeDefaultLogisticId();
  if (envId) return envId;
  const ch = await getChannelList();
  const enabled = (ch.logistics_channel_list ?? []).find((c) => c.enabled && c.logistic_id);
  return Number(enabled?.logistic_id ?? 0);
}

export async function publishShopeeItem(opts: {
  sku: string;
  structured: PdpStructured;
  catalog: CatalogRow | null;
  sellPriceLocal: number;
  retailPriceLocal?: number;
  imageUrls?: string[];
  forceMode?: "preview" | "live";
  stock: number;
}) {
  const projected = projectForShopee(opts.structured, opts.catalog);
  const mode = opts.forceMode ?? shopeeListingMode();
  if (mode === "preview") {
    return { mode, sku: opts.sku, itemId: null as number | null, validationOnly: true };
  }
  const categoryId = Number(projected.category_id) || shopeeDefaultCategoryId();
  const logisticId = (await resolveLogisticId()) || Number(projected.logistic_id) || 0;
  if (!categoryId) throw new Error("shopee: SHOPEE_CATEGORY_ID required for live");
  if (!logisticId) throw new Error("shopee: logistic channel missing");
  if (!Number.isInteger(opts.stock) || opts.stock < 0) throw new Error("shopee: verified stock required");
  const existingItemId = await findShopeeItemIdBySku(opts.sku);
  if (existingItemId) return { mode, sku: opts.sku, itemId: existingItemId, validationOnly: false, existing: true };

  const imageIds: string[] = [];
  for (const url of (opts.imageUrls ?? []).slice(0, 9)) {
    const id = await uploadImageFromUrl(url);
    if (id) imageIds.push(id);
  }
  if (!imageIds.length) throw new Error("shopee: image upload failed");

  const res = await addItem({
    original_price: opts.retailPriceLocal ?? opts.sellPriceLocal,
    description: stripHtml(opts.structured.descriptionHtml ?? "").slice(0, 3000) || opts.structured.title,
    item_name: String(projected.item_name),
    item_sku: opts.sku,
    seller_stock: [{ stock: opts.stock }],
    logistic_info: [{ enabled: true, logistic_id: logisticId }],
    category_id: categoryId,
    image: { image_id_list: imageIds },
    weight: 0.5,
    item_status: "NORMAL",
    brand: { brand_id: 0, original_brand_name: "LEXI" },
  });
  return { mode, sku: opts.sku, itemId: res.item_id ?? null, validationOnly: false };
}

export async function findShopeeItemIdBySku(sku: string): Promise<number | null> {
  const list = await getItemList(0);
  const ids = (list.item ?? []).map((i) => Number(i.item_id)).filter(Boolean);
  const info = await getItemBaseInfo(ids);
  const hit = (info.item_list ?? []).find((i) => i.item_sku === sku);
  return hit?.item_id ?? null;
}

export async function patchShopeeStock(itemId: number, qty: number) {
  return updateStock(itemId, qty);
}
