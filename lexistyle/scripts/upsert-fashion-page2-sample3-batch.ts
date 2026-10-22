import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import { catalogIndex, contentDocuments, productImages, products } from "../src/db/schema";
import { getSample3BatchOverride } from "../src/lib/pdp/sample3-batch-overrides";
import { computeSellPrice } from "../src/lib/hq/types";

const targets = [
  { catalogId: 5796, slug: "new-european-and-american-cross-border-women-s-c-2092068716823863297", castFolder: "0382_EA_KR_F_A1" },
  { catalogId: 5124, slug: "football-digital-print-hoodie-with-long-sleeves--2608250221231626400", castFolder: "0397_WE_AU_F_A1" },
  { catalogId: 5255, slug: "amazon-european-and-american-cross-border-new-wo-2092098219080925186", castFolder: "0398_WE_CA_F_A1" },
  { catalogId: 5023, slug: "sexy-hollowed-out-lace-panel-beach-cover-up-with-2608250521511635100", castFolder: "0445_WE_IT_F_A1" },
  { catalogId: 4432, slug: "sexy-lace-corset-top-hot-girl-sweet-cool-style-o-2092524044495527937", castFolder: "0413_WE_GB_F_A1" },
  { catalogId: 5720, slug: "european-and-american-cross-border-amazon-2026-n-2092086504312438785", castFolder: "0414_BL_ZA_F_A1" },
  { catalogId: 5105, slug: "new-womens-hollow-out-embroidered-vest-camisole-2608250245161616200", castFolder: "0444_ME_SA_F_A1" },
  { catalogId: 5039, slug: "versatile-chic-pants-that-elongate-the-legs-2608250411231634400", castFolder: "0381_BL_FR_F_A1" },
  { catalogId: 5104, slug: "women-s-casual-suit-2608250245411607800", castFolder: "0391_WE_US_F_A1" },
  { catalogId: 3726, slug: "fashionable-retro-polka-dot-print-low-rise-skirt-2608260553261630400", castFolder: "0389_WE_ES_F_A1" },
  { catalogId: 3652, slug: "flared-leg-washed-short-sleeve-denim-jumpsuit-2608260737191627700", castFolder: "0396_WE_DE_F_A1" },
  { catalogId: 3663, slug: "casual-vacation-long-sleeved-shirt-dress-with-tw-2608260724161602900", castFolder: "0383_WE_GB_F_A1" },
  { catalogId: 4785, slug: "loose-fit-design-focused-sweater-top-2608251142151607400", castFolder: "0385_SE_TH_F_A1" },
  { catalogId: 3668, slug: "autumn-european-and-american-style-backless-slip-2608260717171611900", castFolder: "0384_EA_KR_F_A1" },
  { catalogId: 5756, slug: "spot-independent-station-aliexpress-23-spring-fa-2092133991706427394", castFolder: "0386_MX_US_F_A1" },
  { catalogId: 4624, slug: "sexy-lace-corset-top-hot-girl-sweet-cool-style-o-2092518959719550977", castFolder: "0387_BL_KE_F_A1" },
  { catalogId: 5406, slug: "high-waisted-sweat-biker-shorts-for-women-soft-b-2092081682877005826", castFolder: "0390_WE_NL_F_A1" },
  { catalogId: 4467, slug: "pleated-tencel-wool-loose-wide-leg-pants-2092520807662784514", castFolder: "0392_LT_MX_F_A1" },
  { catalogId: 3736, slug: "short-sleeved-printed-embroidered-pattern-2608260537471635800", castFolder: "0393_MX_FR_F_A1" },
  { catalogId: 6112, slug: "beach-thin-outerwear-double-sided-bikini-sun-pro-2608281545111638300", castFolder: "0394_SE_PH_F_A1" },
  { catalogId: 6135, slug: "loose-fit-flared-midi-skirt-for-women-2609010803061602400", castFolder: "0395_WE_IT_F_A1" },
  { catalogId: 6133, slug: "womens-loose-fitting-breathable-straight-leg-lou-2609010807401605500", castFolder: "0400_SE_PH_F_A1" },
  { catalogId: 6132, slug: "seamless-strap-long-sheath-dress-for-women-2609010811551632300", castFolder: "0401_WE_US_F_A1" },
  { catalogId: 6131, slug: "versatile-high-waisted-pleated-casual-shorts-for-2609010819141629100", castFolder: "0402_BL_NG_F_A1" },
  { catalogId: 6130, slug: "sweet-pure-lace-bow-sweater-coat-for-women-2609010820201615500", castFolder: "0403_WE_GB_F_A1" },
  { catalogId: 5481, slug: "new-summer-cross-border-european-and-american-tr-2092144174729953281", castFolder: "0404_SE_VN_F_A1" },
  { catalogId: 5513, slug: "vacation-style-v-neck-loose-casual-long-sleeve-s-2092230800094019586", castFolder: "0405_EA_JP_F_A1" },
  { catalogId: 5650, slug: "casual-loose-fashion-ruffle-tie-v-neck-shirt-top-2092087164022071297", castFolder: "0406_WE_DE_F_A1" },
  { catalogId: 6061, slug: "slimming-high-quality-fashionable-and-youth-enha-2608241100501616600", castFolder: "0407_BL_CA_F_A1" },
  { catalogId: 6090, slug: "casual-stylish-loose-fitting-plush-pajama-pants--2608241019531604600", castFolder: "0408_LT_ES_F_A1" },
];

const castByFolder: Record<string, Record<string, unknown>> = {
  "0382_EA_KR_F_A1": { id: "0382", name: "김서윤 · Kim Seoyun", gender: "여성", nationality: "대한민국", interests: ["하이패션", "에디토리얼", "런웨이"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0397_WE_AU_F_A1": { id: "0397", name: "마틸다 윌슨 · Matilda Wilson", gender: "여성", nationality: "호주", interests: ["스튜디오 라이트", "미니멀 스타일", "필름"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0398_WE_CA_F_A1": { id: "0398", name: "샬럿 트렘블레이 · Charlotte Tremblay", gender: "여성", nationality: "캐나다", interests: ["스튜디오 라이트", "미니멀 스타일", "필름"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0445_WE_IT_F_A1": { id: "0445", name: "비토리아 콘티 · Vittoria Conti", gender: "여성", nationality: "이탈리아", interests: ["하이패션", "에디토리얼", "런웨이"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0413_WE_GB_F_A1": { id: "0413", name: "플로렌스 테일러 · Florence Taylor", gender: "여성", nationality: "영국", interests: ["포멀 룩", "시티 워킹", "갤러리"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0414_BL_ZA_F_A1": { id: "0414", name: "날레디 몰레페 · Naledi Molefe", gender: "여성", nationality: "남아프리카공화국", interests: ["아웃도어", "여행", "자연광"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0444_ME_SA_F_A1": { id: "0444", name: "라나 알카타니 · Lana Alqahtani", gender: "여성", nationality: "사우디아라비아", interests: ["스튜디오 라이트", "미니멀 스타일", "필름"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0381_BL_FR_F_A1": { id: "0381", name: "클라라 뒤부아 · Clara Dubois", gender: "여성", nationality: "프랑스", interests: ["스튜디오 라이트", "미니멀 스타일", "필름"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0391_WE_US_F_A1": { id: "0391", name: "마야 존슨 · Maya Johnson", gender: "여성", nationality: "미국", interests: ["하이패션", "에디토리얼", "런웨이"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0389_WE_ES_F_A1": { id: "0389", name: "루시아 가르시아 · Lucía García", gender: "여성", nationality: "스페인", interests: ["스튜디오 라이트", "미니멀 스타일", "필름"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0396_WE_DE_F_A1": { id: "0396", name: "레아 슈미트 · Lea Schmidt", gender: "여성", nationality: "독일", interests: ["아웃도어", "여행", "자연광"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0383_WE_GB_F_A1": { id: "0383", name: "올리비아 베넷 · Olivia Bennett", gender: "여성", nationality: "영국", interests: ["스트리트", "스니커즈", "시티 산책"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0385_SE_TH_F_A1": { id: "0385", name: "핌차녹 수완 · Pimchanok Suwan", gender: "여성", nationality: "태국", interests: ["뷰티 케어", "스킨 글로우", "매크로 디테일"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0384_EA_KR_F_A1": { id: "0384", name: "이하린 · Lee Harin", gender: "여성", nationality: "대한민국", interests: ["액티브웨어", "러닝", "헬시 루틴"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0386_MX_US_F_A1": { id: "0386", name: "에이버리 브룩스 · Avery Brooks", gender: "여성", nationality: "미국", interests: ["포멀 룩", "시티 워킹", "갤러리"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0387_BL_KE_F_A1": { id: "0387", name: "아마라 완지쿠 · Amara Wanjiku", gender: "여성", nationality: "케냐", interests: ["아웃도어", "여행", "자연광"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0390_WE_NL_F_A1": { id: "0390", name: "펨커 더브리스 · Femke de Vries", gender: "여성", nationality: "네덜란드", interests: ["스튜디오 라이트", "미니멀 스타일", "필름"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0392_LT_MX_F_A1": { id: "0392", name: "발렌티나 로메로 · Valentina Romero", gender: "여성", nationality: "멕시코", interests: ["스트리트", "스니커즈", "시티 산책"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0393_MX_FR_F_A1": { id: "0393", name: "아멜리 로랑 · Amélie Laurent", gender: "여성", nationality: "프랑스", interests: ["액티브웨어", "러닝", "헬시 루틴"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0394_SE_PH_F_A1": { id: "0394", name: "마리아 산토스 · Maria Santos", gender: "여성", nationality: "필리핀", interests: ["뷰티 케어", "스킨 글로우", "매크로 디테일"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0395_WE_IT_F_A1": { id: "0395", name: "줄리아 로시 · Giulia Rossi", gender: "여성", nationality: "이탈리아", interests: ["포멀 룩", "시티 워킹", "갤러리"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0400_SE_PH_F_A1": { id: "0400", name: "알테아 레예스 · Althea Reyes", gender: "여성", nationality: "필리핀", interests: ["하이패션", "에디토리얼", "런웨이"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0401_WE_US_F_A1": { id: "0401", name: "클로이 카터 · Chloe Carter", gender: "여성", nationality: "미국", interests: ["스트리트", "스니커즈", "시티 산책"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0402_BL_NG_F_A1": { id: "0402", name: "아다에제 오코로 · Adaeze Okoro", gender: "여성", nationality: "나이지리아", interests: ["액티브웨어", "러닝", "헬시 루틴"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0403_WE_GB_F_A1": { id: "0403", name: "아멜리아 클라크 · Amelia Clarke", gender: "여성", nationality: "영국", interests: ["뷰티 케어", "스킨 글로우", "매크로 디테일"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0404_SE_VN_F_A1": { id: "0404", name: "응우옌민안 · Nguyễn Minh Anh", gender: "여성", nationality: "베트남", interests: ["포멀 룩", "시티 워킹", "갤러리"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0405_EA_JP_F_A1": { id: "0405", name: "사토 아오이 · Sato Aoi", gender: "여성", nationality: "일본", interests: ["아웃도어", "여행", "자연광"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0406_WE_DE_F_A1": { id: "0406", name: "안나 베커 · Anna Becker", gender: "여성", nationality: "독일", interests: ["스튜디오 라이트", "미니멀 스타일", "필름"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0407_BL_CA_F_A1": { id: "0407", name: "에밀리 로이 · Émilie Roy", gender: "여성", nationality: "캐나다", interests: ["스튜디오 라이트", "미니멀 스타일", "필름"], agency: "AMBA", agencyFull: "AI Ambassador" },
  "0408_LT_ES_F_A1": { id: "0408", name: "마르티나 루이스 · Martina Ruiz", gender: "여성", nationality: "스페인", interests: ["스튜디오 라이트", "미니멀 스타일", "필름"], agency: "AMBA", agencyFull: "AI Ambassador" },
};

async function main() {
  const database = db();
  await database.execute(sql`SELECT setval(pg_get_serial_sequence('content_documents', 'id'), COALESCE((SELECT MAX(id) FROM content_documents), 1), true)`);
  await database.execute(sql`SELECT setval(pg_get_serial_sequence('product_images', 'id'), COALESCE((SELECT MAX(id) FROM product_images), 1), true)`);
  await database.execute(sql`SELECT setval(pg_get_serial_sequence('products', 'id'), COALESCE((SELECT MAX(id) FROM products), 1), true)`);
  const results: unknown[] = [];
  const usedDocumentIds = new Set<number>();

  for (const target of targets) {
    const override = getSample3BatchOverride(target.slug);
    if (!override) throw new Error(`SAMPLE3 override missing for ${target.slug}`);

    const [catalog] = await database.select().from(catalogIndex).where(eq(catalogIndex.id, target.catalogId)).limit(1);
    if (!catalog) throw new Error(`catalog ${target.catalogId} not found`);

    const [product] = await database.select({ id: products.id }).from(products).where(eq(products.slug, target.slug)).limit(1);
    // catalog.productId may still point at a legacy product whose slug belongs to
    // another SKU. The SAMPLE3 target slug is the storefront identity source.
    let productId = product?.id ?? null;
    if (productId == null) {
      const sellPrice = computeSellPrice(Number(catalog.minPrice ?? 0)).toFixed(2);
      const [createdProduct] = await database.insert(products).values({
        slug: target.slug,
        brandId: 1,
        categoryId: 30,
        name: override.structured.title,
        description: override.structured.subtitle,
        priceUsd: sellPrice,
        retailPriceUsd: sellPrice,
        stock: catalog.stock > 0 ? catalog.stock : 10,
        ratingAvg: "4.8",
        reviewCount: 0,
        isDummy: false,
      }).returning({ id: products.id });
      productId = createdProduct.id;
    }
    const cast = { ...castByFolder[target.castFolder], faceSeed: `/casts/amba/${target.castFolder}/face.webp`, castFolder: target.castFolder };
    const body = {
      engine: "sample3-built-in-imagegen",
      source: "sample3-fashion-page2",
      catalogId: target.catalogId,
      productId,
      rulesetId: "SAMPLE3",
      modelCast: cast,
      assetUrls: override.assetUrls,
      structured: override.structured,
      generation: { provider: "codex-built-in-imagegen", generatedCount: 1, derivedCrops: ["S2", "S3", "OG"] },
    };

    let documentId = catalog.documentId && !usedDocumentIds.has(catalog.documentId) ? catalog.documentId : null;
    const existing = documentId
      ? (await database.select({ id: contentDocuments.id, currentVersion: contentDocuments.currentVersion }).from(contentDocuments).where(eq(contentDocuments.id, documentId)).limit(1))[0]
      : null;
    if (existing) {
      await database.update(contentDocuments).set({ title: override.structured.title, locale: "ko", status: "review", body, renderedHtml: override.html, currentVersion: (existing.currentVersion ?? 1) + 1, updatedAt: new Date() }).where(eq(contentDocuments.id, existing.id));
    } else {
      const [created] = await database.insert(contentDocuments).values({ kind: "pdp", title: override.structured.title, locale: "ko", status: "review", body, renderedHtml: override.html, currentVersion: 1, createdBy: "sample3-fashion-page2" }).returning({ id: contentDocuments.id });
      documentId = created.id;
    }

    if (productId != null) {
      await database.delete(productImages).where(eq(productImages.productId, productId));
      for (const [sort, url] of override.assetUrls.entries()) await database.insert(productImages).values({ productId, url, sort, isDummy: false });
    }

    await database.update(catalogIndex).set({ documentId, productId, importState: "imported", sourceStatus: "active", updatedAt: new Date() }).where(eq(catalogIndex.id, target.catalogId));
    usedDocumentIds.add(documentId);
    results.push({ catalogId: target.catalogId, productId, documentId, title: override.structured.title, assets: override.assetUrls.length });
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
