import fs from "node:fs/promises";
import path from "node:path";

const sourcePath = process.argv[2] || "tmp/fashion-page-2-enriched.json";
const jsonOutput = process.argv[3] || "tmp/fashion-page-2-women.json";
const markdownOutput = process.argv[4] || "docs/fashion-page2-women-pdp-list.md";

const source = JSON.parse(await fs.readFile(sourcePath, "utf8"));
const products = Array.isArray(source) ? source : source.products;
const excludedCategory = /(^|\s)(man|men|boy|boys|kid|kids|child|children)(\s|$)/i;
const women = products
  .filter((item) => item.catalog?.id && item.index <= 30 && !excludedCategory.test((item.catalog.category_path || []).join(" / ")))
  .map((item) => {
    const catalogId = Number(item.catalog.id);
    const documentId = item.catalog.document_id ? Number(item.catalog.document_id) : null;
    const linkedCatalogId = item.catalog.document_body?.catalogId ?? null;
    const categoryPath = (item.catalog.category_path || []).join(" / ");
    const linkState = !documentId
      ? "new"
      : Number(linkedCatalogId) === catalogId
        ? "existing-match"
        : "stale-link";
    return {
      ...item,
      catalogId,
      documentId,
      categoryPath,
      primaryThumbUrl: item.catalog.primary_thumb_url,
      linkedCatalogId,
      linkState,
      generationState: "source-ready",
    };
  });

if (women.length !== 30) {
  throw new Error(`Expected 30 women's apparel products, found ${women.length}`);
}

await fs.mkdir(path.dirname(jsonOutput), { recursive: true });
await fs.mkdir(path.dirname(markdownOutput), { recursive: true });
await fs.writeFile(jsonOutput, `${JSON.stringify(women, null, 2)}\n`);

const rows = women.map((item, index) => {
  const title = String(item.title).replaceAll("|", "\\|");
  const category = String(item.categoryPath || "-").replaceAll("|", "\\|");
  const status = item.linkState === "stale-link"
    ? `재생성·연결수정 (현재 문서 ${item.documentId} → 상품 ${item.linkedCatalogId})`
    : item.linkState === "existing-match"
      ? `SAMPLE3 재검증/갱신 (문서 ${item.documentId})`
      : "SAMPLE3 신규 생성";
  return `| ${index + 1} | ${item.catalogId} | [${title}](${item.url}) | ${category} | ${status} |`;
});

const markdown = `# 패션 2페이지 여성의류 SAMPLE3 생성 목록\n\n` +
  `- 원본 페이지: https://style.lexid.site/ko/category/fashion?page=2\n` +
  `- 확인 상품: 40개\n` +
  `- 여성의류 선정: ${women.length}개\n` +
  `- 제외: 남성/아동 의류 10개\n` +
  `- DB 대상: 로컬 PostgreSQL만 사용 (Neon 동기화·배포 제외)\n\n` +
  `| # | catalogId | 상품 | 로컬 카테고리 | 처리 |\n` +
  `|---:|---:|---|---|---|\n` +
  `${rows.join("\n")}\n`;

await fs.writeFile(markdownOutput, markdown);
console.log(JSON.stringify({ checked: products.length, selected: women.length, jsonOutput, markdownOutput }));
