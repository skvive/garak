/**
 * 여성의류 판매량 top 20 상품페이지 작업 — Neon 조회 → 로컬 업서트 → 마케팅 3장 생성(OpenAI gpt-image-1) → 로컬 PDP 저장
 *
 * 사용법:
 *   npx tsx scripts/generate-women-top20-pdp.ts --dry          # Neon 조회 + 로컬 업서트만 (이미지 생성 없음)
 *   npx tsx scripts/generate-women-top20-pdp.ts --from=0 --to=2  # 0~2번 상품 이미지+PDP 생성 (배치 실행/재개)
 *   npx tsx scripts/generate-women-top20-pdp.ts --from=0 --to=19 --retry-failed  # fallback(CJ/picsum)만 재생성
 *
 * 지침: docs/lexi-pdp-marketing-prompt-rules.md — 3막(hero/macro/trust), no text, 허위 수치 금지.
 * 이미지 생성 실패는 PDP 생성을 막지 않음(썸네일 폴백).
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config(); // fallback .env (OPENAI_API_KEY 로드)
// 로컬 JSON 모드 강제: .env의 Neon DATABASE_URL이 로컬 모드를 오염시키지 않게 제거
delete process.env.DATABASE_URL;

import { writeFileSync, existsSync, readFileSync } from "fs";
import os from "os";
import path from "path";
import pg from "pg";
import {
  upsertCatalogMeta,
  patchCatalog,
} from "../src/lib/catalog/index-store";
import { generateProductImage } from "../src/lib/images/generate";
import { generatePdpText } from "../src/lib/pdp/text-generate";
import { renderPdp, toBlocks } from "../src/lib/pdp/generate";
import { PDP_RULESET_ID } from "../src/lib/pdp/ruleset";
import { localStore, scheduleLocalPersist } from "../src/lib/local-store";

const NEON = process.env.NEON_DATABASE_URL || "";
const DATA_DIR =
  process.env.LOCAL_DATA_DIR || path.join(os.homedir(), ".lexi-local", "data");
const STORE_PATH = path.join(DATA_DIR, "lexi-local.json");
const PROGRESS_PATH = path.join(DATA_DIR, "women-top20-progress.json");

/** select-best-products.ts 와 동일한 women-clothing CJ leaf 매핑 */
const WOMEN_LEAVES = [
  "Lady Dresses",
  "Blouses & Shirts",
  "Skirts",
  "Wide Leg Pants",
  "Rompers",
  "Women's Long-Sleeved Shirts",
  "Women's Short-Sleeved Shirts",
  "Women's Tube Tops",
  "Leggings",
  "Woman Hoodies & Sweatshirts",
  "Sweaters",
];

type NeonRow = {
  id: number;
  supplier_code: string;
  external_id: string;
  title: string;
  category_path: string[] | null;
  min_price: string | null;
  max_price: string | null;
  currency: string;
  stock: number;
  primary_thumb_url: string | null;
  seller_name: string | null;
  source_url: string | null;
  source_status: string;
  import_state: string;
  product_id: number | null;
  document_id: number | null;
  raw_meta: Record<string, unknown> | null;
};

function readProgress(): Record<string, { urls?: string[]; pdpId?: number }> {
  try {
    if (existsSync(PROGRESS_PATH)) {
      return JSON.parse(readFileSync(PROGRESS_PATH, "utf8"));
    }
  } catch {
    /* ignore */
  }
  return {};
}
function writeProgress(p: unknown) {
  writeFileSync(PROGRESS_PATH, JSON.stringify(p, null, 2), "utf8");
}

/** 즉시 영속 (scheduleLocalPersist 의 200ms 타이머에 의존하지 않고) */
function flushStore() {
  const ls = localStore();
  writeFileSync(STORE_PATH, JSON.stringify(ls, null, 2), "utf8");
}

async function queryNeonTop20(): Promise<NeonRow[]> {
  const client = new pg.Client({ connectionString: NEON });
  await client.connect();
  const res = await client.query<NeonRow>(
    `select id, supplier_code, external_id, title, category_path,
            min_price, max_price, currency, stock, primary_thumb_url,
            seller_name, source_url, source_status, import_state,
            product_id, document_id, raw_meta
       from catalog_index
      where supplier_code = 'cjdropshipping'
        and (category_path)[1] = any($1::text[])
        and raw_meta->>'listedNum' is not null
      order by (raw_meta->>'listedNum')::int desc
      limit 20`,
    [WOMEN_LEAVES],
  );
  await client.end();
  return res.rows;
}

function listedNum(r: NeonRow): number {
  const v = r.raw_meta?.listedNum;
  return v != null ? Number(v) : 0;
}

/** 여성의류 마케팅 3막 프롬프트 (docs/lexi-pdp-marketing-prompt-rules.md) */
function promptFor(role: "hero" | "macro" | "trust", row: NeonRow): string {
  const cat = row.category_path?.[0] ?? "women's clothing";
  if (role === "hero") {
    return [
      `Editorial fashion hero photo of a woman wearing the garment; preserve silhouette and fabric from source reference;`,
      `cream paper studio backdrop (#faf9f7), soft window morning light, warm neutral fog, ink/paper editorial LEXI mood for ${cat},`,
      `shallow depth of field, photorealistic, no label text, no logo, no watermark, 4:5 portrait`,
    ].join(" ");
  }
  if (role === "macro") {
    return [
      `Macro fabric detail of the garment: weave/knit/stitch texture matching the source color,`,
      `single elegant fold, shallow depth of field, cream neutral props, ${cat} commercial K-fashion editorial,`,
      `no text, no logo, square composition`,
    ].join(" ");
  }
  return [
    `Unboxing lifestyle still of the garment folded in an open gift box with satin lining,`,
    `soft peach-cream bokeh sparkle without readable stars or numbers, editorial commerce,`,
    `calm lower third for UI overlay, warm neutrals, photorealistic, no text, 16:9 landscape`,
  ].join(" ");
}

const SIZES = { hero: "portrait", macro: "square", trust: "landscape" } as const;
async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const from = Number(args.find((a) => a.startsWith("--from="))?.split("=")[1] ?? 0);
  const to = Number(args.find((a) => a.startsWith("--to="))?.split("=")[1] ?? 19);

  if (!NEON) throw new Error("NEON_DATABASE_URL required (use db:json:use)");

  console.log("🔍 Neon에서 여성의류 top 20 조회…");
  const rows = await queryNeonTop20();
  if (!rows.length) throw new Error("Neon에 여성의류 CJ 상품 없음");

  // 1) 목록 확인
  rows.forEach((r, i) => {
    console.log(
      `${String(i + 1).padStart(2)} | $${Number(r.min_price ?? 0).toFixed(2)} | listed=${String(listedNum(r)).padStart(3)} | ${(r.title || "").slice(0, 48)} | ${r.category_path?.[0]}`,
    );
  });
  console.log(`\n→ 상위 ${rows.length}개 확보`);

  // 2) 로컬 업서트 + 로컬 id 매핑
  console.log("로컬 스토어 업서트…");
  const localIds = new Map<string, number>(); // externalId → local catalog id
  for (const r of rows) {
    await upsertCatalogMeta({
      supplierCode: r.supplier_code ?? "cjdropshipping",
      externalId: String(r.external_id ?? r.id),
      title: r.title ?? "Untitled",
      categoryPath: r.category_path ?? [],
      price: Number(r.min_price ?? 0),
      currency: r.currency ?? "USD",
      stock: Number(r.stock ?? 0),
      primaryThumbUrl: r.primary_thumb_url ?? null,
      sellerName: r.seller_name ?? null,
      sourceUrl: r.source_url ?? null,
      rawMeta: r.raw_meta ?? null,
    });
  }
  const ls = localStore();
  const catArr = (ls.catalog ?? []) as { id: number; externalId: string; supplierCode: string }[];
  for (const r of rows) {
    const found = catArr.find(
      (c) => c.supplierCode === "cjdropshipping" && c.externalId === String(r.external_id ?? r.id),
    );
    if (found) localIds.set(String(r.external_id ?? r.id), found.id);
  }
  console.log(`→ 로컬 매핑 ${localIds.size}건`);
  flushStore();

  if (dry) {
    console.log("\n--dry 완료 (이미지 생성 생략). 실제 실행: --from/--to 배치");
    return;
  }

  // 3) 상품별 이미지 3장 + PDP 생성
  const progress = readProgress();

  // 크레딧 소진 등으로 fallback(CJ 썸네일/picsum)이 저장된 항목만 제거 → 재생성 유도
  if (args.includes("--retry-failed")) {
    let removed = 0;
    for (const k of Object.keys(progress)) {
      const urls = progress[k]?.urls ?? [];
      const hasFallback = urls.some(
        (u) => u.includes("cjdropshipping.com") || u.includes("picsum.photos"),
      );
      if (hasFallback) {
        delete progress[k];
        removed++;
      }
    }
    if (removed) {
      writeProgress(progress);
      console.log(`♻️ fallback 항목 ${removed}건 제거 → 재생성 대상`);
    } else {
      console.log("♻️ fallback 항목 없음 (모두 실제 이미지 보유)");
    }
  }

  for (let i = from; i <= Math.min(to, rows.length - 1); i++) {
    const r = rows[i];
    const external = String(r.external_id ?? r.id);
    const localId = localIds.get(external);
    if (!localId) {
      console.error(`  ⚠️ ${i + 1} 로컬 id 없음 — skip ${external}`);
      continue;
    }
    const key = String(localId);
    const prev = progress[key];
    let urls: string[] = prev?.urls?.length ? prev.urls : [];

    if (!urls.length) {
      console.log(`\n[${i + 1}/20] ${(r.title || "").slice(0, 44)} (catalog=${localId}) 이미지 생성…`);
      const attempt: string[] = [];
      for (const role of ["hero", "macro", "trust"] as const) {
        try {
          const gen = await generateProductImage({
            productName: (r.title || "").slice(0, 120),
            style: promptFor(role, r),
            size: SIZES[role],
            supplierCode: "cjdropshipping",
            catalogId: localId,
            externalId: `${localId}-${role}`,
            variants: ["thumb", "card", "pdp"],
          });
          const url = gen.assets.find((a) => a.variant === "pdp")?.url ?? gen.assets[0]?.url;
          if (url) {
            attempt.push(url);
            console.log(`    ✓ ${role} → ${url.slice(0, 70)}`);
          } else {
            console.warn(`    - ${role} url 없음`);
          }
        } catch (e) {
          console.warn(`    ✗ ${role} 실패: ${e instanceof Error ? e.message : String(e).slice(0, 120)}`);
          attempt.push(r.primary_thumb_url ?? `https://picsum.photos/seed/lexi-woman-${localId}-${role}/960/1280`);
        }
      }
      urls = attempt.filter(Boolean);
      progress[key] = { urls };
      writeProgress(progress);
      flushStore();
      console.log(`    → assetUrls ${urls.length}장`);
    } else {
      console.log(`\n[${i + 1}/20] ${(r.title || "").slice(0, 44)} (기존 이미지 ${urls.length}장 재사용)`);
    }
// 4) PDP 문서 생성 (openai 텍스트 + 3장 이미지)
    if (!prev?.pdpId) {
      try {
        const { doc, engine, model } = await generatePdpText({
          title: r.title ?? "LEXI Product",
          category: (r.category_path ?? []).join(" > ") || "Women's Fashion",
          price: `${r.currency ?? "USD"} ${r.min_price ?? "0"}`,
          seller: r.seller_name ?? undefined,
          locale: "ko",
          assetUrls: urls,
          voice: "성수 에디토리얼 — 따뜻한 한국어 카피",
          copyRuleset: PDP_RULESET_ID,
        });
        const html = renderPdp(doc, urls, undefined);
        const pdpArr = (ls.pdpDocs ??= []) as Array<{
          id: number;
          catalogId: number;
          title: string;
          locale: string;
          status: string;
          body: Record<string, unknown>;
          renderedHtml: string;
          productId: number | null;
          currentVersion: number;
          rulesetId: string;
          engine: string;
          createdAt: Date;
        }>;
        const existingIdx = pdpArr.findIndex((d) => d.catalogId === localId);
        const nextId = existingIdx >= 0 ? pdpArr[existingIdx].id : (ls.pdpSeq ?? 0) + 1;
        const entry = {
          id: nextId,
          title: doc.title,
          locale: "ko",
          status: "review",
          body: {
            rulesetId: PDP_RULESET_ID,
            catalogId: localId,
            productId: r.product_id ?? null,
            engine,
            model: model ?? null,
            structured: doc,
            assetUrls: urls,
            designDoc: { blocks: toBlocks(doc, urls, undefined) },
            source: "auto" as const,
          },
          renderedHtml: html,
          catalogId: localId,
          productId: r.product_id ?? null,
          currentVersion: existingIdx >= 0 ? pdpArr[existingIdx].currentVersion + 1 : 1,
          rulesetId: PDP_RULESET_ID,
          engine,
          createdAt: new Date(),
        };
        if (existingIdx >= 0) pdpArr[existingIdx] = entry;
        else {
          pdpArr.push(entry);
          ls.pdpSeq = (ls.pdpSeq ?? 0) + 1;
        }
        await patchCatalog(localId, { documentId: nextId, importState: "imported" });
        progress[key] = { urls, pdpId: nextId };
        writeProgress(progress);
        flushStore();
        console.log(`    ✅ PDP 문서 #${nextId} 저장 · engine=${engine}`);
      } catch (e) {
        console.error(`    ✗ PDP 실패: ${e instanceof Error ? e.message : String(e).slice(0, 160)}`);
      }
    } else {
      console.log(`    ✅ PDP 이미 존재 (#${prev.pdpId})`);
    }
  }

  scheduleLocalPersist();
  await new Promise((res) => setTimeout(res, 400));
  flushStore();
  console.log("\n완료. 남은 배치: --from/--to 로 이어서 실행 가능");
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});