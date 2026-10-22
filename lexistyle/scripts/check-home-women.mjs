// 홈용 women 상품 카운트 검증
import { config } from "dotenv";
config({ path: ".env.local" }); config();
import pg from "pg";
const U = process.env.DATABASE_URL || "";
(async () => {
  const c = new pg.Client({ connectionString: U, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`select c.slug, count(p.id) as n from products p join categories c on c.id=p.category_id where p.is_dummy=false and p.deleted_at is null and c.slug like 'women-%' group by c.slug order by c.slug`);
  let total = 0;
  for (const x of r.rows) { console.log(`${x.slug} = ${x.n}`); total += Number(x.n); }
  console.log(`TOTAL = ${total}`);
  await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });