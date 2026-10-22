import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import * as api from "../channels/shopee/api";
import { withShopeeScope } from "../channels/shopee/scope";
import { appConfig, openTokens, sealTokens } from "./security";
import { StudioError, matchSku, type Product, type Order } from "./domain";
import { type Workspace, type Shop } from "./store";

export async function inShop<T>(w: Workspace, shop: Shop, checkpoint: () => Promise<void>, fn: () => Promise<T>) {
  const owner = `${w.id}:${shop.shopId}`;
  return withShopeeScope({ ...appConfig(), shopId: shop.shopId, ...openTokens(shop.tokens, owner), onTokens: async tokens => {
    shop.tokens = sealTokens(tokens, owner);
    await checkpoint();
  } }, fn);
}

export function allowedImageUrl(raw: string) {
  const url = new URL(raw);
  const hosts = ["cf.cjdropshipping.com", "oss-cf.cjdropshipping.com", ...(process.env.SELLER_STUDIO_IMAGE_HOSTS || "").split(",").map(s => s.trim()).filter(Boolean)];
  if (url.protocol !== "https:" || url.username || url.password || url.port || isIP(url.hostname) || !hosts.includes(url.hostname) || url.hostname === "localhost" || url.hostname.endsWith(".local")) {
    throw new StudioError("이미지 호스트를 SELLER_STUDIO_IMAGE_HOSTS에 등록하세요. 공개 HTTPS 이미지 주소만 지원합니다.");
  }
  return url;
}
async function uploadImage(raw: string) {
  const url = allowedImageUrl(raw);
  const addresses = await lookup(url.hostname, { all: true });
  // Only publicly routable IPv4 addresses; private/IPv6-only destinations fail closed.
  if (!addresses.length || addresses.some(({ address }) => !publicIpv4(address))) throw new StudioError("비공개 네트워크 이미지는 사용할 수 없습니다.");
  const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(20000) });
  const type = res.headers.get("content-type")?.split(";")[0] || "";
  if (!res.ok || !["image/jpeg", "image/png", "image/webp"].includes(type) || Number(res.headers.get("content-length")) > 8_000_000 || !res.body) throw new StudioError("이미지는 JPG·PNG·WebP, 8MB 이하여야 합니다.");
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    length += value.length;
    if (length > 8_000_000) { await reader.cancel(); throw new StudioError("이미지는 8MB 이하여야 합니다."); }
    chunks.push(value);
  }
  const form = new FormData();
  form.append("image", new Blob([Buffer.concat(chunks)], { type }), type === "image/png" ? "product.png" : type === "image/webp" ? "product.webp" : "product.jpg");
  const image = await api.shopeeRequest<{ image_info?: { image_id?: string } }>("POST", "/api/v2/media_space/upload_image", { form });
  if (!image.image_info?.image_id) throw new StudioError("Shopee 이미지 업로드 결과를 확인할 수 없습니다.", 502);
  return image.image_info.image_id;
}
function publicIpv4(ip: string) {
  if (isIP(ip) !== 4) return false;
  const [a, b] = ip.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)));
}
export function variationBody(p: Product, itemId: number) {
  const colors = [...new Set(p.variants.map(v => v.color || "Standard"))];
  const sizes = [...new Set(p.variants.map(v => v.size || "One size"))];
  return { item_id: itemId,
    tier_variation: [{ name: "Color", option_list: colors.map(option => ({ option })) }, { name: "Size", option_list: sizes.map(option => ({ option })) }],
    model: p.variants.map(v => ({ tier_index: [colors.indexOf(v.color || "Standard"), sizes.indexOf(v.size || "One size")], model_sku: v.sku, original_price: p.priceSgd, seller_stock: [{ stock: v.stock }] })),
  };
}
export async function publish(p: Product, checkpoint: () => Promise<void>) {
  const shop = await api.getShopInfo();
  if (shop.region !== "SG") throw new StudioError("첫 버전은 싱가포르 상점·SGD만 지원합니다.");
  if (p.brand) throw new StudioError("브랜드 상품은 카테고리별 brand_id 확인이 필요합니다. 첫 버전은 무브랜드 상품만 실등록합니다.");
  for (const url of p.imageUrls) allowedImageUrl(url);
  const imageIds: string[] = [];
  for (const url of p.imageUrls) imageIds.push(await uploadImage(url));
  const item = await api.addItem({ item_name: p.englishTitle, description: p.englishDescription,
    item_sku: p.sku, original_price: p.priceSgd, category_id: p.categoryId, weight: p.weightKg,
    seller_stock: [{ stock: p.variants.length > 1 ? 0 : p.variants[0].stock }],
    logistic_info: [{ logistic_id: p.logisticId, enabled: true }], image: { image_id_list: imageIds },
    item_status: "UNLIST", brand: { brand_id: 0, original_brand_name: "No Brand" },
  });
  if (!item.item_id) throw new StudioError("Shopee 상품 ID를 확인할 수 없습니다. Seller Center에서 등록 결과를 확인하세요.", 502);
  p.publication!.itemId = item.item_id;
  await checkpoint();
  if (p.variants.length > 1) await api.shopeeRequest("POST", "/api/v2/product/init_tier_variation", { body: variationBody(p, item.item_id) });
  await api.shopeeRequest("POST", "/api/v2/product/update_item", { body: { item_id: item.item_id, item_status: "NORMAL" } });
  return item.item_id;
}
export async function ordersForShop(shop: Shop, products: Product[]): Promise<Order[]> {
  const now = Math.floor(Date.now() / 1000);
  const orders = await api.getOrderDetailsForRange({ timeFrom: now - 7 * 86400, timeTo: now, orderStatus: "" });
  return orders.map(o => ({ shopId: shop.id, orderSn: String(o.order_sn || ""), status: o.order_status || "UNKNOWN", currency: o.currency || "SGD", total: o.total_amount ?? 0,
    items: (o.item_list || []).map(i => {
      const sku = i.model_sku || i.item_sku || "";
      return { name: i.item_name || "", sku, quantity: i.model_quantity_purchased ?? 0, ...matchSku(sku, products) };
    }) }));
}
