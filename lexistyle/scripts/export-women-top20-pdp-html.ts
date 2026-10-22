/**
 * 상품페이지(PDP) 렌더 HTML export — scripts/pdp-previews/{catalogId}-{정렬번호}-{slug}.html
 * 로컬 JSON 스토어(pdpDocs)의 renderedHtml을 브라우저에서 바로 열 수 있는 독립 HTML로 저장.
 * 사용: npx tsx scripts/export-women-top20-pdp-html.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
delete process.env.DATABASE_URL;

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import os from "os";
import path from "path";

const DATA_DIR =
  process.env.LOCAL_DATA_DIR || path.join(os.homedir(), ".lexi-local", "data");
const STORE_PATH = path.join(DATA_DIR, "lexi-local.json");
const OUT_DIR = path.join(process.cwd(), "scripts", "pdp-previews");

function rowNo(external: string): string {
  // catalog ↔ 여성 top20 순번은 progress 파일에서 취득
  const progPath = path.join(DATA_DIR, "women-top20-progress.json");
  try {
    if (existsSync(progPath)) {
      const p = JSON.parse(readFileSync(progPath, "utf8"));
      const keys = Object.keys(p);
      const idx = keys.indexOf(external);
      if (idx >= 0) return String(idx + 1).padStart(2);
    }
  } catch {
    /* ignore */
  }
  return "00";
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "pdp"
  );
}

function main() {
  const d = JSON.parse(readFileSync(STORE_PATH, "utf8"));
  const docs = (d.pdpDocs ?? []) as Array<{
    id: number;
    catalogId: number;
    title: string;
    engine: string;
    body: { assetUrls?: string[]; catalogId?: number };
    renderedHtml: string;
  }>;
  const cats = (d.catalog ?? []) as Array<{ id: number; title: string }>;
  mkdirSync(OUT_DIR, { recursive: true });

  const out: Array<{ file: string; abs: string }> = [];
  const target = new Set(docs.map((x) => x.catalogId));
  const top = cats.filter((c) => target.has(c.id));

  // catalog 224~243 (top20) 를 id 역순 파악
  const ordered = [...top].sort((a, b) => a.id - b.id);
  for (const doc of docs) {
    if (!ordered.some((c) => c.id === doc.catalogId)) continue;
    const assetUrls = (doc.body?.assetUrls ?? []).map(
      (u) =>
        u.replace("&", "&amp;").replace('"', "&quot;"),
    );
    const no = rowNo(String(doc.catalogId));
    const fileName = `${doc.catalogId}-${no}-${slugify(doc.title)}.html`;
    const abs = path.join(OUT_DIR, fileName);
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${doc.title} · LEXI PDP</title>
<style>
  body { margin:0; background:#1a1a1a; font-family:"Pretendard",system-ui,sans-serif; }
  .meta { max-width:760px; margin:0 auto; padding:10px 16px; color:#bbb; font-size:12px; background:#262626; }
  .meta a { color:#7ab; text-decoration:none; margin-right:8px; }
  .frame { max-width:760px; margin:0 auto; background:#fff; }
</style>
</head>
<body>
<div class="meta">
  LEXI PDP · catalog ${doc.catalogId} · pdpId ${doc.id} · engine ${doc.engine}
  · 이미지 <a href="${assetUrls[0] ?? "#"}" target="_blank">1</a>
  <a href="${assetUrls[1] ?? "#"}" target="_blank">2</a>
  <a href="${assetUrls[2] ?? "#"}" target="_blank">3</a>
</div>
<div class="frame">
${doc.renderedHtml}
</div>
</body>
</html>`;
    writeFileSync(abs, html, "utf8");
    out.push({ file: fileName, abs });
  }
  console.log(`✅ 총 ${out.length}개 상품페이지 export → ${OUT_DIR}`);
  for (const o of out) console.log("- " + o.file);
  console.log("\n열기: 파일 더블클릭 또는 file:// 경로 사용");
}

main();