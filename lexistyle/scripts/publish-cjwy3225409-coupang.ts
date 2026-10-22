/**
 * 쿠팡 등록 — 남성 골지 모크넥 스웨트셔츠 (CJWY3225409)
 * CJ vid = externalVendorSku, 색상×사이즈 29옵션, 정책가 (cost+20)×1.3
 * Usage: npx tsx scripts/publish-cjwy3225409-coupang.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { coupangAdapter } from "../src/lib/channels/adapters/coupang";
import { listCoupangSellerProducts } from "../src/lib/channels/coupang/ops";
import { coupangRequest } from "../src/lib/channels/coupang/client";
import { computeSellPrice } from "../src/lib/hq/types";

const ROOT = path.resolve("public/pdp/cjwy3225409-sweatshirt");
const TITLE = "LEXI 남성 골지 모크넥 스웨트셔츠";
const COST_USD = 5.33;
const PRODUCT_SKU = "CJWY3225409";

const COLOR_KO: Record<string, string> = {
  White: "화이트",
  "Army Green": "아미그린",
  Khaki: "카키",
  Black: "블랙",
  "Dark Gray": "다크그레이",
};

function contentHtml(u: Record<string, string>) {
  const image = (name: string, alt: string) =>
    `<img src="${u[name]}" alt="${alt}" style="display:block;width:100%;max-width:780px;margin:0 auto;border:0"/>`;
  return `<div style="width:100%;max-width:780px;margin:0 auto;font-family:Pretendard,'Noto Sans KR',Arial,sans-serif;color:#1a1a1a;background:#faf9f7">
<div style="background:#1a1a1a;color:#fff;padding:10px 20px;text-align:center;font-size:14px">해외배송 상품입니다 · 구매 전 하단 배송·교환·반품 안내를 확인해 주세요</div>
${image("hero-black.jpg", "블랙 골지 모크넥 스웨트셔츠 착용")}
<div style="padding:40px 28px"><p style="font-size:13px;letter-spacing:3px;color:#e85d4c;font-weight:700">RIBBED MOCK NECK</p>
<h1 style="font-size:32px;line-height:1.35;margin:8px 0 12px">골지 모크넥 스웨트셔츠</h1>
<p style="font-size:18px;line-height:1.7;color:#6e6e73;margin:0 0 12px">블랙·화이트·다크그레이·아미그린·카키 5가지 컬러 중 원하는 1벌</p>
<p style="font-size:16px;line-height:1.7;color:#6e6e73">세로 골지와 스웨이드 톤 배색이 있는 모크넥 스웨트셔츠입니다. 주문 시 컬러와 사이즈를 하나씩 선택해 주세요.</p></div>
${image("look-black-upper.jpg", "블랙 착용 디테일")}
<div style="padding:40px 28px;background:#ebe6dc"><h2 style="font-size:26px;margin:0 0 12px">다섯 가지 컬러</h2>
<p style="color:#6e6e73;line-height:1.7;margin:0 0 20px">옵션에서 컬러와 사이즈를 선택하면 해당 스웨트셔츠 1벌이 배송됩니다.</p>
${image("hero-black.jpg", "블랙")}${image("hero-white.jpg", "화이트")}${image("hero-dark-gray.jpg", "다크그레이")}${image("hero-army-green.jpg", "아미그린")}${image("hero-khaki.jpg", "카키")}</div>
<div style="padding:40px 28px"><h2 style="font-size:26px;margin:0 0 12px">원래 디자인 그대로</h2>
${image("product-black.jpg", "블랙 실물")}${image("product-white.jpg", "화이트 실물")}${image("product-dark-gray.jpg", "다크그레이 실물")}${image("product-army-green.jpg", "아미그린 실물")}${image("product-khaki.jpg", "카키 실물")}</div>
<div style="padding:40px 28px;background:#ebe6dc"><h2 style="font-size:26px;margin:0 0 12px">사이즈 가이드</h2>
<p style="color:#6e6e73;line-height:1.7">아시아 사이즈 S · M · L · XL · 2XL · 3XL 기준입니다. 카키는 XL 옵션이 없습니다. 평소 상의 사이즈를 참고해 선택해 주세요.</p></div>
<div style="margin:0 28px 28px;padding:18px;background:#fff;border:2px solid #1a1a1a;border-radius:12px">
<p style="margin:0 0 10px;font-size:16px;font-weight:800">필독 · 교환/반품 비용 (해외배송 왕복비용) 48,000원</p>
<p style="margin:0 0 8px;font-size:15px;line-height:1.7">해외배송 상품으로 반품 시 해외택배 왕복비용이 공제됩니다.</p>
<p style="margin:0;font-size:15px;line-height:1.7">제품 하자 시 절반을 판매자가 부담하여 <strong>24,000원</strong>이 공제됩니다.</p>
<p style="margin:14px 0 0;font-size:15px;line-height:1.7;color:#6e6e73">배송: LEXI 소싱 해외배송 · 결제 후 영업일 기준 7~14일 도착</p></div>
<div style="padding:40px 28px;background:#1a1a1a;color:#fff;text-align:center"><b style="font-size:17px">LEXI IS RPCOW.</b><br/><span style="color:#bbb">Radiant Presence, Captivating Outfit for your Wardrobe.</span></div>
</div>`;
}

async function main() {
  delete process.env.COUPANG_AGENT_DOCUMENT_URL;

  const remote = JSON.parse(await readFile(path.join(ROOT, "remote-assets.json"), "utf8")) as Record<string, string>;
  const stockRows = JSON.parse(await readFile(path.resolve("tmp/cj-sweatshirt-stock.json"), "utf8")) as { vid: string; stock: number }[];
  const stockByVid = new Map(stockRows.map((r) => [r.vid, r.stock]));
  const product = JSON.parse(await readFile(path.resolve("tmp/cj-sweatshirt-product.json"), "utf8")).data;
  const variants = product.variants as { vid: string | number; variantKey: string; variantSellPrice: number }[];

  const existing = await listCoupangSellerProducts();
  const duplicate = existing.find((item) => item.name === TITLE || /CJWY3225409|골지 모크넥 스웨트셔츠/.test(item.name));
  if (duplicate) throw new Error(`duplicate blocked: ${duplicate.sellerProductId} ${duplicate.name}`);

  const sellPriceUsd = computeSellPrice(COST_USD);
  const now = new Date().toISOString();
  const options = variants.map((v) => {
    const vid = String(v.vid);
    const parts = String(v.variantKey).split("-");
    // "Army Green-S" / "Dark Gray-M" → color may contain space
    const size = parts[parts.length - 1]!;
    const colorEn = parts.slice(0, -1).join("-") || parts[0]!;
    const color = COLOR_KO[colorEn] ?? colorEn;
    const stock = stockByVid.get(vid) ?? 0;
    if (!stock) throw new Error(`stock missing for ${vid}`);
    return {
      name: `${color} / ${size}`,
      sku: vid,
      priceUsd: sellPriceUsd,
      stock,
      attributes: { color, size },
    };
  });

  const html = contentHtml(remote);
  const draft = {
    id: 3225409,
    supplierProductId: 3225409,
    version: 1,
    title: TITLE,
    subtitle: "골지 모크넥 스웨트셔츠, 컬러·사이즈를 골라 주세요",
    descriptionHtml: html,
    renderedHtml: html,
    seoKeywords: ["남성맨투맨", "모크넥", "골지스웨트", "남성니트", "봄가을맨투맨", "엘보우패치"],
    designDoc: { blocks: [] },
    assets: [
      { kind: "thumb" as const, url: remote["coupang-main.jpg"]!, source: "edited" as const },
      { kind: "hero" as const, url: remote["hero-black.jpg"]!, source: "ai" as const },
      ...[
        "hero-white.jpg",
        "hero-dark-gray.jpg",
        "hero-army-green.jpg",
        "hero-khaki.jpg",
        "product-black.jpg",
        "product-white.jpg",
        "product-dark-gray.jpg",
        "product-army-green.jpg",
        "product-khaki.jpg",
        "look-black-upper.jpg",
      ].map((name) => ({ kind: "detail" as const, url: remote[name]!, source: "edited" as const })),
    ],
    aiModel: "Cursor GenerateImage",
    status: "approved" as const,
    createdAt: now,
    options,
  };

  const result = await coupangAdapter.publish({
    channel: {
      id: 2,
      code: "coupang",
      kind: "coupang",
      name: "쿠팡",
      config: { tradeModel: "purchase-agency", currency: "KRW" },
    },
    listing: {
      id: 3225409,
      draftId: draft.id,
      productSlug: "mens-ribbed-mock-neck-sweatshirt",
      marginPolicy: { type: "rate", value: 0.3, minMarginUsd: 0 },
      supplierCostUsd: COST_USD,
      sellPriceUsd,
      retailPriceUsd: sellPriceUsd * 1.15,
      status: "ready",
      createdAt: now,
    },
    draft,
    options,
  });

  const detail = (await coupangRequest(
    "GET",
    `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${result.externalRef}`,
    "",
  )) as Record<string, any>;

  const items = Array.isArray(detail?.items) ? detail.items : [];
  const receipt = {
    ...result,
    title: TITLE,
    productSku: PRODUCT_SKU,
    variants: options.length,
    sellPriceUsd,
    salePriceKrw: Math.round(sellPriceUsd / 0.00072 / 10) * 10,
    status: detail?.status ?? null,
    statusName: detail?.statusName ?? null,
    productId: detail?.productId ?? null,
    displayCategoryCode: detail?.displayCategoryCode ?? null,
    optionSample: items.slice(0, 5).map((it: any) => ({
      itemName: it.itemName,
      externalVendorSku: it.externalVendorSku,
      salePrice: it.salePrice,
      attributes: it.attributes,
    })),
    createdAt: now,
  };
  await writeFile(path.join(ROOT, "coupang-publish-receipt.json"), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
