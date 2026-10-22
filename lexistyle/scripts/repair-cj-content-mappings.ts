/**
 * CJ source-of-truth repair for product identity, category and fallback images.
 * Default is dry-run; pass --apply on the local DB only.
 */
import { config } from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import pg from "pg";
import sharp from "sharp";
import { put } from "@vercel/blob";
import { EXTRA_LEAVES, reclassifyLeaf } from "../src/lib/catalog/reclassify-rules";
import { cjLeafBySlug, resolveCjCategory } from "../src/lib/catalog/cj-taxonomy";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

type Product = { id: string; slug: string; name: string; category_id: string; is_dummy: boolean };
type Category = { id: string; slug: string; name: string };
type Catalog = { id: string; external_id: string; title: string; source_url: string | null; primary_thumb_url: string | null; document_id: string | null; product_id: string | null; category_path: string[] | null };
type Image = { id: string; product_id: string; url: string; sort: number };

const apply = process.argv.includes("--apply");
const isLocal = (value: string) => ["localhost", "127.0.0.1", "postgres"].includes(new URL(value).hostname);
const pidFromSlug = (value: string) => [...value.matchAll(/(?:^|[-_])(\d{10,25})(?=$|[-_])/g)].at(-1)?.[1] ?? null;
const pidFromCatalog = (row: Catalog) => row.source_url?.match(/-p-(\d{10,25})/i)?.[1] ?? (/^\d{10,25}$/.test(row.external_id) ? row.external_id : null);
const expectedCategorySlug = (row: Catalog) => {
  const resolved = resolveCjCategory(row.category_path);
  if (!resolved) return null;
  const moved = reclassifyLeaf(row.title, resolved.slug);
  if (!moved) return resolved.slug;
  return EXTRA_LEAVES.some((x) => x.slug === moved) ? moved : cjLeafBySlug(moved)?.slug ?? resolved.slug;
};

const mapFile = path.resolve("tmp", "rehost-map.json");
const loadMap = async () => {
  try { return JSON.parse(await fs.readFile(mapFile, "utf8")) as Record<string, string>; } catch { return {}; }
};
const saveMap = async (map: Record<string, string>) => {
  await fs.mkdir(path.dirname(mapFile), { recursive: true });
  await fs.writeFile(mapFile, JSON.stringify(map, null, 1), "utf8");
};

async function rehost(source: string): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is required for an unmapped source image");
  const response = await fetch(source, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`source image ${response.status}`);
  const input = Buffer.from(await response.arrayBuffer());
  const body = await sharp(input).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
  const key = createHash("sha1").update(source).digest("hex");
  const blob = await put(`products/rehost/${key}.webp`, body, { access: "public", contentType: "image/webp", token, addRandomSuffix: false, allowOverwrite: true });
  return blob.url;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl || !isLocal(databaseUrl)) throw new Error("로컬 DATABASE_URL에서만 실행할 수 있습니다.");
  const client = new pg.Client({ connectionString: databaseUrl, ssl: false });
  await client.connect();
  const map = await loadMap();
  try {
    const products = (await client.query<Product>(`select id::text,slug,name,category_id::text,is_dummy from products where deleted_at is null and is_dummy=false`)).rows;
    const categories = (await client.query<Category>(`select id::text,slug,name from categories`)).rows;
    const catalog = (await client.query<Catalog>(`select id::text,external_id,title,source_url,primary_thumb_url,document_id,product_id::text,category_path from catalog_index where supplier_code='cjdropshipping' and source_status<>'gone'`)).rows;
    const images = (await client.query<Image>(`select id::text,product_id::text,url,sort from product_images where deleted_at is null and is_dummy=false order by product_id,sort,id`)).rows;
    const productById = new Map(products.map((p) => [p.id, p]));
    const productByPid = new Map<string, Product[]>();
    for (const p of products) { const pid = pidFromSlug(p.slug); if (pid) productByPid.set(pid, [...(productByPid.get(pid) ?? []), p]); }
    const rowsByProduct = new Map<string, Catalog[]>();
    const rowsByPid = new Map<string, Catalog[]>();
    for (const row of catalog) {
      if (row.product_id) rowsByProduct.set(row.product_id, [...(rowsByProduct.get(row.product_id) ?? []), row]);
      const pid = pidFromCatalog(row); if (pid) rowsByPid.set(pid, [...(rowsByPid.get(pid) ?? []), row]);
    }
    const imageByProduct = new Map<string, Image[]>();
    for (const image of images) imageByProduct.set(image.product_id, [...(imageByProduct.get(image.product_id) ?? []), image]);

    // Repair the three stale identity chains only when the target CJ PID is unique.
    const identityMoves: { catalogId: string; from: string | null; to: string }[] = [];
    for (const target of products) {
      const expectedPid = pidFromSlug(target.slug); if (!expectedPid) continue;
      const linked = rowsByProduct.get(target.id) ?? [];
      if (linked.some((row) => pidFromCatalog(row) === expectedPid)) continue;
      const candidates = rowsByPid.get(expectedPid) ?? [];
      if (candidates.length !== 1) continue;
      const candidate = candidates[0];
      // Candidate rows assigned to deleted/missing products are safe to reclaim.
      const owner = candidate.product_id ? productById.get(candidate.product_id) : null;
      if (owner && owner.id !== target.id) {
        const ownerPid = pidFromSlug(owner.slug);
        if (ownerPid === expectedPid) continue;
        // Transfer the target's stale row to the product whose slug owns it, if unique.
        for (const stale of linked) {
          const stalePid = pidFromCatalog(stale); const rightful = stalePid ? productByPid.get(stalePid) ?? [] : [];
          if (rightful.length === 1 && rightful[0].id !== target.id && !(rowsByProduct.get(rightful[0].id) ?? []).some((r) => pidFromCatalog(r) === stalePid)) {
            identityMoves.push({ catalogId: stale.id, from: target.id, to: rightful[0].id });
          }
        }
      }
      identityMoves.push({ catalogId: candidate.id, from: candidate.product_id, to: target.id });
    }

    // Build canonical category and source-image plans against the post-identity view.
    const ownerAfter = new Map<string, string>();
    for (const row of catalog) if (row.product_id) ownerAfter.set(row.id, row.product_id);
    for (const move of identityMoves) ownerAfter.set(move.catalogId, move.to);
    const categoryUpdates = new Map<string, string>();
    const missingCategories = new Map<string, { name: string; dept: string }>();
    const titleUpdates = new Map<string, string>();
    const detachCatalogIds: string[] = [];
    const deleteDuplicateProductIds: string[] = [];
    const forceSourceTitleIds = new Set([
      // Rows whose display name was inherited from an unrelated legacy product.
      "1", "23", "48", "96", "98", "101", "102", "105",
      "1398", "1399", "1401", "1402", "1403", "1404", "1405",
    ]);
    const forceSourceImageIds = new Set(["107"]);
    const imageUpdates: { productId: string; source: string; target: string }[] = [];
    for (const product of products) {
      const linked = catalog.filter((row) => ownerAfter.get(row.id) === product.id);
      const expectedPid = pidFromSlug(product.slug);
      const canonical = linked.filter((row) => !expectedPid || pidFromCatalog(row) === expectedPid);
      if (canonical.length !== 1) continue;
      const row = canonical[0];
      if (forceSourceTitleIds.has(product.id) && product.name.trim() !== row.title.trim()) titleUpdates.set(product.id, row.title);
      const expectedCategory = expectedCategorySlug(row);
      const resolved = resolveCjCategory(row.category_path);
      const category = expectedCategory ? categories.find((c) => c.slug === expectedCategory) : null;
      if (expectedCategory && !category && resolved) missingCategories.set(expectedCategory, { name: resolved.name, dept: resolved.dept });
      if (category && category.id !== product.category_id) categoryUpdates.set(product.id, category.id);
      // Generated PDP documents normally own their gallery. Force known stale
      // legacy assets back to the current CJ source image.
      if ((row.document_id && !forceSourceImageIds.has(product.id)) || !row.primary_thumb_url || !/^https?:\/\//i.test(row.primary_thumb_url)) continue;
      const current = (imageByProduct.get(product.id) ?? [])[0];
      const target = map[row.primary_thumb_url] ?? row.primary_thumb_url;
      if (!current || current.url !== target) imageUpdates.push({ productId: product.id, source: row.primary_thumb_url, target });
    }
    for (const product of products) {
      const linked = rowsByProduct.get(product.id) ?? [];
      const expectedPid = pidFromSlug(product.slug);
      if (linked.length > 1 && expectedPid) {
        const canonical = linked.filter((row) => pidFromCatalog(row) === expectedPid);
        if (canonical.length === 1) for (const row of linked) if (row.id !== canonical[0].id) detachCatalogIds.push(row.id);
      }
    }
    // Product 1400 is a duplicate URL/PID of the active sunglasses product 716.
    if (products.some((p) => p.id === "1400") && catalog.some((r) => r.external_id === "2090338543042060289" && r.product_id === "716")) deleteDuplicateProductIds.push("1400");

    console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", identityMoves, categoryUpdates: categoryUpdates.size, missingCategories: [...missingCategories.keys()], titleUpdates: [...titleUpdates.keys()], detachCatalogIds, deleteDuplicateProductIds, imageUpdates: imageUpdates.length }, null, 2));
    if (!apply) return;

    // Upload only source URLs not already present in the rehost map.
    let uploaded = 0; let uploadFailed = 0;
    for (const item of imageUpdates) {
      if (map[item.source]) { item.target = map[item.source]; continue; }
      try { map[item.source] = await rehost(item.source); item.target = map[item.source]; uploaded++; }
      catch (error) { uploadFailed++; console.warn(`image skip product=${item.productId} ${item.source}: ${error instanceof Error ? error.message : String(error)}`); }
    }
    await saveMap(map);

    await client.query("begin");
    if (missingCategories.size) {
      for (const [slug, meta] of missingCategories) {
        const parent = categories.find((c) => c.slug === meta.dept) ?? categories.find((c) => c.slug === "fashion");
        const inserted = await client.query<Category>(`insert into categories(slug,name,parent_id,sort) values($1,$2,$3,0) returning id::text,slug,name`, [slug, meta.name, parent?.id ?? null]);
        categories.push(inserted.rows[0]);
      }
      for (const product of products) {
        const linked = catalog.filter((row) => ownerAfter.get(row.id) === product.id);
        const expectedPid = pidFromSlug(product.slug);
        const canonical = linked.filter((row) => !expectedPid || pidFromCatalog(row) === expectedPid);
        if (canonical.length !== 1) continue;
        const slug = expectedCategorySlug(canonical[0]);
        const category = slug ? categories.find((c) => c.slug === slug) : null;
        if (category && category.id !== product.category_id) categoryUpdates.set(product.id, category.id);
      }
    }
    for (const move of identityMoves) await client.query(`update catalog_index set product_id=$2,updated_at=now() where id=$1`, [move.catalogId, move.to]);
    for (const catalogId of detachCatalogIds) await client.query(`update catalog_index set product_id=null,updated_at=now() where id=$1`, [catalogId]);
    for (const [productId, categoryId] of categoryUpdates) await client.query(`update products set category_id=$2 where id=$1`, [productId, categoryId]);
    for (const [productId, title] of titleUpdates) await client.query(`update products set name=$2 where id=$1`, [productId, title]);
    for (const productId of deleteDuplicateProductIds) await client.query(`update products set deleted_at=now() where id=$1`, [productId]);
    let imagesChanged = 0;
    for (const item of imageUpdates) {
      if (!map[item.source]) continue;
      const existing = await client.query<Image>(`select id::text from product_images where product_id=$1 and deleted_at is null and is_dummy=false order by sort,id limit 1`, [item.productId]);
      if (existing.rowCount) await client.query(`update product_images set url=$2,sort=0 where id=$1`, [existing.rows[0].id, map[item.source]]);
      else await client.query(`insert into product_images(product_id,url,sort,is_dummy) values($1,$2,0,false)`, [item.productId, map[item.source]]);
      imagesChanged++;
    }
    await client.query("commit");
    console.log(JSON.stringify({ identityMoved: identityMoves.length, categoriesChanged: categoryUpdates.size, titlesChanged: titleUpdates.size, detachedCatalogRows: detachCatalogIds.length, duplicateProductsDeleted: deleteDuplicateProductIds.length, imagesChanged, uploaded, uploadFailed }, null, 2));
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    throw error;
  } finally { await client.end(); }
}

main().catch((error) => { console.error(`CJ content repair failed: ${error instanceof Error ? error.message : String(error)}`); process.exit(1); });
