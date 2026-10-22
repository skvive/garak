/**
 * 쿠팡 등록 — 남성 플리스 후드·조거 투피스 (CJTW3189049)
 * CJ vid = externalVendorSku, 색상×사이즈 18옵션, 정책가 (cost+20)×1.3
 * Usage: npx tsx scripts/publish-cjtw3189049-coupang.ts
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

const ROOT = path.resolve("public/pdp/cjtw3189049-sport-set");
const TITLE = "LEXI 남성 플리스 후드·조거 투피스 세트";
const COST_USD = 4.17;
const PRODUCT_SKU = "CJTW3189049";

const COLOR_KO: Record<string, string> = {
  Brown: "브라운",
  "Sky Blue": "스카이블루",
  "Light Purple": "라이트퍼플",
};

function contentHtml(u: Record<string, string>) {
  const image = (name: string, alt: string) =>
    `<img src="${u[name]}" alt="${alt}" style="display:block;width:100%;max-width:780px;margin:0 auto;border:0"/>`;
  return `<div style="width:100%;max-width:780px;margin:0 auto;font-family:Pretendard,'Noto Sans KR',Arial,sans-serif;color:#1a1a1a;background:#faf9f7">
<div style="background:#1a1a1a;color:#fff;padding:10px 20px;text-align:center;font-size:14px">해외배송 상품입니다 · 구매 전 하단 배송·교환·반품 안내를 확인해 주세요</div>
${image("hero-brown.jpg", "브라운 플리스 후드 조거 투피스 착용")}
<div style="padding:40px 28px"><p style="font-size:13px;letter-spacing:3px;color:#e85d4c;font-weight:700">CITY EASY SET</p>
<h1 style="font-size:32px;line-height:1.35;margin:8px 0 12px">플리스 후드·조거 투피스 세트</h1>
<p style="font-size:18px;line-height:1.7;color:#6e6e73;margin:0 0 12px">브라운·스카이블루·라이트퍼플 3가지 컬러 중 원하는 1세트</p>
<p style="font-size:16px;line-height:1.7;color:#6e6e73">같은 컬러의 플리스 후드와 조거 팬츠가 한 세트로 구성됩니다. 주문 시 컬러와 사이즈를 하나씩 선택해 주세요.</p></div>
${image("look-brown-upper.jpg", "브라운 착용 디테일")}
<div style="padding:40px 28px;background:#ebe6dc"><h2 style="font-size:26px;margin:0 0 12px">세 가지 컬러</h2>
<p style="color:#6e6e73;line-height:1.7;margin:0 0 20px">옵션에서 컬러와 사이즈를 선택하면 해당 세트가 배송됩니다.</p>
${image("hero-brown.jpg", "브라운")}${image("hero-sky.jpg", "스카이블루")}${image("hero-purple.jpg", "라이트퍼플")}</div>
<div style="padding:40px 28px"><h2 style="font-size:26px;margin:0 0 12px">원래 디자인 그대로</h2>
${image("product-brown.jpg", "브라운 실물")}${image("product-sky.jpg", "스카이블루 실물")}${image("product-purple.jpg", "라이트퍼플 실물")}</div>
<div style="padding:40px 28px;background:#ebe6dc"><h2 style="font-size:26px;margin:0 0 12px">실물 디테일</h2>
${image("detail-hoodie.jpg", "후드")}${image("detail-pocket.jpg", "캥거루 포켓")}${image("detail-pants.jpg", "조거 팬츠")}</div>
<div style="padding:40px 28px"><h2 style="font-size:26px;margin:0 0 12px">사이즈 가이드</h2>
<p style="color:#6e6e73;line-height:1.7">상의(후드) · 하의(조거) 실측표를 확인하세요. 아시아 사이즈 기준이며 1~3cm 오차가 있을 수 있습니다.</p>
${image("size-top.jpg", "상의 사이즈표")}${image("size-pants.jpg", "하의 사이즈표")}</div>
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
  const stockRows = JSON.parse(await readFile(path.resolve("tmp/cj-sport-stock.json"), "utf8")) as { vid: string; stock: number }[];
  const stockByVid = new Map(stockRows.map((r) => [r.vid, r.stock]));
  const product = JSON.parse(await readFile(path.resolve("tmp/cj-sport-product.json"), "utf8")).data;
  const variants = product.variants as { vid: string | number; variantKey: string }[];

  const existing = await listCoupangSellerProducts();
  const duplicate = existing.find((item) => item.name === TITLE || /CJTW3189049|플리스 후드·조거/.test(item.name));
  if (duplicate) throw new Error(`duplicate blocked: ${duplicate.sellerProductId} ${duplicate.name}`);

  const sellPriceUsd = computeSellPrice(COST_USD);
  const now = new Date().toISOString();
  const options = variants.map((v) => {
    const vid = String(v.vid);
    const [colorEn, size] = String(v.variantKey).split("-");
    const color = COLOR_KO[colorEn!] ?? colorEn!;
    const stock = stockByVid.get(vid) ?? 0;
    if (!stock) throw new Error(`stock missing for ${vid}`);
    return {
      name: `${color} / ${size}`,
      sku: vid,
      priceUsd: sellPriceUsd,
      stock,
      attributes: { color, size: size! },
    };
  });

  const html = contentHtml(remote);
  const draft = {
    id: 3189049,
    supplierProductId: 3189049,
    version: 1,
    title: TITLE,
    subtitle: "플리스 후드와 조거 팬츠, 컬러만 고르면 완성되는 이지 투피스",
    descriptionHtml: html,
    renderedHtml: html,
    seoKeywords: ["남성투피스", "후드조거세트", "트레이닝세트", "플리스세트", "남성의류", "조거팬츠"],
    designDoc: { blocks: [] },
    assets: [
      { kind: "thumb" as const, url: remote["coupang-main.jpg"]!, source: "edited" as const },
      { kind: "hero" as const, url: remote["hero-brown.jpg"]!, source: "ai" as const },
      // DETAIL 이미지는 쿠팡 규격 최소 500×500 이상만 사용 (사이즈표는 정사각 패딩본)
      ...[
        "hero-sky.jpg",
        "hero-purple.jpg",
        "product-brown.jpg",
        "product-sky.jpg",
        "product-purple.jpg",
        "detail-pocket.jpg",
        "look-brown-upper.jpg",
        "size-top.jpg",
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
      id: 3189049,
      draftId: draft.id,
      productSlug: "mens-fleece-hoodie-jogger-set",
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
    displayCategoryCode: detail?.displayCategoryCode ?? null,
    optionSample: items.slice(0, 3).map((it: any) => ({
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
