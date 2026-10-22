/**
 * 쿠팡 등록 — 여성 후드 니트 가디건 (CJWY2709996)
 * CJ vid = externalVendorSku, 색상×사이즈 48옵션, 정책가 (cost+20)×1.3
 * Usage: npx tsx scripts/publish-cjwy2709996-coupang.ts
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

const ROOT = path.resolve("public/pdp/cjwy2709996-cardigan");
const TITLE = "LEXI 여성 후드 니트 가디건";
const COST_USD = 6.14;
const PRODUCT_SKU = "CJWY2709996";
const SOLID_COLORS = ["NKS05101", "NKS05102", "NKS05103", "NKS05104", "NKS05105", "NKS05108"] as const;

const COLOR_KO: Record<string, string> = {
  NKS05101: "핑크",
  NKS05102: "오렌지",
  NKS05103: "그레이",
  NKS05104: "아이보리",
  NKS05105: "레드",
  NKS05108: "차콜",
};

function contentHtml(u: Record<string, string>) {
  const image = (name: string, alt: string) =>
    `<img src="${u[name]}" alt="${alt}" style="display:block;width:100%;max-width:780px;margin:0 auto;border:0"/>`;
  return `<div style="width:100%;max-width:780px;margin:0 auto;font-family:Pretendard,'Noto Sans KR',Arial,sans-serif;color:#1a1a1a;background:#faf9f7">
<div style="background:#1a1a1a;color:#fff;padding:10px 20px;text-align:center;font-size:14px">해외배송 상품입니다 · 구매 전 하단 배송·교환·반품 안내를 확인해 주세요</div>
${image("hero-ivory.jpg", "아이보리 후드 니트 가디건 착용")}
<div style="padding:40px 28px"><p style="font-size:13px;letter-spacing:3px;color:#e85d4c;font-weight:700">HOOD CARDIGAN</p>
<h1 style="font-size:32px;line-height:1.35;margin:8px 0 12px">후드 니트 가디건</h1>
<p style="font-size:18px;line-height:1.7;color:#6e6e73;margin:0 0 12px">핑크·오렌지·그레이·아이보리·레드·차콜 6가지 컬러 중 원하는 1벌</p>
<p style="font-size:16px;line-height:1.7;color:#6e6e73">후드와 앞 버튼이 있는 루즈핏 니트 가디건입니다. 주문 시 컬러와 사이즈를 하나씩 선택해 주세요.</p></div>
${image("look-ivory-upper.jpg", "아이보리 착용 디테일")}
<div style="padding:40px 28px;background:#ebe6dc"><h2 style="font-size:26px;margin:0 0 12px">여섯 가지 컬러</h2>
<p style="color:#6e6e73;line-height:1.7;margin:0 0 20px">옵션에서 컬러와 사이즈를 선택하면 해당 가디건 1벌이 배송됩니다.</p>
${image("hero-pink.jpg", "핑크")}${image("hero-orange.jpg", "오렌지")}${image("hero-grey.jpg", "그레이")}
${image("hero-ivory.jpg", "아이보리")}${image("hero-red.jpg", "레드")}${image("hero-charcoal.jpg", "차콜")}</div>
<div style="padding:40px 28px"><h2 style="font-size:26px;margin:0 0 12px">원래 디자인 그대로</h2>
${image("product-pink.jpg", "핑크 실물")}${image("product-orange.jpg", "오렌지 실물")}${image("product-grey.jpg", "그레이 실물")}
${image("product-ivory.jpg", "아이보리 실물")}${image("product-red.jpg", "레드 실물")}${image("product-charcoal.jpg", "차콜 실물")}</div>
<div style="padding:40px 28px;background:#ebe6dc"><h2 style="font-size:26px;margin:0 0 12px">실물 디테일</h2>
${image("detail-hood.jpg", "후드")}${image("detail-button.jpg", "앞 버튼")}${image("detail-cuff.jpg", "리브 커프스")}</div>
<div style="padding:40px 28px"><h2 style="font-size:26px;margin:0 0 12px">사이즈 가이드</h2>
<p style="color:#6e6e73;line-height:1.7">총장·가슴·소매·어깨 실측표를 확인하세요. 아시아 사이즈 기준이며 1~3cm 오차가 있을 수 있습니다.</p>
${image("size-chart.jpg", "사이즈표")}</div>
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
  const stockRows = JSON.parse(await readFile(path.resolve("tmp/cj-cardigan-stock.json"), "utf8")) as { vid: string; stock: number }[];
  const stockByVid = new Map(stockRows.map((r) => [r.vid, r.stock]));
  const summary = JSON.parse(await readFile(path.resolve("tmp/cj-cardigan-summary.json"), "utf8")) as {
    colors: Record<string, { sizes: string[]; vids: string[] }>;
  };

  const existing = await listCoupangSellerProducts();
  const duplicate = existing.find((item) => item.name === TITLE || /CJWY2709996|후드 니트 가디건/.test(item.name));
  if (duplicate) throw new Error(`duplicate blocked: ${duplicate.sellerProductId} ${duplicate.name}`);

  const sellPriceUsd = computeSellPrice(COST_USD);
  const now = new Date().toISOString();
  const options = SOLID_COLORS.flatMap((colorCode) => {
    const color = COLOR_KO[colorCode]!;
    const group = summary.colors[colorCode];
    if (!group) throw new Error(`color missing: ${colorCode}`);
    return group.vids.map((vid, idx) => {
      const size = group.sizes[idx]!;
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
  });

  const html = contentHtml(remote);
  const draft = {
    id: 2709996,
    supplierProductId: 2709996,
    version: 1,
    title: TITLE,
    subtitle: "후드와 버튼이 있는 루즈핏 니트 가디건, 컬러·사이즈를 골라 주세요",
    descriptionHtml: html,
    renderedHtml: html,
    seoKeywords: ["후드가디건", "니트가디건", "여성가디건", "루즈핏가디건", "여성아우터", "니트아우터"],
    designDoc: { blocks: [] },
    assets: [
      { kind: "thumb" as const, url: remote["coupang-main.jpg"]!, source: "edited" as const },
      { kind: "hero" as const, url: remote["hero-ivory.jpg"]!, source: "ai" as const },
      ...[
        "hero-pink.jpg",
        "hero-orange.jpg",
        "hero-grey.jpg",
        "hero-red.jpg",
        "hero-charcoal.jpg",
        "product-ivory.jpg",
        "product-pink.jpg",
        "look-ivory-upper.jpg",
        "size-chart.jpg",
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
      id: 2709996,
      draftId: draft.id,
      productSlug: "womens-hooded-knit-cardigan",
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
