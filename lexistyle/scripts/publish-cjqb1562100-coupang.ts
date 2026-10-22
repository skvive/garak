import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { coupangAdapter } from "../src/lib/channels/adapters/coupang";
import { listCoupangSellerProducts } from "../src/lib/channels/coupang/ops";
import { computeSellPrice } from "../src/lib/hq/types";

const ROOT = path.resolve("public/pdp/cjqb1562100-trench");
const TITLE = "LEXI 여성 루즈핏 미디 트렌치 코트 벨트세트";
const source = [
  ["1569204657128484864", "그레이 / S", "그레이", "S", 14858],
  ["1569204657132679168", "그레이 / M", "그레이", "M", 12108],
  ["1569204657132679169", "그레이 / L", "그레이", "L", 14402],
  ["1569204657136873472", "블랙 / S", "블랙", "S", 14252],
  ["1569204657136873473", "블랙 / M", "블랙", "M", 13815],
  ["1569204657136873474", "블랙 / L", "블랙", "L", 11101],
  ["1569204657136873475", "카키 / S", "카키", "S", 13911],
  ["1569204657141067776", "카키 / M", "카키", "M", 11426],
  ["1569204657141067777", "카키 / L", "카키", "L", 14628],
] as const;

function html(u: Record<string, string>) {
  const image = (name: string, alt: string) => `<img src="${u[name]}" alt="${alt}" style="display:block;width:100%;max-width:780px;margin:0 auto" />`;
  return `<div style="width:100%;max-width:780px;margin:0 auto;font-family:Arial,'Noto Sans KR',sans-serif;color:#181816;text-align:center">
${image("model-editorial.jpg", "여성 루즈핏 미디 트렌치 코트 모델 착용")}
<div style="padding:48px 28px;background:#faf9f6"><p style="font-size:13px;letter-spacing:3px">URBAN TRENCH EDIT</p><h1 style="font-size:38px;line-height:1.35">흐르듯 떨어지는<br/>루즈 미디 실루엣</h1><p style="font-size:18px;line-height:1.8;color:#555">와이드 라펠 · 조절 소매 탭 · 허리 벨트<br/>출근길부터 주말까지 한 벌로 정돈하세요.</p></div>
${image("detail.webp", "라펠과 소매 버클 디테일")}
<div style="padding:44px 28px;background:#181816;color:white"><h2 style="font-size:30px">실제 상품 3컬러</h2><p style="line-height:1.8;color:#ccc">옵션 선택 전 실제 상품 이미지를 확인하세요.</p></div>
${image("original-grey.jpg", "그레이 실제 상품")}${image("original-black.jpg", "블랙 실제 상품")}${image("original-khaki.jpg", "카키 실제 상품")}
${image("silhouette.webp", "미디 트렌치 코트 실루엣")}
<div style="padding:48px 22px;background:#faf9f6"><h2 style="font-size:30px">SIZE GUIDE · CM</h2><table style="width:100%;border-collapse:collapse;font-size:15px"><tr style="background:#222;color:#fff"><th style="padding:15px;border:1px solid #ccc">사이즈</th><th style="border:1px solid #ccc">총장</th><th style="border:1px solid #ccc">소매</th><th style="border:1px solid #ccc">소매단</th><th style="border:1px solid #ccc">가슴둘레</th></tr><tr><td style="padding:15px;border:1px solid #ccc">S</td><td style="border:1px solid #ccc">107</td><td style="border:1px solid #ccc">52.8</td><td style="border:1px solid #ccc">31.8</td><td style="border:1px solid #ccc">108.6</td></tr><tr><td style="padding:15px;border:1px solid #ccc">M</td><td style="border:1px solid #ccc">108</td><td style="border:1px solid #ccc">53.8</td><td style="border:1px solid #ccc">33.8</td><td style="border:1px solid #ccc">112.6</td></tr><tr><td style="padding:15px;border:1px solid #ccc">L</td><td style="border:1px solid #ccc">109</td><td style="border:1px solid #ccc">54.8</td><td style="border:1px solid #ccc">35.8</td><td style="border:1px solid #ccc">116.6</td></tr></table><p style="font-size:14px;line-height:1.8;color:#666">측정 방법에 따라 2–3cm 차이가 있을 수 있습니다.<br/>평소 착용 의류의 실측과 비교해 선택해 주세요.</p></div>
<div style="padding:48px 28px;background:#20201e;color:#fff"><b>LEXI IS RPCOW.</b><br/><span style="color:#bbb">Radiant Presence, Captivating Outfit for your Wardrobe.</span></div></div>`;
}

async function main() {
  // 기존 값이 공유 페이지 형태여서 Coupang이 직접 내려받을 수 없다. 이 선택 문서는
  // 실제 공개 파일 URL이 준비되기 전까지 상품 생성 요청에서 제외한다.
  delete process.env.COUPANG_AGENT_DOCUMENT_URL;
  const remote = JSON.parse(await readFile(path.join(ROOT, "remote-assets.json"), "utf8")) as Record<string, string>;
  const existing = await listCoupangSellerProducts();
  const duplicate = existing.find((item) => item.name === TITLE || /CJQB1562100/.test(item.name));
  const replacement = process.argv.includes("--replace-options");
  if (duplicate && !replacement) throw new Error(`duplicate blocked: ${duplicate.sellerProductId} ${duplicate.name}`);
  const sellPriceUsd = computeSellPrice(13.17);
  const now = new Date().toISOString();
  const options = source.map(([sku, name, color, size, stock]) => ({ name, sku, priceUsd: sellPriceUsd, stock, attributes: { color, size } }));
  const draft = {
    id: replacement ? 1562101 : 1562100, supplierProductId: 1562100, version: replacement ? 2 : 1, title: TITLE,
    subtitle: "와이드 라펠과 벨트로 완성하는 루즈 미디핏",
    descriptionHtml: html(remote), renderedHtml: html(remote),
    seoKeywords: ["여성트렌치코트", "롱트렌치코트", "루즈핏코트", "벨트코트", "봄가을아우터", "미디코트"],
    designDoc: { blocks: [] },
    assets: [
      { kind: "thumb" as const, url: remote["coupang-main.jpg"]!, source: "edited" as const },
      { kind: "hero" as const, url: remote["model-editorial.jpg"]!, source: "ai" as const },
      ...["detail.webp", "original-grey.jpg", "original-black.jpg", "original-khaki.jpg", "silhouette.webp"].map((name) => ({ kind: "detail" as const, url: remote[name]!, source: "edited" as const })),
    ],
    aiModel: "OpenAI image generation", status: "approved" as const, createdAt: now, options,
  };
  const result = await coupangAdapter.publish({
    channel: { id: 2, code: "coupang", kind: "coupang", name: "쿠팡", config: { tradeModel: "purchase-agency", currency: "KRW" } },
    listing: { id: replacement ? 1562101 : 1562100, draftId: draft.id, productSlug: "cjqb1562100-womens-loose-mid-trench", marginPolicy: { type: "rate", value: 0.3, minMarginUsd: 0 }, supplierCostUsd: 13.17, sellPriceUsd, retailPriceUsd: sellPriceUsd * 1.15, status: "ready", createdAt: now },
    draft,
    options,
  });
  const receipt = { ...result, title: TITLE, productSku: "CJQB1562100", variants: options.length, sellPriceUsd, createdAt: now };
  await writeFile(path.join(ROOT, replacement ? "coupang-replacement-receipt.json" : "coupang-publish-receipt.json"), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
  process.exit(0);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
