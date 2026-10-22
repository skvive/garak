// Neon 여성의류 40개 상품 이미지 복구 — slug 기반 매핑
// 로컬 PG(products+product_images)의 slug→이미지 목록 → Neon products(slug) id → product_images 갱신
import { config } from "dotenv";
config({ path: ".env.local" }); config();
import pg from "pg";

const L = "postgresql://lexi:sAEwmkYxPKkQ5mQdPkvKXx8hNg@127.0.0.1:5432/lexi";
const N = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || "";

async function main() {
  const l = new pg.Client({ connectionString: L, ssl: false });
  const n = new pg.Client({ connectionString: N, ssl: { rejectUnauthorized: false } });
  await l.connect(); await n.connect();

  // 1) 로컬 PG: women 상품 slug → 이미지 url 목록
  const localRows = await l.query(`
    select p.slug, pi.url, pi.sort
    from products p
    join categories c on c.id = p.category_id
    join product_images pi on pi.product_id = p.id
    where p.is_dummy = false and c.slug like 'women-%'
    order by p.slug, pi.sort, pi.id`);
  console.log(`로컬 women 이미지 행: ${localRows.rows.length}`);

  const bySlug = new Map();
  for (const x of localRows.rows) {
    if (!bySlug.has(x.slug)) bySlug.set(x.slug, []);
    bySlug.get(x.slug).push({ url: x.url, sort: Number(x.sort || 0) });
  }
  console.log(`로컬 women 슬러그 수: ${bySlug.size}`);

  // 2) Neon: women 상품 slug → id
  const neonRows = await n.query(`
    select p.id, p.slug from products p
    join categories c on c.id = p.category_id
    where p.is_dummy = false and c.slug like 'women-%'`);
  console.log(`Neon women 상품: ${neonRows.rows.length}`);
  const idBySlug = new Map(neonRows.rows.map((x) => [x.slug, x.id]));

  // 3) 매칭되지 않는 slug 확인
  const matched = neonRows.rows.filter((x) => bySlug.has(x.slug)).length;
  console.log(`slug 매칭: ${matched} / ${neonRows.rows.length}`);

  // 4) Neon product_images 재삽입 (delete + insert)
  let imgOk = 0, imgFail = 0, prodOk = 0;
  for (const [slug, imgs] of bySlug) {
    const pid = idBySlug.get(slug);
    if (!pid) { continue; }
    try {
      await n.query(`delete from public."product_images" where product_id=$1`, [pid]);
      for (const im of imgs) {
        await n.query(`insert into public."product_images"(product_id,url,sort,is_dummy) values($1,$2,$3,false)`, [pid, im.url, im.sort]);
        imgOk++;
      }
      prodOk++;
    } catch (e) {
      imgFail++;
      if (imgFail <= 5) console.error(`  ✗ ${slug}: ${e.message.slice(0, 100)}`);
    }
  }
  console.log(`완료: 상품 ${prodOk}개 / 이미지 ${imgOk}행 / 실패 ${imgFail}`);

  await l.end(); await n.end();
}
main().catch((e) => { console.error("FAIL", e); process.exit(1); });