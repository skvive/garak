import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { put } from "@vercel/blob";
import { coupangAdapter } from "../src/lib/channels/adapters/coupang";
import { coupangRequest } from "../src/lib/channels/coupang/client";
import { listCoupangSellerProducts } from "../src/lib/channels/coupang/ops";
import { computeSellPrice } from "../src/lib/hq/types";

const TITLES: Record<string, string> = {
  CJYD1910916: "LEXI 반려동물 펠트 크리스마스트리 노즈워크 장난감",
  CJMY1224717: "LEXI 반려동물 포근한 텐트형 하우스",
  CJJJCWMY00727: "LEXI 반려동물 쿠션 텐트 베드",
  CJYD1876114: "LEXI 주방용 미세분사 오일 스프레이어",
  CJJT1723382: "LEXI 온도조절 머그 워머 세트",
  CJYD3233379: "LEXI 여성 미디 롱 베스트 재킷",
  CJXZ1914107: "LEXI 남성 슬림핏 클래식 수트 재킷",
  CJMY2563890: "LEXI 여성 버튼 포인트 터틀넥 니트 원피스",
  CJWY2812113: "LEXI 여성 코듀로이 후드 집업 재킷",
  CJJK1139730: "LEXI 여성 스웨이드 퍼 무스탕 재킷",
  CJQB1322244: "LEXI 여성 하운드투스 클래식 재킷",
  CJWY3206345: "LEXI 남녀공용 3D 카무플라주 후드티",
  CJXZ3183638: "LEXI 남성 레이어드 미디 트렌치코트",
  CJYH1178713: "LEXI 남성 농구 그래픽 후드티",
  CJMY3060348: "LEXI 여성 도톰한 하이넥 니트 스웨터",
  CJYD3060906: "LEXI 여성 와이드 레그 긴소매 점프수트",
  CJLY3062288: "LEXI 여성 레오파드 브이넥 원피스",
  CJLY3064619: "LEXI 여성 라운드넥 미디 원피스",
};

const COLOR_KO: Record<string, string> = {
  black: "블랙", white: "화이트", gray: "그레이", grey: "그레이", "light gray": "라이트그레이",
  "dark gray": "다크그레이", beige: "베이지", khaki: "카키", apricot: "애프리콧", red: "레드",
  "dark red": "다크레드", blue: "블루", "navy blue": "네이비", green: "그린", pink: "핑크",
  yellow: "옐로", brown: "브라운", purple: "퍼플", orange: "오렌지",
};
const SIZE = /^(?:XXS|XS|S|M|L|XL|XXL|XXXL|[2-8]XL|FREE SIZE)$/i;
const ROOT = path.resolve("public/pdp/cj-added");

type Row = Record<string, any>;
const unique = <T>(rows: T[]) => [...new Set(rows)];

function parseImages(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw !== "string" || !raw) return [];
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [raw]; }
  catch { return [raw]; }
}

function descriptionImages(html: unknown): string[] {
  return [...String(html ?? "").matchAll(/<img[^>]+src=["']([^"']+)/gi)].map((m) => m[1]!);
}

function ko(value: string) { return COLOR_KO[value.trim().toLowerCase()] ?? value.trim(); }

function optionParts(keyRaw: unknown): { color: string; size: string; quantity?: string } {
  const key = String(keyRaw ?? "단일").trim();
  const parts = key.split("-").filter(Boolean);
  const first = parts[0] ?? "단일";
  const last = parts.at(-1) ?? "단일";
  if (SIZE.test(first) && parts.length > 1) return { color: ko(parts.slice(1).join(" ")), size: first.toUpperCase() };
  if (SIZE.test(last) && parts.length > 1) return { color: ko(parts.slice(0, -1).join(" ")), size: last.toUpperCase() };
  return { color: ko(key), size: "단일", ...(last.match(/\d+PCS?/i) ? { quantity: last } : {}) };
}

function inventory(variant: Row): number {
  const rows = variant.inventories ?? variant.inventoryList ?? [];
  if (Array.isArray(rows) && rows.length) {
    const total = rows.reduce((sum: number, row: Row) => sum + (Number(row.inventory ?? row.totalInventory) || 0), 0);
    if (total > 0) return Math.min(total, 99999);
  }
  return Math.min(Number(variant.inventory ?? variant.stock) || 10, 99999);
}

async function publishOne(sku: string, existing: Awaited<ReturnType<typeof listCoupangSellerProducts>>) {
  const title = TITLES[sku];
  if (!title) throw new Error(`unsupported SKU: ${sku}`);
  const duplicate = existing.find((item) => item.name === title || item.name.includes(sku));
  if (duplicate) return { sku, skipped: true, sellerProductId: duplicate.sellerProductId, reason: "duplicate" };
  const product = JSON.parse(await readFile(`tmp/coupang/added-products/${sku}.json`, "utf8")) as Row;
  const variants = (product.variants ?? product.productVariants ?? []) as Row[];
  if (!variants.length) throw new Error("CJ variants missing");
  const sourceUrls = unique([...parseImages(product.productImage), ...descriptionImages(product.description)]).slice(0, 10);
  if (!sourceUrls.length) throw new Error("CJ images missing");
  const dir = path.join(ROOT, sku.toLowerCase());
  await mkdir(dir, { recursive: true });
  const remote: Record<string, string> = {};
  for (const [index, url] of sourceUrls.entries()) {
    const file = `original-${String(index + 1).padStart(2, "0")}.jpg`;
    const response = await fetch(url);
    if (!response.ok) continue;
    const processed = await sharp(Buffer.from(await response.arrayBuffer())).rotate().flatten({ background: "#ffffff" })
      .resize({ width: 1200, height: 1200, fit: "contain", background: "#ffffff", withoutEnlargement: false }).jpeg({ quality: 88 }).toBuffer();
    await writeFile(path.join(dir, file), processed);
    const blob = await put(`coupang/added/${sku}/${file}`, processed, { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "image/jpeg" });
    remote[file] = blob.url;
  }
  const images = Object.values(remote);
  if (!images.length) throw new Error("image processing failed");
  const colorList = unique(variants.map((variant) => optionParts(variant.variantKey).color));
  const sizeList = unique(variants.map((variant) => optionParts(variant.variantKey).size));
  const imageHtml = images.map((url, index) => `<img src="${url}" alt="${title} 원본 상품 이미지 ${index + 1}" style="display:block;width:100%;height:auto;margin:0" />`).join("");
  const detail = `<div style="max-width:780px;margin:0 auto;font-family:Pretendard,'Noto Sans KR','Apple SD Gothic Neo',sans-serif;color:#181816;word-break:keep-all;text-align:center;font-size:14px;line-height:1.7">
<div style="padding:18px 24px;background:#181816;color:#fff;font-weight:700">LEXI ORIGINAL EDIT</div><img src="${images[0]}" alt="${title}" style="display:block;width:100%;height:auto" />
<div style="padding:46px 28px;background:#faf9f6"><h1 style="margin:0 0 14px;font-size:32px;line-height:1.3;text-wrap:balance">${title}</h1><p style="margin:0;font-size:16px;line-height:1.8">실제 원본 이미지와 옵션 정보를 확인하고 원하는 색상·사이즈를 선택하세요.</p></div>
<div style="padding:38px 28px;background:#eee9df;text-align:left"><h2 style="font-size:24px;line-height:1.3;text-wrap:balance">옵션 안내</h2><p><b>색상</b> ${colorList.join(" / ")}</p><p><b>사이즈</b> ${sizeList.join(" / ")}</p><p>총 ${variants.length}개 실옵션 · 주문 시 선택한 1개 상품이 배송됩니다.</p></div>
${imageHtml}
<div style="padding:42px 28px;background:#faf9f6;text-align:left"><h2 style="font-size:24px;line-height:1.3;text-wrap:balance">제품 정보</h2><p><b>소재</b> ${product.materialNameEn ?? "상세 이미지 참조"}</p><p><b>구성</b> 선택 옵션 1개</p><p><b>사이즈 안내</b> 공급처 실측표가 있는 경우 위 원본 이미지에서 확인해 주세요. 수작업 측정으로 2–3cm 차이가 있을 수 있습니다.</p></div>
<div style="padding:42px 28px;background:#eee9df;text-align:left"><h2 style="font-size:24px;line-height:1.3;text-wrap:balance">배송 · 교환 · 반품 안내</h2><p><b>배송방법</b> 순차배송 · 한진택배</p><p><b>배송비</b> 무료배송</p><p><b>도서산간</b> 배송이 제한되거나 3–5일 추가 소요될 수 있습니다.</p><p><b>배송기간</b> 결제 후 영업일 기준 7–14일</p><p><b>통관</b> 개인통관고유부호가 필요할 수 있습니다.</p><p><b>왕복 반품비</b> 단순 변심 48,000원 · 제품 하자 확인 시 24,000원</p><p><b>반품 제한</b> 사용 흔적, 세탁, 택·라벨 훼손, 오염, 구성품 누락 등 상품 가치가 감소한 경우 제한될 수 있습니다.</p><p>상품의 내용이 표시·광고와 다른 경우 관계 법령과 쿠팡 정책이 우선 적용됩니다.</p></div>
<div style="padding:34px 28px;background:#20201e;color:#fff"><b>LEXI IS RPCOW.</b><br/>Radiant Presence, Captivating Outfit for your Wardrobe.</div></div>`;
  await writeFile(path.join(dir, "detail-fragment.html"), detail);
  await writeFile(path.join(dir, "remote-assets.json"), JSON.stringify(remote, null, 2));
  if (process.argv.includes("--draft-only")) return { sku, title, status: "상세페이지 생성", variants: variants.length, path: path.relative(process.cwd(), dir) };
  const now = new Date().toISOString();
  const options = variants.map((variant) => {
    const attrs = optionParts(variant.variantKey);
    if (["CJYD1910916", "CJJJCWMY00727"].includes(sku) && attrs.size === "단일") attrs.size = "기본형";
    const cost = Number(variant.variantSellPrice ?? product.sellPrice) || 1;
    return { name: `${attrs.color} / ${attrs.size}`, sku: String(variant.vid), priceUsd: computeSellPrice(cost), stock: inventory(variant), attributes: attrs };
  });
  const maxCost = Math.max(...variants.map((variant) => Number(variant.variantSellPrice ?? product.sellPrice) || 1));
  const sellPriceUsd = computeSellPrice(maxCost);
  // Coupang OpenAPI caps each one-way return fee field at 10,000 KRW.
  process.env.COUPANG_RETURN_SHIPPING_FEE = "10000";
  delete process.env.COUPANG_AGENT_DOCUMENT_URL;
  const id = Number(String(product.pid).replace(/\D/g, "").slice(-9)) || Date.now();
  const draft = { id, supplierProductId: id, version: 1, title, subtitle: "LEXI 큐레이션", descriptionHtml: detail, renderedHtml: detail,
    seoKeywords: title.split(" ").slice(1), designDoc: { blocks: [] },
    assets: [{ kind: "thumb" as const, url: images[0]!, source: "edited" as const }, ...images.slice(1).map((url) => ({ kind: "detail" as const, url, source: "edited" as const }))],
    aiModel: "CJ original product imagery", status: "approved" as const, createdAt: now, options };
  const result = await coupangAdapter.publish({
    channel: { id: 2, code: "coupang", kind: "coupang", name: "쿠팡", config: { tradeModel: "purchase-agency", currency: "KRW" } },
    listing: { id, draftId: id, productSlug: sku.toLowerCase(), marginPolicy: { type: "rate", value: 0.3, minMarginUsd: 0 }, supplierCostUsd: maxCost, sellPriceUsd, retailPriceUsd: sellPriceUsd * 1.15, status: "ready", createdAt: now },
    draft, options,
  });
  const live = await coupangRequest("GET", `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${result.externalRef}`, "") as Row;
  const first = live.items?.[0] ?? {};
  const receipt = { sku, title, sellerProductId: result.externalRef, productId: live.productId, status: live.statusName ?? live.status, variants: live.items?.length,
    itemId: first.itemId, vendorItemId: first.vendorItemId, url: live.productId ? `https://www.coupang.com/vp/products/${live.productId}?itemId=${first.itemId}&vendorItemId=${first.vendorItemId}` : null };
  await writeFile(path.join(dir, "coupang-publish-receipt.json"), JSON.stringify(receipt, null, 2));
  return receipt;
}

async function main() {
  const requested = process.argv.find((arg) => arg.startsWith("--skus="))?.slice(7).split(",").filter(Boolean) ?? Object.keys(TITLES);
  const existing = await listCoupangSellerProducts();
  const results: unknown[] = [];
  for (const [index, sku] of requested.entries()) {
    try { const result = await publishOne(sku, existing); results.push(result); console.log(`[${index + 1}/${requested.length}] ${sku} OK`); }
    catch (error) { const message = error instanceof Error ? error.message : String(error); results.push({ sku, error: message }); console.error(`[${index + 1}/${requested.length}] ${sku} FAIL ${message}`); }
  }
  await writeFile("tmp/coupang/added-fashion-publish-results.json", JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
