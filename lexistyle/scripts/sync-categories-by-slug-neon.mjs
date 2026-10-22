/** Keep category identity stable across local/Neon databases (slug is the natural key). */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
import pg from "pg";

const localUrl = process.env.DATABASE_URL?.trim();
const neonUrl = process.env.NEON_DATABASE_URL?.trim();
if (!localUrl || !neonUrl) throw new Error("DATABASE_URL and NEON_DATABASE_URL are required");
if (!['localhost', '127.0.0.1', 'postgres'].includes(new URL(localUrl).hostname)) throw new Error("DATABASE_URL must be local");

const local = new pg.Client({ connectionString: localUrl, ssl: false });
const neon = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: false } });
await local.connect(); await neon.connect();
try {
  const categories = (await local.query(`select id::text,slug,name,parent_id::text,sort from categories order by id`)).rows;
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const byId = new Map(categories.map((c) => [c.id, c]));
  await neon.query("begin");
  const neonBySlug = new Map((await neon.query(`select id::text,slug from categories`)).rows.map((c) => [c.slug, c.id]));
  // Parents first; repeat until every row has a resolvable parent.
  const pending = [...categories];
  while (pending.length) {
    let progressed = false;
    for (let i = pending.length - 1; i >= 0; i--) {
      const row = pending[i];
      // local parent_id is a numeric category id; resolve it before looking up
      // the matching Neon id by slug. Treat roots (null parent_id) as roots.
      const parentSlug = row.parent_id ? byId.get(String(row.parent_id))?.slug : null;
      // A few legacy category rows point to deleted parents; keep them root-level
      // rather than blocking the full slug reconciliation.
      const parentId = parentSlug ? neonBySlug.get(parentSlug) : null;
      const existing = neonBySlug.get(row.slug);
      if (existing) {
        await neon.query(`update categories set name=$2,parent_id=$3,sort=$4 where id=$1`, [existing, row.name, parentId, row.sort ?? 0]);
      } else {
        const inserted = await neon.query(`insert into categories(slug,name,parent_id,sort) values($1,$2,$3,$4) returning id::text`, [row.slug, row.name, parentId, row.sort ?? 0]);
        neonBySlug.set(row.slug, inserted.rows[0].id);
      }
      pending.splice(i, 1); progressed = true;
    }
    if (!progressed) throw new Error(`unresolved category parents: ${pending.map((x) => x.slug).join(', ')}`);
  }
  const products = (await local.query(`select p.slug,c.slug category_slug from products p left join categories c on c.id=p.category_id where p.deleted_at is null`)).rows;
  let updated = 0; let skipped = 0;
  for (const product of products) {
    const neonCategoryId = product.category_slug ? neonBySlug.get(product.category_slug) : null;
    if (!neonCategoryId) { skipped++; continue; }
    const result = await neon.query(`update products set category_id=$2 where slug=$1`, [product.slug, neonCategoryId]);
    updated += result.rowCount ?? 0;
  }
  await neon.query("commit");
  const check = await neon.query(`select p.id,p.slug,c.slug category,c.name category_name from products p left join categories c on c.id=p.category_id where p.slug='american-style-vintage-work-pants-for-men-and-wo-2092182066408239106'`);
  console.log(JSON.stringify({ categoriesSynced: categories.length, productsUpdated: updated, productsSkipped: skipped, check: check.rows }, null, 2));
} catch (error) { try { await neon.query("rollback"); } catch {} throw error; }
finally { await local.end(); await neon.end(); }
