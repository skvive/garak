/**
 * CJ 원본 URL ↔ storefront products 연결 감사/교정.
 *
 * 기본은 읽기 전용이다. --apply를 붙이면 고신뢰 항목만 교정한다.
 * 로컬 DB만 허용하며, 원격 DB는 --allow-remote=1을 명시해야 한다.
 *
 * 사용:
 *   npx tsx scripts/audit-cj-product-urls.ts
 *   npx tsx scripts/audit-cj-product-urls.ts --apply
 *   npx tsx scripts/audit-cj-product-urls.ts --limit=100 --apply
 */
import { config } from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

type Product = {
  id: string;
  slug: string;
  name: string;
  deleted_at: string | null;
};

type Catalog = {
  id: string;
  external_id: string;
  title: string;
  source_url: string | null;
  raw_meta: Record<string, unknown> | null;
  product_id: string | null;
  import_state: string;
  source_status: string;
};

type Finding = {
  productId: string;
  productSlug: string;
  productName: string;
  catalogId?: string;
  externalId?: string;
  kind: string;
  confidence: "high" | "review";
  detail: string;
  proposedSourceUrl?: string;
  proposedProductId?: string;
};

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const allowRemote = args.has("--allow-remote=1");
const limitArg = process.argv.find((x) => x.startsWith("--limit="));
const limit = limitArg ? Math.max(1, Number(limitArg.slice("--limit=".length)) || 0) : 0;

function hostOf(value: string): string {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isLocal(value: string): boolean {
  const host = hostOf(value);
  return host === "localhost" || host === "127.0.0.1" || host === "postgres";
}

function pidFromUrl(value: string | null): string | null {
  const match = value?.match(/-p-(\d{10,25})/i);
  return match?.[1] ?? null;
}

function pidFromSlug(value: string): string | null {
  const all = [...value.matchAll(/(?:^|[-_])(\d{10,25})(?=$|[-_])/g)].map((m) => m[1]);
  return all.at(-1) ?? null;
}

function numericExternalId(value: string | null | undefined): string | null {
  return value && /^\d{10,25}$/.test(value) ? value : null;
}

function variantPids(raw: Record<string, unknown> | null): string[] {
  if (!raw) return [];
  const out = new Set<string>();
  const variants = Array.isArray(raw.variants) ? raw.variants : [];
  for (const item of variants) {
    if (!item || typeof item !== "object") continue;
    const pid = (item as Record<string, unknown>).pid;
    if (typeof pid === "string" && /^\d{10,25}$/.test(pid)) out.add(pid);
  }
  for (const key of ["pid", "productId"]) {
    const pid = raw[key];
    if (typeof pid === "string" && /^\d{10,25}$/.test(pid)) out.add(pid);
  }
  return [...out];
}

function canonicalUrl(row: Catalog, pid: string): string {
  const stored = row.source_url?.trim();
  if (stored && hostOf(stored).endsWith("cjdropshipping.com") && pidFromUrl(stored) === pid) {
    const url = new URL(stored);
    url.search = "";
    url.hash = "";
    return url.toString();
  }
  return `https://cjdropshipping.com/product/-p-${pid}.html`;
}

function productPid(product: Product, row: Catalog): string | null {
  return pidFromUrl(row.source_url) ??
    numericExternalId(row.external_id) ??
    variantPids(row.raw_meta).find((pid) => pidFromSlug(product.slug) === pid) ??
    variantPids(row.raw_meta)[0] ??
    pidFromSlug(product.slug);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  if (!allowRemote && !isLocal(databaseUrl)) {
    throw new Error("원격 DB 보호: 로컬 DB에서 실행하거나 --allow-remote=1을 명시하세요.");
  }

  const client = new pg.Client({ connectionString: databaseUrl, ssl: false });
  await client.connect();
  try {
    const productsResult = await client.query<Product>(`
      select id::text, slug, name, deleted_at
      from products
      where deleted_at is null and is_dummy = false
      order by id
      ${limit ? `limit ${limit}` : ""}
    `);
    const catalogResult = await client.query<Catalog>(`
      select id::text, external_id, title, source_url, raw_meta,
             product_id::text, import_state, source_status
      from catalog_index
      where supplier_code = 'cjdropshipping'
        and source_status <> 'gone'
    `);

    const products = productsResult.rows;
    const catalog = catalogResult.rows;
    const byProduct = new Map<string, Catalog[]>();
    const byExternal = new Map<string, Catalog[]>();
    const productIds = new Set(products.map((p) => p.id));
    for (const row of catalog) {
      if (row.product_id) {
        const list = byProduct.get(row.product_id) ?? [];
        list.push(row);
        byProduct.set(row.product_id, list);
      }
      const list = byExternal.get(row.external_id) ?? [];
      list.push(row);
      byExternal.set(row.external_id, list);
    }

    const findings: Finding[] = [];
    const mutations: Array<{ catalogId: string; productId?: string; previousProductId?: string | null; sourceUrl?: string; reason: string }> = [];
    const seenMutation = new Set<string>();

    for (const product of products) {
      const linked = byProduct.get(product.id) ?? [];
      const slugPid = pidFromSlug(product.slug);

      if (linked.length === 0) {
        const candidates = slugPid ? (byExternal.get(slugPid) ?? []) : [];
        if (candidates.length === 1) {
          const candidate = candidates[0];
          const occupiedByLiveProduct = candidate.product_id && productIds.has(candidate.product_id) && candidate.product_id !== product.id;
          if (!occupiedByLiveProduct) {
            findings.push({
              productId: product.id,
              productSlug: product.slug,
              productName: product.name,
              catalogId: candidate.id,
              externalId: candidate.external_id,
              kind: "link-missing",
              confidence: "high",
              detail: `slug의 CJ PID ${slugPid}와 catalog_index.external_id가 정확히 일치`,
              proposedProductId: product.id,
            });
            const key = `${candidate.id}:product:${product.id}`;
            if (!seenMutation.has(key)) {
              mutations.push({ catalogId: candidate.id, productId: product.id, previousProductId: candidate.product_id, reason: "exact slug PID match" });
              seenMutation.add(key);
            }
          } else {
            findings.push({
              productId: product.id,
              productSlug: product.slug,
              productName: product.name,
              catalogId: candidate.id,
              externalId: candidate.external_id,
              kind: "link-conflict",
              confidence: "review",
              detail: `같은 CJ ID가 다른 활성 상품 ${candidate.product_id}에 이미 연결됨`,
            });
          }
        } else {
          findings.push({
            productId: product.id,
            productSlug: product.slug,
            productName: product.name,
            kind: "link-missing",
            confidence: "review",
            detail: slugPid ? `CJ PID ${slugPid}에 대한 단일 원장 후보를 찾지 못함` : "slug에서 CJ PID를 추출하지 못함",
          });
        }
        continue;
      }

      if (linked.length > 1) {
        findings.push({
          productId: product.id,
          productSlug: product.slug,
          productName: product.name,
          kind: "link-duplicate",
          confidence: "review",
          detail: `활성 CJ 원장 ${linked.length}건이 한 상품에 연결됨`,
        });
        continue;
      }

      const row = linked[0];
      const pid = productPid(product, row);
      if (!pid) {
        findings.push({ productId: product.id, productSlug: product.slug, productName: product.name, catalogId: row.id, externalId: row.external_id, kind: "source-missing", confidence: "review", detail: "CJ 상품 PID를 확인할 수 없음" });
        continue;
      }

      const sourcePid = pidFromUrl(row.source_url);
      const sourceHostOk = Boolean(row.source_url && hostOf(row.source_url).endsWith("cjdropshipping.com"));
      const slugMismatch = Boolean(slugPid && sourcePid && slugPid !== sourcePid && variantPids(row.raw_meta).includes(slugPid));
      const needsSourceRepair = !row.source_url || !sourcePid || !sourceHostOk || slugMismatch;
      if (needsSourceRepair) {
        const nextUrl = canonicalUrl(row, slugMismatch && slugPid ? slugPid : pid);
        const reason = !row.source_url ? "source_url missing" : !sourcePid ? "source URL has no CJ PID" : !sourceHostOk ? "source URL host is not CJ" : "slug PID matches CJ variant PID, stored URL is stale";
        findings.push({ productId: product.id, productSlug: product.slug, productName: product.name, catalogId: row.id, externalId: row.external_id, kind: "source-url", confidence: "high", detail: reason, proposedSourceUrl: nextUrl });
        const key = `${row.id}:url:${nextUrl}`;
        if (!seenMutation.has(key)) {
          mutations.push({ catalogId: row.id, sourceUrl: nextUrl, reason });
          seenMutation.add(key);
        }
      }
    }

    const counts = findings.reduce<Record<string, number>>((acc, item) => {
      acc[item.kind] = (acc[item.kind] ?? 0) + 1;
      return acc;
    }, {});
    const high = findings.filter((x) => x.confidence === "high").length;
    const report = {
      generatedAt: new Date().toISOString(),
      mode: apply ? "apply" : "dry-run",
      databaseHost: hostOf(databaseUrl),
      productsChecked: products.length,
      cjCatalogRows: catalog.length,
      counts,
      highConfidence: high,
      plannedMutations: mutations.length,
      findings,
    };
    await fs.mkdir(path.resolve("tmp"), { recursive: true });
    const reportPath = path.resolve("tmp", "cj-product-url-audit.json");
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

    let applied = 0;
    if (apply) {
      await client.query("begin");
      try {
        for (const mutation of mutations) {
          if (mutation.productId) {
            const updated = await client.query(
              `update catalog_index set product_id=$1, import_state='imported', updated_at=now()
               where id=$2 and (product_id is null or product_id=$1 or product_id=$3)
               returning id`,
              [mutation.productId, mutation.catalogId, mutation.previousProductId],
            );
            if (!updated.rowCount) continue;
          } else if (mutation.sourceUrl) {
            await client.query(`update catalog_index set source_url=$1, updated_at=now() where id=$2`, [mutation.sourceUrl, mutation.catalogId]);
          }
          await client.query(
            `insert into commerce_audit(entity, entity_id, to_state, actor, meta)
             values ('catalog_url', $1, $2, 'cj-url-audit', $3::jsonb)`,
            [mutation.catalogId, mutation.productId ? "linked" : "url-corrected", JSON.stringify({ reason: mutation.reason, productId: mutation.productId ?? null, sourceUrl: mutation.sourceUrl ?? null })],
          );
          applied++;
        }
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }

    console.log(JSON.stringify({ ...report, applied, reportPath }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`CJ URL audit failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
