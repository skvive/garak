/**
 * CJ 원본 ↔ 쇼핑몰 상품명·카테고리·상품 연결 감사.
 * 이름은 마케팅/번역명일 수 있으므로 자동 변경하지 않고 exact/different를 분리한다.
 */
import { config } from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { EXTRA_LEAVES, reclassifyLeaf } from "../src/lib/catalog/reclassify-rules";
import { cjLeafBySlug, resolveCjCategory } from "../src/lib/catalog/cj-taxonomy";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

type Product = { id: string; slug: string; name: string; category_slug: string | null; category_name: string | null };
type Catalog = { id: string; external_id: string; title: string; source_url: string | null; raw_meta: Record<string, unknown> | null; product_id: string | null; category_path: string[] | null };

function pidFromUrl(value: string | null): string | null {
  return value?.match(/-p-(\d{10,25})/i)?.[1] ?? null;
}
function pidFromSlug(value: string): string | null {
  const all = [...value.matchAll(/(?:^|[-_])(\d{10,25})(?=$|[-_])/g)].map((m) => m[1]);
  return all.at(-1) ?? null;
}
function productPid(product: Product, row: Catalog): string | null {
  return pidFromUrl(row.source_url) ?? (/^\d{10,25}$/.test(row.external_id) ? row.external_id : null) ?? pidFromSlug(product.slug);
}
function expectedCategorySlug(row: Catalog): string | null {
  const resolved = resolveCjCategory(row.category_path);
  if (!resolved) return null;
  const moved = reclassifyLeaf(row.title, resolved.slug);
  if (!moved) return resolved.slug;
  if (EXTRA_LEAVES.some((x) => x.slug === moved)) return moved;
  return cjLeafBySlug(moved)?.slug ?? resolved.slug;
}
function normalized(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}
function latinTokens(value: string): Set<string> {
  return new Set((value.toLowerCase().match(/[a-z]{3,}/g) ?? []).filter((x) => !/^(and|the|for|with|new|style|women|womens|men|mens)$/.test(x)));
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const host = new URL(databaseUrl).hostname;
  if (!["localhost", "127.0.0.1", "postgres"].includes(host) && process.argv.includes("--allow-remote=1") === false) {
    throw new Error("원격 DB 보호: 로컬 DB에서 실행하거나 --allow-remote=1을 명시하세요.");
  }
  const client = new pg.Client({ connectionString: databaseUrl, ssl: false });
  await client.connect();
  try {
    const products = (await client.query<Product>(`
      select p.id::text, p.slug, p.name, c.slug category_slug, c.name category_name
      from products p left join categories c on c.id=p.category_id
      where p.deleted_at is null and p.is_dummy=false order by p.id
    `)).rows;
    const catalog = (await client.query<Catalog>(`
      select id::text, external_id, title, source_url, raw_meta, product_id::text, category_path
      from catalog_index where supplier_code='cjdropshipping' and source_status <> 'gone'
    `)).rows;
    const byProduct = new Map<string, Catalog[]>();
    const byPid = new Map<string, Catalog[]>();
    for (const row of catalog) {
      if (row.product_id) byProduct.set(row.product_id, [...(byProduct.get(row.product_id) ?? []), row]);
      const pid = pidFromUrl(row.source_url) ?? (/^\d{10,25}$/.test(row.external_id) ? row.external_id : null);
      if (pid) byPid.set(pid, [...(byPid.get(pid) ?? []), row]);
    }

    const findings = {
      identityMismatch: [] as unknown[],
      categoryMismatch: [] as unknown[],
      nameDifferent: [] as unknown[],
      unresolved: [] as unknown[],
    };
    let linked = 0;
    let namesExact = 0;
    let categoryExact = 0;
    for (const product of products) {
      const linkedRows = byProduct.get(product.id) ?? [];
      const expectedPid = pidFromSlug(product.slug);
      if (!linkedRows.length) {
        findings.unresolved.push({ productId: product.id, slug: product.slug, name: product.name, expectedPid, reason: "no linked CJ catalog row" });
        continue;
      }
      linked++;
      const currentPids = linkedRows.map((row) => productPid(product, row)).filter(Boolean);
      if (expectedPid && !currentPids.includes(expectedPid)) {
        const candidates = byPid.get(expectedPid) ?? [];
        findings.identityMismatch.push({
          productId: product.id,
          slug: product.slug,
          productName: product.name,
          expectedPid,
          linked: linkedRows.map((row) => ({ catalogId: row.id, externalId: row.external_id, pid: productPid(product, row), title: row.title, productId: row.product_id })),
          candidates: candidates.map((row) => ({ catalogId: row.id, externalId: row.external_id, title: row.title, productId: row.product_id })),
        });
        continue;
      }
      if (linkedRows.length !== 1) {
        findings.unresolved.push({ productId: product.id, slug: product.slug, name: product.name, reason: `linked CJ rows=${linkedRows.length}` });
        continue;
      }
      const row = linkedRows[0];
      const expectedCategory = expectedCategorySlug(row);
      if (expectedCategory && product.category_slug === expectedCategory) categoryExact++;
      else findings.categoryMismatch.push({ productId: product.id, slug: product.slug, productName: product.name, catalogId: row.id, cjTitle: row.title, cjCategoryPath: row.category_path, currentCategory: product.category_slug, currentCategoryName: product.category_name, expectedCategory });
      if (normalized(product.name) === normalized(row.title)) namesExact++;
      else {
        const productTokens = latinTokens(product.name);
        const cjTokens = latinTokens(row.title);
        const overlap = cjTokens.size ? [...productTokens].filter((x) => cjTokens.has(x)).length / cjTokens.size : null;
        findings.nameDifferent.push({ productId: product.id, slug: product.slug, productName: product.name, cjTitle: row.title, catalogId: row.id, tokenOverlap: overlap });
      }
    }
    const result = {
      generatedAt: new Date().toISOString(),
      productsChecked: products.length,
      cjCatalogRows: catalog.length,
      linkedProducts: linked,
      namesExact,
      namesDifferent: findings.nameDifferent.length,
      categoriesExact: categoryExact,
      categoriesMismatch: findings.categoryMismatch.length,
      identityMismatch: findings.identityMismatch.length,
      unresolved: findings.unresolved.length,
      findings,
    };
    await fs.mkdir(path.resolve("tmp"), { recursive: true });
    const reportPath = path.resolve("tmp", "cj-content-mapping-audit.json");
    await fs.writeFile(reportPath, JSON.stringify(result, null, 2), "utf8");
    console.log(JSON.stringify({ ...result, reportPath }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => { console.error(`CJ content audit failed: ${error instanceof Error ? error.message : String(error)}`); process.exit(1); });
