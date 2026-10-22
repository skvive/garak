import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { coupangAdapter } from "../src/lib/channels/adapters/coupang";
import { listCoupangSellerProducts } from "../src/lib/channels/coupang/ops";
import { coupangRequest } from "../src/lib/channels/coupang/client";
import { computeSellPrice } from "../src/lib/hq/types";

const ROOT = path.resolve("public/pdp/cjls3061165-pink-tweed");
const TITLE = "LEXI 여성 핑크 트위드 재킷 드레스 셋업";

// CJ variant: [vid(SKU), 옵션명, 부위, 사이즈, 실재고, 원가USD]
const TOP_COST = 39.25;
const DRESS_COST = 27.71;
const source = [
  ["2608140804371632700", "Top / S", "Top", "S", 9568, TOP_COST],
  ["2608140804371632701", "Top / M", "Top", "M", 7144, TOP_COST],
  ["2608140804371632702", "Top / L", "Top", "L", 6085, TOP_COST],
  ["2608140804371632703", "Top / XL", "Top", "XL", 5284, TOP_COST],
  ["2608140804371632704", "Top / XXL", "Top", "XXL", 9772, TOP_COST],
  ["2608140804371632705", "Dress / S", "Dress", "S", 7050, DRESS_COST],
  ["2608140804371632706", "Dress / M", "Dress", "M", 5151, DRESS_COST],
  ["2608140804371632707", "Dress / L", "Dress", "L", 7310, DRESS_COST],
  ["2608140804371632708", "Dress / XL", "Dress", "XL", 8390, DRESS_COST],
  ["2608140804371632709", "Dress / XXL", "Dress", "XXL", 8941, DRESS_COST],
] as const;

function html(u: Record<string, string>) {
  const image = (name: string, alt: string) => `<img src="${u[name]}" alt="${alt}" style="display:block;width:100%;max-width:780px;margin:0 auto" />`;
  return `<div style="width:100%;max-width:780px;margin:0 auto;font-family:Arial,'Noto Sans KR',sans-serif;color:#181816;text-align:center">
${image("hero.jpg", "핑크 트위드 자켓 스커트 투피스 세트 모델 착용")}
<div style="padding:48px 28px;background:#fbf7f4"><p style="font-size:13px;color:#c98a94">TWEED SET EDIT</p><h1 style="font-size:38px;line-height:1.35">부드러운 핑크 트위드로<br/>완성한 셋업</h1><p style="font-size:18px;line-height:1.8;color:#555">라운드 넥 재킷 · 골드 버튼 · 슬리브리스 드레스<br/>Top 또는 Dress 단품과 사이즈를 선택해 주문하세요.</p></div>
${image("hero-detail.jpg", "트위드 조직과 디테일")}
<div style="padding:44px 28px;background:#181816;color:white"><h2 style="font-size:30px">실제 상품 구성</h2><p style="font-size:15px;line-height:1.8;color:#ccc">Top(재킷 단품) 또는 Dress(드레스 단품)를 옵션에서 선택할 수 있습니다.<br/>세트 일괄 판매가 아니므로 옵션 선택 전 실제 상품 이미지를 확인하세요.</p></div>
${image("jacket.jpg", "핑크 트위드 Top 재킷 단품 실제 상품")}${image("dress.jpg", "핑크 트위드 Dress 드레스 단품 실제 상품")}
${image("trim-detail.jpg", "소매 트림 디테일")}${image("texture-detail.jpg", "트위드 원단 조직")}
${image("size-chart.jpg", "사이즈 가이드")}
<p style="font-size:14px;line-height:1.8;color:#666;padding:8px 24px 0">측정 방법에 따라 2–3cm 차이가 있을 수 있습니다.<br/>평소 착용 의류의 실측과 비교해 선택해 주세요.</p>
<div style="margin:24px 28px;padding:22px;background:#fff;border:2px solid #181816;border-radius:12px;text-align:left">
<h2 style="margin:0 0 14px;font-size:24px;line-height:1.4">배송 · 교환 · 반품 안내</h2>
<p style="margin:0 0 8px;font-size:15px;line-height:1.8"><strong>배송방법</strong> LEXI 소싱 해외배송</p>
<p style="margin:0 0 8px;font-size:15px;line-height:1.8"><strong>배송비</strong> 무료배송</p>
<p style="margin:0 0 8px;font-size:15px;line-height:1.8"><strong>도서산간</strong> 추가 배송비 없음</p>
<p style="margin:0 0 8px;font-size:15px;line-height:1.8"><strong>배송기간</strong> 결제 후 영업일 기준 7~14일 도착 예정</p>
<p style="margin:0 0 8px;font-size:15px;line-height:1.8"><strong>통관</strong> 주문 처리 과정에서 개인통관고유부호가 필요할 수 있습니다.</p>
<p style="margin:14px 0 8px;font-size:16px;line-height:1.8;font-weight:700">필독 · 해외배송 왕복 반품비 48,000원</p>
<p style="margin:0 0 8px;font-size:15px;line-height:1.8">단순 변심 반품 시 해외택배 왕복비용 48,000원이 공제됩니다. 제품 하자 확인 시 비용의 절반을 판매자가 부담하여 24,000원이 공제됩니다.</p>
<p style="margin:0;font-size:15px;line-height:1.8;color:#666">상품 수령 후 7일 이내 접수해 주세요. 택·라벨 훼손, 세탁·착용 흔적, 오염·향취, 구성품 누락 또는 고객 책임으로 상품 가치가 훼손된 경우 교환·반품이 제한될 수 있습니다. 관계 법령과 쿠팡 정책이 우선 적용됩니다.</p>
</div>
<div style="padding:48px 28px;background:#20201e;color:#fff;margin-top:32px"><b>LEXI IS RPCOW.</b><br/><span style="color:#bbb">Radiant Presence, Captivating Outfit for your Wardrobe.</span></div></div>`;
}

async function main() {
  // 선택 서류(공유 페이지)는 Coupang이 직접 내려받을 수 없다. 공개 파일 URL이 준비되기 전까지 제외.
  delete process.env.COUPANG_AGENT_DOCUMENT_URL;
  const remote = JSON.parse(await readFile(path.join(ROOT, "remote-assets.json"), "utf8")) as Record<string, string>;
  const existing = await listCoupangSellerProducts();
  const duplicate = existing.find((item) => item.name === TITLE || /CJLS3061165/.test(item.name));
  if (duplicate) throw new Error(`duplicate blocked: ${duplicate.sellerProductId} ${duplicate.name}`);
  const topPriceUsd = computeSellPrice(TOP_COST);
  const dressPriceUsd = computeSellPrice(DRESS_COST);
  const sellPriceUsd = topPriceUsd;
  const now = new Date().toISOString();
  const options = source.map(([sku, name, part, size, stock]) => ({
    name, sku,
    priceUsd: part === "Top" ? topPriceUsd : dressPriceUsd,
    stock,
    // 쿠팡은 노출 구매옵션(색상×사이즈) 조합 중복을 거부한다. 자켓/스커트를
    // 색상 축의 값으로 분리해 "핑크 자켓 × S..XXL / 핑크 스커트 × S..XXL" 2단 옵션으로 등록한다.
    attributes: { color: part, size },
  }));
  const draft = {
    id: 3061165, supplierProductId: 3061165, version: 1, title: TITLE,
    subtitle: "핑크 트위드 자켓과 숏 스커트, 봄 스타일링",
    descriptionHtml: html(remote), renderedHtml: html(remote),
    seoKeywords: ["트위드자켓", "트위드세트", "핑크자켓", "숏스커트", "투피스세트", "여성트위드"],
    designDoc: { blocks: [] },
    assets: [
      { kind: "thumb" as const, url: remote["coupang-main.jpg"]!, source: "edited" as const },
      { kind: "hero" as const, url: remote["hero.jpg"]!, source: "ai" as const },
      ...["hero-detail.jpg", "jacket.jpg", "dress.jpg", "trim-detail.jpg", "texture-detail.jpg", "size-chart.jpg"].map((name) => ({ kind: "detail" as const, url: remote[name]!, source: "edited" as const })),
    ],
    aiModel: "OpenAI image generation", status: "approved" as const, createdAt: now, options,
  };
  const result = await coupangAdapter.publish({
    channel: { id: 2, code: "coupang", kind: "coupang", name: "쿠팡", config: { tradeModel: "purchase-agency", currency: "KRW" } },
    listing: { id: 3061165, draftId: draft.id, productSlug: "cjls3061165-pink-tweed-set", marginPolicy: { type: "rate", value: 0.3, minMarginUsd: 0 }, supplierCostUsd: TOP_COST, sellPriceUsd, retailPriceUsd: sellPriceUsd * 1.15, status: "ready", createdAt: now },
    draft,
    options,
  });
  const detail = (await coupangRequest(
    "GET",
    `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${result.externalRef}`,
    "",
  )) as Record<string, any>;
  const receipt = {
    ...result,
    title: TITLE,
    productSku: "CJLS3061165",
    variants: options.length,
    topPriceUsd,
    dressPriceUsd,
    status: detail?.status ?? null,
    displayCategoryCode: detail?.displayCategoryCode ?? null,
    createdAt: now,
  };
  await writeFile(path.join(ROOT, "coupang-publish-receipt.json"), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
  process.exit(0);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
