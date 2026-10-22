// Neon 상품 카테고리 현황 확인
import { config } from "dotenv";
config({ path: ".env.local" }); config();
import pg from "pg";
const N = process.env.NEON_DATABASE_URL || "";
(async () => {
  const c = new pg.Client({ connectionString: N, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`select c.slug, count(p.id) as n from products p join categories c on c.id=p.category_id where p.is_dummy=false group by c.slug order by c.slug`);
  for (const row of r.rows) console.log(`${row.slug} = ${row.n}`);
  await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });