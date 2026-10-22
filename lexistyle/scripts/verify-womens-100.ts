/**
 * PDP 98건 품질 검증 스크립트
 */
import { localStore } from "../src/lib/local-store";
import { validatePdp } from "../src/lib/pdp/ruleset";
import { getPdpDocument } from "../src/lib/pdp/generate";
import { searchCatalog } from "../src/lib/catalog/index-store";

async function main() {
  const s = localStore();
  const docs = (s.pdpDocs ?? []).sort((a: any, b: any) => a.id - b.id);
  console.log(`=== PDP 문서 ${docs.length}건 검증 ===`);

  let kosher = 0;
  let bad = 0;
  const badOnes: string[] = [];

  for (const d of docs as any[]) {
    const title = d.title ?? "?";
    const body = d.body ?? {};
    const engine = d.engine ?? body.engine ?? "?";
    const layoutId = body.conceptSpec?.layoutId ?? "none";
    const blocks = body.designDoc?.blocks ?? [];
    const blockTypes = blocks.map((b: any) => b.type);
    const htmlLen = d.renderedHtml?.length ?? 0;
    const blockCount = blocks.length;

    const hasHtml = htmlLen > 100;
    const hasBlocks = blockCount >= 4;
    const hasEngine = engine !== "?";

    // SAMPLE3 블록 순서 체크
    const hasHero = blockTypes.includes("hero");
    const hasUsp = blockTypes.includes("usp");
    const hasFaq = blockTypes.includes("faq");
    const hasCta = blockTypes.includes("cta");
    const hasGallery = blockTypes.includes("gallery");

    const pdpStructured = body.structured ?? {};
    const validationErrors = pdpStructured.usps ? validatePdp(pdpStructured) : [];

    if (hasHtml && hasBlocks && hasEngine && hasHero && hasUsp) {
      kosher++;
    } else {
      bad++;
      const issues: string[] = [];
      if (!hasHtml) issues.push("html<100");
      if (!hasBlocks) issues.push("blocks<4");
      if (!hasEngine) issues.push("no-engine");
      if (!hasHero) issues.push("no-hero");
      if (!hasUsp) issues.push("no-usp");
      if (!hasFaq) issues.push("no-faq");
      badOnes.push(`#${d.id} ${title} (${issues.join(", ")})`);
    }
  }

  console.log(`적격 문서: ${kosher}/${docs.length}`);
  if (bad > 0) {
    console.log(`블록 불량: ${bad}`);
    badOnes.slice(0, 5).forEach((b) => console.log(`  ❌ ${b}`));
  } else {
    console.log("블록 불량: 0 ✅");
  }

  // 샘플 3건 상세
  console.log("\n=== 샘플 3건 상세 ===");
  for (const d of docs.slice(0, 3) as any[]) {
    const body = d.body ?? {};
    const engine = d.engine ?? body.engine ?? "?";
    const blocks = body.designDoc?.blocks ?? [];
    const blockTypes = blocks.map((b: any) => b.type).join(", ");
    const htmlLen = d.renderedHtml?.length ?? 0;
    console.log(`#${d.id} ${d.title}`);
    console.log(`  engine=${engine} blocks=${blocks.length} (${blockTypes}) html=${htmlLen}자 status=${d.status}`);
  }

  // 카탈로그 상태
  const cat = searchCatalog({ supplier: "demo-seoul", scope: "all", limit: 999 });
  const catList = await cat;
  const items = Array.isArray(catList) ? catList : (catList as any).items ?? [];
  const withDoc = items.filter((r: any) => r.documentId);
  console.log(`\n=== 카탈로그 연동 ===`);
  console.log(`전체: ${items.length}건, 문서 연동: ${withDoc.length}건`);

  // 쿠팡 validation 체크
  console.log(`\n=== 쿠팡 Export Validation (샘플 5건) ===`);
  const coupangSamples = docs.slice(0, 5);
  for (const d of coupangSamples as any[]) {
    const struct = d.body?.structured ?? {};
    const titleLen = struct.title?.length ?? 0;
    const descLen = d.renderedHtml?.length ?? 0;
    const ok = titleLen <= 100 && descLen <= 50000;
    console.log(`#${d.id} ${struct.title?.slice(0, 40)}`);
    console.log(`  title=${titleLen}/100 body=${descLen}/50000 ${ok ? "✅" : "⚠️"}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });