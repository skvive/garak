// scripts/regen-women-pdps.ts — 여성의류 SAMPLE3 PDP 재생성 (AMBA 캐스트 히어로 + GPT 이미지 + OpenRouter 텍스트)
// 사용: npx tsx scripts/regen-women-pdps.ts --ids=5184 --sandbox
//      npx tsx scripts/regen-women-pdps.ts --ids=3630,3650,... (전체)
import { config } from "dotenv";
config({ path: ".env.local" });
config();

// OpenRouter / GPT 강제 지정
process.env.OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL?.trim() || "https://openrouter.ai/api/v1";
process.env.DEEPSEEK_ENDPOINT = process.env.DEEPSEEK_ENDPOINT?.trim() || "https://openrouter.ai/api/v1/chat/completions";
process.env.DEEPSEEK_PDP_MODEL = process.env.DEEPSEEK_PDP_MODEL?.trim() || "deepseek/deepseek-chat";
process.env.IMAGE_PROVIDER = process.env.IMAGE_PROVIDER?.trim() || "openai";

import pg from "pg";
import { getCatalogById } from "../src/lib/catalog/index-store";
import { generatePdpForCatalog } from "../src/lib/pdp/generate";
import { sample3ConceptSpec } from "../src/lib/hq/seeds/sample3-style";
import { listAmbaCasts } from "../src/lib/pdp/amba-casts";
import { openrouterImageProvider } from "../src/lib/images/providers/openrouter-image";
import { optimizeAndStore } from "../src/lib/catalog/assets";

const NEON = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL_NEON || "";
const BASE_URL = process.env.AMBA_BASE_URL || "https://rpcow.com";
const SANDBOX = process.argv.includes("--sandbox");
const TEXT_ONLY = process.argv.includes("--text-only");
const idsRaw = process.argv.find((a) => a.startsWith("--ids="))?.split("=")[1] ?? "";
const CATALOG_IDS = idsRaw.split(",").filter(Boolean).map((x) => parseInt(x, 10));
if (!CATALOG_IDS.length) {
  console.error("--ids= 필요 (catalog_index.id)");
  process.exit(1);
}

function styleForCat(cat: string): string | undefined {
  const c = (cat || "").toLowerCase();
  if (c.includes("dress") || c.includes(" skirt") || c.includes("skirt")) return "HIG";
  if (c.includes("blouse") || c.includes("shirt") || c.includes("top")) return "STU";
  if (c.includes("suit") || c.includes("formal")) return "FML";
  if (c.includes("pant") || c.includes("sweat") || c.includes("street")) return "STR";
  if (c.includes("outer") || c.includes("jacket") || c.includes("coat")) return "HIG";
  if (c.includes("bikini") || c.includes("swim") || c.includes("active")) return "SPO";
  return undefined;
}

async function backfillProductId(client: any, externalId: string): Promise<number | null> {
  const r = await client.query(
    `select p.id from products p where p.deleted_at is null and p.is_dummy=false and p.slug like $1 limit 1`,
    [`%${externalId}`],
  );
  return r.rows.length ? Number(r.rows[0].id) : null;
}

async function processOne(client: any, catalogId: number, idx: number, total: number) {
  const row = await getCatalogById(catalogId);
  if (!row) {
    console.log(`[${idx}/${total}] ci${catalogId} ✗ catalog not found`);
    return;
  }
  const ext = row.externalId || String(row.id);
  const catPath = (row.categoryPath ?? []).join(" > ") || "fashion";
  const prodId = row.productId || (await backfillProductId(client, ext));

  // 1) AMBA 캐스트 선택 (여성 · 스타일 매핑 · 해시 다양화)
  const casts = listAmbaCasts().filter((c) => c.source?.sex === "F");
  const style = styleForCat(row.categoryPath?.[0] || "") ?? "STU";
  let pool = casts.filter((c) => c.source?.style === style);
  if (!pool.length) pool = casts; // 폴백: 전체 여성
  let h = 0;
  for (let i = 0; i < ext.length; i++) h = (h * 31 + ext.charCodeAt(i)) & 0x7fffffff;
  const cast = pool[h % pool.length];
  if (!cast) {
    console.log(`[${idx}/${total}] ci${catalogId} ✗ no cast`);
    return;
  }
  const faceUrl = `${BASE_URL}${cast.publicPath}`;

  console.log(`\n[${idx}/${total}] ci${catalogId} ${row.title?.slice(0, 50)}`);
  console.log(`   cat=${catPath.slice(0, 40)} cast=${cast.name} (${cast.source?.style}) face=${faceUrl}`);

  let heroUrl: string | undefined;
  let detailUrl: string | undefined;
  let desireUrl: string | undefined;
  if (!TEXT_ONLY) {
    try {
      const heroPrompt = "Young Asian female fashion editorial model wearing: " + row.title + ", upper body, cream paper studio, soft morning light, K-fashion lookbook, LEXI editorial, 4:5 portrait, no text, no logo.";
      const hero = await openrouterImageProvider.textToImage(heroPrompt, { size: 'portrait', seed: h });
      const heroAssets = await optimizeAndStore({ catalogId: row.id, supplierCode: row.supplierCode || "cjdropshipping", externalId: ext, sourceUrl: hero.url, variants: ["pdp"] });
      heroUrl = heroAssets.find((a) => a.variant === "pdp")?.url;
      if (row.primaryThumbUrl) {
        const det = await optimizeAndStore({ catalogId: row.id, supplierCode: row.supplierCode || "cjdropshipping", externalId: ext, sourceUrl: row.primaryThumbUrl, variants: ["pdp"] });
        detailUrl = det.find((a) => a.variant === "pdp")?.url;
      }
      if (heroUrl) {
        const desirePrompt = "Same young woman wearing same garment as hero," + " warm cafe plaza, golden light, LEXI campaign, same face same outfit, 4:5 portrait, no text, no logo.";
        const desire = await openrouterImageProvider.textToImage(desirePrompt, { size: 'portrait', seed: h });
        const des = await optimizeAndStore({ catalogId: row.id, supplierCode: row.supplierCode || "cjdropshipping", externalId: ext, sourceUrl: desire.url, variants: ["pdp"] });
        desireUrl = des.find((a) => a.variant === "pdp")?.url;
      }
    } catch (e) {
      console.log(`   image gen fail: ${e instanceof Error ? e.message : e}`);
    }
  }

  const extra = [heroUrl, detailUrl, desireUrl].filter(Boolean) as string[];
  if (!extra.length) {
    console.log(`   ✗ 이미지 0건 — 스킵`);
    return;
  }

  try {
    const concept = sample3ConceptSpec({
      rulesetId: "SAMPLE3",
      title: row.title ?? "LEXI Fashion",
      formHint: `${row.categoryPath?.[0] ?? "Fashion"} — ${row.title}`,
      voiceTag: `SAMPLE3 · LEXI Curated · ${cast.name} model`,
      seedCatalogId: row.id,
    });
    const res = await generatePdpForCatalog(catalogId, {
      locale: "ko",
      conceptSpec: concept,
      extraAssetUrls: extra,
    });
    // product_id 백필 + modelCast 기록
    if (prodId) {
      await client.query(`update catalog_index set product_id=$1 where id=$2 and product_id is null`, [prodId, catalogId]);
    }
    console.log(`   ✓ 문서=${res.documentId} engine=${res.engine} assets=${extra.length} (hero/detail/desire)`);
  } catch (e) {
    console.log(`   ✗ PDP 생성 실패: ${e instanceof Error ? e.message : e}`);
  }
}

async function main() {
  if (!NEON) {
    console.error("NEON_DATABASE_URL required");
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: NEON, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log(`대상: ${CATALOG_IDS.length}개${SANDBOX ? " (샌드박스)" : ""} | 텍스트: OpenRouter(${process.env.DEEPSEEK_PDP_MODEL}) | 이미지: GPT-Image(${process.env.IMAGE_PROVIDER})`);
  const sandboxIds = SANDBOX ? CATALOG_IDS.slice(0, 1) : CATALOG_IDS;
  for (const [i, id] of sandboxIds.entries()) {
    await processOne(client, id, i + 1, sandboxIds.length);
  }
  await client.end();
  console.log(`\n완료: ${sandboxIds.length}건`);
}

main().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});