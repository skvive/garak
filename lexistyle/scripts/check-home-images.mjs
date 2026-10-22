// 홈 40개 상품의 이미지 URL 중복 점검
import { config } from "dotenv";
config({ path: ".env.local" }); config();
import pg from "pg";
const U = process.env.DATABASE_URL || "";
(async () => {
  const c = new pg.Client({ connectionString: U, ssl: { rejectUnauthorized: false } });
  await c.connect();
  // women 상품별 대표 이미지
  const r = await c.query(`
    select p.id, p.slug, left(p.name, 34) as name, pi.url
    from products p
    join categories c on c.id = p.category_id
    left join LATERAL (
      select pi2.url from product_images pi2
      where pi2.product_id = p.id
      order by pi2.sort, pi2.id
      limit 1
    ) pi on true
    where p.is_dummy = false and c.slug like 'women-%'
    order by p.id`);
  // URL별 카운트
  const byUrl = new Map();
  for (const x of r.rows) {
    const u = x.url || "(null)";
    byUrl.set(u, (byUrl.get(u) || 0) + 1);
  }
  console.log("=== URL 중복 현황 (상위 10) ===");
  const top = [...byUrl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [u, n] of top) console.log(`${String(n).padStart(2)}x  ${u}`);
  console.log(`\n총 상품: ${r.rows.length} / 고유 URL: ${byUrl.size}`);
  console.log("\n=== 첫 10개 상품 목록 ===");
  for (const x of r.rows.slice(0, 10)) console.log(`id=${String(x.id).padStart(3)} ${String(x.name).padEnd(36)} ${(x.url||"(null)").slice(0,80)}`);
  await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });