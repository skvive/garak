// 로컬 PG women 40개 상품의 대표 이미지 유무 점검
import { config } from "dotenv";
config({ path: ".env.local" }); config();
import pg from "pg";
const L = "postgresql://lexi:sAEwmkYxPKkQ5mQdPkvKXx8hNg@127.0.0.1:5432/lexi";
(async () => {
  const l = new pg.Client({ connectionString: L, ssl: false });
  await l.connect();
  const r = await l.query(`
    select p.id, p.slug, p.name, pi.url
    from products p
    join categories c on c.id = p.category_id
    left join LATERAL (
      select pi2.url from product_images pi2 where pi2.product_id = p.id order by pi2.sort, pi2.id limit 1
    ) pi on true
    where p.is_dummy = false and c.slug like 'women-%'
    order by p.id`);
  const nulls = r.rows.filter((x) => !x.url).length;
  const urls = new Set(r.rows.map((x) => x.url).filter(Boolean));
  console.log(`로컬 PG women 상품: ${r.rows.length} / 이미지 NULL: ${nulls} / 고유 URL: ${urls.size}`);
  for (const x of r.rows.filter((x) => !x.url)) console.log(`  NULL → id=${x.id} ${x.name}`);
  // 로컬 catalog_index의 primary_thumb_url 폴백 후보
  const cat = await l.query(`select count(*) as n from catalog_index where primary_thumb_url is not null`);
  console.log(`catalog_index thumb 보유: ${cat.rows[0].n}`);
  await l.end();
})().catch((e) => { console.error(e.message); process.exit(1); });