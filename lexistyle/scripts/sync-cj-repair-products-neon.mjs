/** Push the CJ mapping repair rows by product id without category-id drift. */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
import pg from "pg";

const localUrl = process.env.DATABASE_URL?.trim();
const neonUrl = process.env.NEON_DATABASE_URL?.trim();
if (!localUrl || !neonUrl) throw new Error("DATABASE_URL and NEON_DATABASE_URL are required");
if (!["localhost", "127.0.0.1", "postgres"].includes(new URL(localUrl).hostname)) throw new Error("DATABASE_URL must be local");
const ids = [1, 23, 48, 96, 98, 101, 102, 105, 107, 117, 1297, 1299, 1301, 1307, 1309, 1398, 1399, 1400, 1401, 1402, 1403, 1404, 1405];
const local = new pg.Client({ connectionString: localUrl, ssl: false });
const neon = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: false } });
await local.connect(); await neon.connect();
try {
  const localCols = (await local.query(`select column_name from information_schema.columns where table_name='products' order by ordinal_position`)).rows.map((x) => x.column_name);
  const neonCols = new Set((await neon.query(`select column_name from information_schema.columns where table_name='products'`)).rows.map((x) => x.column_name));
  const cols = localCols.filter((x) => neonCols.has(x));
  const rows = (await local.query(`select p.*,c.slug category_slug from products p left join categories c on c.id=p.category_id where p.id=any($1::bigint[])`, [ids])).rows;
  const categoryBySlug = new Map((await neon.query(`select id::text,slug from categories`)).rows.map((x) => [x.slug, x.id]));
  const existingCategoryById = new Map((await neon.query(`select id::text,category_id::text from products where id=any($1::bigint[])`, [ids])).rows.map((x) => [x.id, x.category_id]));
  const desired = new Map(rows.map((r) => [r.slug, String(r.id)]));
  await neon.query("begin");
  // Free stale rows that currently own a desired slug before inserting/updating targets.
  const owners = (await neon.query(`select id::text,slug from products where slug=any($1::text[])`, [[...desired.keys()]])).rows;
  for (const owner of owners) {
    if (desired.get(owner.slug) === owner.id) continue;
    const temp = `__cj_reconcile_${owner.id}_${Date.now()}`;
    await neon.query(`update products set slug=$2,deleted_at=coalesce(deleted_at,now()) where id=$1`, [owner.id, temp]);
  }
  const insertCols = cols;
  const updateCols = cols.filter((x) => x !== "id");
  for (const row of rows) {
    const values = insertCols.map((col) => {
      if (col === "category_id") return row.category_slug ? categoryBySlug.get(row.category_slug) ?? existingCategoryById.get(String(row.id)) ?? null : existingCategoryById.get(String(row.id)) ?? null;
      return row[col];
    });
    const placeholders = insertCols.map((_, i) => `$${i + 1}`).join(",");
    const updates = updateCols.map((col) => `"${col}"=excluded."${col}"`).join(",");
    const override = insertCols.includes("id") ? " overriding system value" : "";
    await neon.query(`insert into products (${insertCols.map((c) => `"${c}"`).join(",")})${override} values (${placeholders}) on conflict (id) do update set ${updates}`, values);
  }
  await neon.query("commit");
  console.log(JSON.stringify({ rows: rows.length, ids: rows.map((r) => r.id), categoryMapped: rows.filter((r) => r.category_slug && categoryBySlug.has(r.category_slug)).length }, null, 2));
} catch (error) { try { await neon.query("rollback"); } catch {} throw error; }
finally { await local.end(); await neon.end(); }
