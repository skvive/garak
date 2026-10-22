/**
 * 쿠팡 등록 — 남성 9존 스마트 온열 자켓 (CJFY3221007)
 * ・상세 HTML: public/pdp/cjfy3221007-heated-jacket/detail-fragment.html
 *   (pdp-site 절대 URL → Blob URL로 치환해 쿠팡이 직접 내려받게 한다)
 * ・옵션 24개 = 3컬러 × S~5XL, externalVendorSku(CJ vid) → 주문 시 CJ 발주 매핑
 * Usage: npx tsx scripts/publish-cjfy3221007-coupang.ts
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { coupangAdapter } from "../src/lib/channels/adapters/coupang";
import { listCoupangSellerProducts } from "../src/lib/channels/coupang/ops";
import { coupangRequest } from "../src/lib/channels/coupang/client";
import { computeSellPrice } from "../src/lib/hq/types";

const ROOT = path.resolve("public/pdp/cjfy3221007-heated-jacket");
const SITE_BASE = "https://pdp-site-five.vercel.app/mens-9-zone-heated-jacket/coupang/v1";
const TITLE = "LEXI 남성 9존 스마트 온열 자켓 방수 겨울 아우터";
const COST_USD = 35.99; // CJ variantSellPrice (전 사이즈 동일)
const STOCK = 10; // CJ 재고 미확인 — 기본 10

// CJ variant: [vid(SKU), 컬러, 사이즈] — 3컬러 × S~5XL
const source = [
  ["2106944924786159618", "블랙", "S"],
  ["2106944924786159619", "블랙", "M"],
  ["2106944924786159620", "블랙", "L"],
  ["2106944924786159621", "블랙", "XL"],
  ["2106944924786159622", "블랙", "2XL"],
  ["2106944924786159623", "블랙", "3XL"],
  ["2106944924786159624", "블랙", "4XL"],
  ["2106944924786159625", "블랙", "5XL"],
  ["2106944924786159626", "네이비블루", "S"],
  ["2106944924786159627", "네이비블루", "M"],
  ["2106944924786159628", "네이비블루", "L"],
  ["2106944924786159629", "네이비블루", "XL"],
  ["2106944924786159630", "네이비블루", "2XL"],
  ["2106944924786159631", "네이비블루", "3XL"],
  ["2106944924786159632", "네이비블루", "4XL"],
  ["2106944924786159633", "네이비블루", "5XL"],
  ["2106944924786159634", "아미그린", "S"],
  ["2106944924786159635", "아미그린", "M"],
  ["2106944924786159636", "아미그린", "L"],
  ["2106944924786159637", "아미그린", "XL"],
  ["2106944924786159638", "아미그린", "2XL"],
  ["2106944924786159639", "아미그린", "3XL"],
  ["2106944924786159640", "아미그린", "4XL"],
  ["2106944924786159641", "아미그린", "5XL"],
] as const;

const DETAIL_FILES = [
  "hero-black.jpg",
  "hero-army-green.jpg",
  "look-walk.jpg",
  "product-black.jpg",
  "product-navy-blue.jpg",
  "product-army-green.jpg",
  "zone-full.jpg",
  "zone-a.jpg",
  "zone-b.jpg",
  "tech.jpg",
  "dual.jpg",
  "detail-hood.jpg",
  "detail-zipper.jpg",
  "detail-fabric.jpg",
];

async function main() {
  // 선택 서류(공유 페이지)는 Coupang이 직접 내려받을 수 없다. 공개 파일 URL이 준비되기 전까지 제외.
  delete process.env.COUPANG_AGENT_DOCUMENT_URL;

  const remote = JSON.parse(await readFile(path.join(ROOT, "remote-assets.json"), "utf8")) as Record<string, string>;

  // 상세 HTML: pdp-site 절대 URL → Blob URL (쿠팡이 직접 내려받는 공개 경로)
  let detail = await readFile(path.join(ROOT, "detail-fragment.html"), "utf8");
  for (const [file, url] of Object.entries(remote)) {
    detail = detail.split(`${SITE_BASE}/${file}`).join(url);
  }
  const leftover = detail.match(/pdp-site-five[^"']*/);
  if (leftover) throw new Error(`상세 HTML에 치환되지 않은 URL이 남아 있습니다: ${leftover[0]}`);

  const existing = await listCoupangSellerProducts();
  const duplicate = existing.find((item) => item.name === TITLE || /CJFY3221007/.test(item.name));
  if (duplicate) throw new Error(`duplicate blocked: ${duplicate.sellerProductId} ${duplicate.name}`);

  const sellPriceUsd = computeSellPrice(COST_USD);
  const now = new Date().toISOString();
  const options = source.map(([sku, color, size]) => ({
    name: `${color} / ${size}`,
    sku,
    priceUsd: sellPriceUsd,
    stock: STOCK,
    // 쿠팡 구매옵션(색상 × 사이즈) — 조합 24개 모두 고유
    attributes: { color, size },
  }));

  const draft = {
    id: 3221007,
    supplierProductId: 3221007,
    version: 1,
    title: TITLE,
    subtitle: "9존 발열 · 3단 온도 · 20,000mAh 보조배터리 포함",
    descriptionHtml: detail,
    renderedHtml: detail,
    seoKeywords: ["온열자켓", "발열자켓", "스마트자켓", "히트자켓", "겨울아우터", "남성자켓"],
    designDoc: { blocks: [] },
    assets: [
      { kind: "thumb" as const, url: remote["coupang-main.jpg"]!, source: "edited" as const },
      { kind: "hero" as const, url: remote["hero-navy-blue.jpg"]!, source: "ai" as const },
      ...DETAIL_FILES.map((name) => ({ kind: "detail" as const, url: remote[name]!, source: "edited" as const })),
    ],
    aiModel: "CJ product imagery",
    status: "approved" as const,
    createdAt: now,
    options,
  };

  const result = await coupangAdapter.publish({
    channel: { id: 2, code: "coupang", kind: "coupang", name: "쿠팡", config: { tradeModel: "purchase-agency", currency: "KRW" } },
    listing: {
      id: 3221007,
      draftId: draft.id,
      productSlug: "mens-9-zone-heated-jacket",
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

  const detailRes = (await coupangRequest(
    "GET",
    `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${result.externalRef}`,
    "",
  )) as Record<string, any>;
  const receipt = {
    ...result,
    title: TITLE,
    productSku: "CJFY3221007",
    variants: options.length,
    sellPriceUsd,
    status: detailRes?.status ?? null,
    displayCategoryCode: detailRes?.displayCategoryCode ?? null,
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
