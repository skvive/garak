/** CommerceShorts 순수 로직 검증: npx tsx scripts/test-shorts.ts */
import assert from "node:assert/strict";
import { buildShortScripts, normalizeShortScript, verifyShortScript, type ShortProduct, type ShortScript } from "../src/lib/shorts/script";
import { assertPublicUrl, parseProductHtml, sanitizeProduct } from "../src/lib/shorts/extract";
import { allowedStrategy, creditRevenueUsd, withinMargin } from "../src/lib/shorts/pricing";

const product: ShortProduct = {
  sourceUrl: "https://smartstore.naver.com/x/products/1",
  title: "[당일출고] 모공 딥클렌징 폼 150ml (2개입)",
  brand: "LEXI Lab",
  priceAmount: 12900,
  originalPrice: 19900,
  currency: "KRW",
  imageUrls: ["https://img.example.com/1.jpg", "https://img.example.com/2.jpg"],
  features: ["피지 케어에 집중한 약산성 포뮬러", "쫀쫀한 미세 거품"],
  reviews: ["세안 후 당김이 없어요"],
};

// 1) 템플릿 3종 모두 유효, 15초, 자막 한글 ≤15자, 이미지 인덱스 범위 내
const scripts = buildShortScripts(product);
assert.equal(scripts.length, 3);
for (const s of scripts) {
  assert.ok(verifyShortScript(s, product.imageUrls.length), `${s.template} invalid`);
  assert.equal(s.scenes.reduce((a, x) => a + x.duration, 0), 15);
  assert.ok(s.hookText.length > 0);
}
assert.ok(scripts.find((s) => s.template === "discount_sale")!.scenes.some((x) => x.overlayText.includes("35%")), "할인율 노출");
assert.ok(scripts.find((s) => s.template === "brand_emotion")!.scenes[0].visual === "wan_i2v");

// 2) 특징·가격·후기 없는 최소 상품도 유효
const bare = buildShortScripts({ ...product, priceAmount: null, originalPrice: null, features: [], reviews: [], imageUrls: ["https://a.b/c.jpg"] });
bare.forEach((s) => assert.ok(verifyShortScript(s, 1)));

// 3) 악의적/깨진 클라이언트 대본 → normalize 후 유효
const broken = { template: "x", hookText: "hello", scenes: [{ duration: 99, overlayText: "english only text that is long", imageIndex: 9 }] } as unknown as ShortScript;
assert.equal(verifyShortScript(broken, 2), false);
const fixed = normalizeShortScript(broken, 2);
assert.ok(verifyShortScript(fixed, 2));

// 4) HTML 파서: JSON-LD 우선, og 폴백, 상대경로 이미지 절대화
const html = `<html><head>
<meta property="og:title" content="OG 제목 : 네이버 스마트스토어">
<meta property="og:image" content="//cdn.shop.kr/og.jpg">
<meta property="og:description" content="촉촉한 보습. 끈적임 없는 마무리!">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Product","name":"수분 크림 50ml","brand":{"name":"아쿠아"},
"image":["/img/a.jpg","https://cdn.shop.kr/b.jpg"],"offers":{"price":"24000","priceCurrency":"KRW"},
"review":[{"reviewBody":"흡수가 빨라요"}]}]}</script></head></html>`;
const p = parseProductHtml(html, "https://shop.example.kr/p/1");
assert.equal(p.title, "수분 크림 50ml");
assert.equal(p.brand, "아쿠아");
assert.equal(p.priceAmount, 24000);
assert.equal(p.currency, "KRW");
assert.deepEqual(p.imageUrls.slice(0, 3), ["https://shop.example.kr/img/a.jpg", "https://cdn.shop.kr/b.jpg", "https://cdn.shop.kr/og.jpg"]);
assert.deepEqual(p.reviews, ["흡수가 빨라요"]);
assert.ok(p.features.includes("촉촉한 보습"));

const ogOnly = parseProductHtml(`<meta property="og:title" content="티셔츠 | 쿠팡"><meta property="og:image" content="http://x.com/t.jpg">`, "https://www.coupang.com/vp/1");
assert.equal(ogOnly.title, "티셔츠");
assert.equal(ogOnly.imageUrls[0], "https://x.com/t.jpg");

// 5) SSRF 차단
for (const bad of ["http://localhost:3000", "http://127.0.0.1/a", "http://10.0.0.1", "http://192.168.0.2", "http://169.254.169.254/latest", "file:///etc/passwd", "http://100.98.206.52:5432"]) {
  assert.throws(() => assertPublicUrl(bad), `${bad} 허용됨`);
}
assert.ok(assertPublicUrl("https://smartstore.naver.com/a"));

// 6) 수동 입력 정리: https 이미지만, 제목 필수
assert.throws(() => sanitizeProduct({ title: "", imageUrls: ["https://a.b/c.jpg"] }));
assert.throws(() => sanitizeProduct({ title: "a", imageUrls: ["http://a.b/c.jpg", "javascript:alert(1)"] }));
assert.equal(sanitizeProduct({ title: "a", priceAmount: "12,900" as unknown as number, imageUrls: ["https://a.b/c.jpg"] }).priceAmount, 12900);

// 7) 마진 65%: 무료는 Remotion만, 단가가 원가 35%를 넘기면 Wan 금지
assert.equal(creditRevenueUsd("free"), 0);
assert.equal(allowedStrategy("free", true), "remotion");
assert.equal(withinMargin("remotion", "free"), true);
assert.equal(withinMargin("wan_i2v", "free"), false);
assert.equal(allowedStrategy("starter", true), "wan_i2v"); // 29/15=1.93, 상한 0.68 > 0.55
assert.equal(allowedStrategy("agency", true), "remotion"); // 199/200=1.00, 상한 0.35 < 0.55
assert.equal(allowedStrategy("pro", false), "remotion");

console.log("shorts tests: OK");
for (const s of scripts) console.log(`- ${s.label}: ${s.hookText} | ${s.scenes.map((x) => x.overlayText).join(" / ")}`);
