#!/usr/bin/env node
/**
 * 10개 패션 PDP 생성 스크립트 (DeepSeek V4 Flash + OpenRouter)
 *
 * 사용: node scripts/gen-10-fashion-pdp.mjs
 * 선행조건: OpenRouter 프록시 실행 (scripts/openrouter-proxy.mjs)
 * 결과: ~/.lexi-local/data/lexi-local.json 에 catalog + pdpDocs 저장
 *       → /best, /product/[slug] 에서 조회 가능
 */
import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import os from "os";

const DATA_DIR = path.join(os.homedir(), ".lexi-local", "data");
const STORE_PATH = path.join(DATA_DIR, "lexi-local.json");
const OR_API = "https://openrouter.ai/api/v1/chat/completions";
const OR_KEY = process.env.OPENROUTER_API_KEY || "";

// 10개 패션 상품 정의 (slug, name, brand, category, price, image)
const FASHION_10 = [
  { slug: "wc-floral-dress", name: "Floral Print Chiffon Midi Dress", brand: "SeoulLine", category: "women-clothing", price: 42.99, image: "https://images.unsplash.com/photo-1612336307429-8a898d10e223?auto=format&fit=crop&w=900&q=80" },
  { slug: "wc-silk-blouse", name: "Satin Button-Up Blouse", brand: "DAILYSEOUL", category: "women-clothing", price: 38.90, image: "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=900&q=80" },
  { slug: "wc-knit-sweater", name: "Chunky Knit Pullover Sweater", brand: "ATELIER 9", category: "women-clothing", price: 52.00, image: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=900&q=80" },
  { slug: "wc-wide-pants", name: "High-Waist Wide Leg Trousers", brand: "SeoulLine", category: "women-clothing", price: 35.50, image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=80" },
  { slug: "wc-trench-coat", name: "Classic Double-Breasted Trench Coat", brand: "DAILYSEOUL", category: "women-clothing", price: 128.00, image: "https://images.unsplash.com/photo-1544027993-37dbfe435794?auto=format&fit=crop&w=900&q=80" },
  { slug: "wc-wrap-dress", name: "Wrap Front Jersey Dress", brand: "SeoulLine", category: "women-clothing", price: 36.99, image: "https://images.unsplash.com/photo-1581044777550-4c0a0e1b7e7b?auto=format&fit=crop&w=900&q=80" },
  { slug: "wc-leather-pants", name: "Faux Leather Straight Leg Pants", brand: "ATELIER 9", category: "women-clothing", price: 62.00, image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=80" },
  { slug: "wc-corset-top", name: "Boned Corset Camisole Top", brand: "ATELIER 9", category: "women-clothing", price: 28.00, image: "https://images.unsplash.com/photo-1620799140408-edc6dcb6dd7e?auto=format&fit=crop&w=900&q=80" },
  { slug: "wc-vest", name: "Tailored Sleeveless Vest", brand: "DAILYSEOUL", category: "women-clothing", price: 32.00, image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=900&q=80" },
  { slug: "wc-denim-jacket", name: "Cropped Denim Jacket — Vintage Wash", brand: "ATELIER 9", category: "women-clothing", price: 55.00, image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=900&q=80" },
];

// PDP 시스템 프롬프트 (SAMPLE3 에디토리얼 스타일)
const PDP_SYSTEM = `You are a luxury e-commerce copywriter for LEXI, a curated K-fashion marketplace.
Generate a complete product detail page in SAMPLE3 editorial style.

Locale: ko (Korean)
Style: editorial-commerce — poetic but functional, warm yet premium. Use Korean natural language.
Block order: Hero Image → Product Title/Price → Description → USP (bullet points, 3 items) → FAQ (2 items) → CTA

Return ONLY valid JSON, no markdown fences. Schema:
{
  "title": "string (Korean, max 40 chars)",
  "subtitle": "string (Korean, 10-20 chars, poetic one-liner)",
  "descriptionHtml": "string (Korean HTML with <p>, <br>, <strong>, <em>. 2-3 paragraphs. 800-1200 chars.)",
  "usps": ["string (Korean, 25-50 chars each) * 3"],
  "faq": [{"q": "string (Korean, max 40 chars)", "a": "string (Korean, max 100 chars)"} * 2],
  "ctaLabel": "string (Korean CTA, 5-10 chars, e.g. 장바구니 담기)",
  "seoKeywords": ["string (Korean) * 5"],
  "galleryAssetIndexes": [0]
}`;

async function callDeepSeek(prompt) {
  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(OR_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OR_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://lexistyle.vercel.app",
          "X-Title": "LEXI PDP Generator",
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-v4-flash",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 4096,
        }),
        signal: AbortSignal.timeout(120_000),
      });
      const json = await res.json();
      if (res.status === 429) {
        const wait = (attempt + 1) * 5000;
        console.log(`  ⏳ Rate limit... ${wait / 1000}초 대기 후 재시도`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) throw new Error(`API ${res.status}: ${json?.error?.message || JSON.stringify(json).slice(0, 200)}`);
      const text = json.choices?.[0]?.message?.content;
      if (!text) throw new Error("Empty response");
      const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/m, "").trim();
      return JSON.parse(cleaned);
    } catch (e) {
      if (attempt === maxRetries - 1) throw e;
      const wait = (attempt + 1) * 5000;
      console.log(`  ⏳ 재시도 ${attempt + 1}/${maxRetries} (${e.message})... ${wait / 1000}초 대기`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

function buildPdpHtml(product, structured) {
  const img = product.image;
  const uspItems = structured.usps.map((u) => `<li>✓ ${u}</li>`).join("\n");
  const faqItems = structured.faq.map((f) => `<details><summary>${f.q}</summary><p>${f.a}</p></details>`).join("\n");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="keywords" content="${structured.seoKeywords.join(", ")}">
  <title>${structured.title} | LEXI</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Noto Sans KR','DM Sans',sans-serif;background:#faf9f7;color:#1a1a1a;line-height:1.7}
    .hero{width:100%;aspect-ratio:4/5;object-fit:cover;display:block;background:#ebe6dc}
    .container{max-width:640px;margin:0 auto;padding:24px 20px 64px}
    h1{font-size:24px;font-weight:500;letter-spacing:-0.3px;line-height:1.35;margin-bottom:4px}
    .subtitle{font-size:14px;color:#6e6e73;font-weight:400;margin-bottom:12px}
    .price-row{display:flex;align-items:baseline;gap:8px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #e4e4e0}
    .price-value{font-size:26px;font-weight:600;font-family:'DM Sans',sans-serif}
    .price-orig{font-size:14px;color:#6e6e73;text-decoration:line-through}
    .desc{font-size:14px;color:#333;line-height:1.8;margin-bottom:32px}
    .desc p{margin-bottom:12px}
    .section-title{font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6e6e73;margin-bottom:12px}
    .usps{list-style:none;margin-bottom:32px}
    .usps li{font-size:14px;padding:8px 0;border-bottom:1px solid #f0efeb;color:#444}
    .usps li:last-child{border:none}
    .faq{margin-bottom:32px}
    .faq details{padding:12px 0;border-bottom:1px solid #f0efeb;cursor:pointer}
    .faq summary{font-size:14px;font-weight:500;outline:none}
    .faq p{font-size:13px;color:#6e6e73;margin-top:6px;padding-left:4px}
    .cta-row{position:fixed;bottom:0;left:0;right:0;padding:12px 20px 20px;background:#faf9f7;border-top:1px solid #e4e4e0}
    .cta-btn{display:block;width:100%;background:#1a1a1a;color:#fff;text-align:center;padding:14px 0;font-size:15px;font-weight:500;border-radius:12px;border:none;cursor:pointer;font-family:'Noto Sans KR',sans-serif;transition:opacity 0.2s}
    .cta-btn:hover{opacity:0.85}
    @media(min-width:768px){.cta-row{position:static;padding:0;margin-top:12px}}
  </style>
</head>
<body>
  <img class="hero" src="${img}" alt="${structured.title}" loading="lazy" />
  <div class="container">
    <h1>${structured.title}</h1>
    <p class="subtitle">${structured.subtitle}</p>
    <div class="price-row">
      <span class="price-value">$${product.price.toFixed(1)}</span>
      <span class="price-orig">$${product.brand}</span>
    </div>
    <div class="desc">${structured.descriptionHtml}</div>
    <p class="section-title">Why We Love It</p>
    <ul class="usps">${uspItems}</ul>
    <p class="section-title">Q&A</p>
    <div class="faq">${faqItems}</div>
    <div class="cta-row">
      <button class="cta-btn">${structured.ctaLabel}</button>
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  if (!OR_KEY) {
    console.error("❌ OPENROUTER_API_KEY 환경변수 없음");
    process.exit(1);
  }

  // 로컬 스토어 읽기
  mkdirSync(DATA_DIR, { recursive: true });
  let store = {};
  if (existsSync(STORE_PATH)) {
    store = JSON.parse(readFileSync(STORE_PATH, "utf8"));
  }
  const existingPdpDocs = store.pdpDocs ?? [];
  const existingCatalog = store.catalog ?? [];
  let docSeq = store.pdpSeq ?? (existingPdpDocs.reduce((m, d) => Math.max(m, d.id || 0), 0) + 1);
  let catSeq = store.catalogSeq ?? (existingCatalog.reduce((m, c) => Math.max(m, c.id || 0), 0) + 1);

  console.log(`기존: catalog=${existingCatalog.length}건 pdpDocs=${existingPdpDocs.length}건`);

  for (const product of FASHION_10) {
    const existsInPdp = existingPdpDocs.find((d) => d.catalogId && existingCatalog.find((c) => c.id === d.catalogId && c.externalId === product.slug));
    if (existsInPdp) {
      console.log(`⏭️  건너뜀 (이미 있음): ${product.slug}`);
      continue;
    }

    // 1) Catalog item 생성
    const catId = catSeq++;
    const catItem = {
      id: catId,
      supplierCode: "storefront-pdp",
      externalId: product.slug,
      title: product.name,
      titleKo: null,
      categoryPath: [product.category, `${product.category}/dresses`],
      minPrice: product.price.toString(),
      maxPrice: product.price.toString(),
      currency: "USD",
      stock: 100,
      primaryThumbUrl: product.image,
      sellerName: product.brand,
      sourceUrl: null,
      searchableText: `${product.name} ${product.brand} 패션 여성의류`,
      contentHash: null,
      sourceStatus: "active",
      importState: "imported",
      productId: null,
      documentId: null,
      rawMeta: null,
      indexedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    existingCatalog.push(catItem);

    // 2) DeepSeek PDP 생성
    console.log(`\n📝 생성 중 (${10 - FASHION_10.indexOf(product)}/${10}): ${product.name}`);
    const structured = await callDeepSeek(`${PDP_SYSTEM}\n\nProduct: ${product.name}\nBrand: ${product.brand}\nCategory: ${product.category}\nPrice: $${product.price}\nImage: ${product.image}\nAsset URLs: ["${product.image}"]\n\nRespond with valid JSON only.`);

    const renderedHtml = buildPdpHtml(product, structured);
    const docId = docSeq++;

    const doc = {
      id: docId,
      title: structured.title,
      locale: "ko",
      status: "published",
      body: {
        rulesetId: "lexi-pdp-ruleset-v1",
        catalogId: catId,
        productId: null,
        engine: "deepseek",
        model: "deepseek/deepseek-v4-flash",
        shelfReady: true,
        source: "hq-studio",
        structured,
        assetUrls: [product.image],
      },
      renderedHtml,
      catalogId: catId,
      productId: null,
      currentVersion: 1,
      rulesetId: "lexi-pdp-ruleset-v1",
      engine: "deepseek",
      createdAt: new Date().toISOString(),
    };
    existingPdpDocs.push(doc);

    // catalog의 documentId 업데이트
    catItem.documentId = docId;

    console.log(`✅ 생성 완료: ${structured.title} (docId=${docId}, html=${renderedHtml.length}자)`);

    // 각 생성 직후 저장 (중간 실패 대비)
    store.catalog = existingCatalog;
    store.catalogSeq = catSeq;
    store.pdpDocs = existingPdpDocs;
    store.pdpSeq = docSeq;
    writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  }

  console.log(`\n=== 전체 완료 ===`);
  console.log(`catalog: ${existingCatalog.length}건`);
  console.log(`pdpDocs: ${existingPdpDocs.length}건`);
}

main().catch((e) => {
  console.error("❌ 실패:", e.message);
  process.exit(1);
});