// Neon products.category_id 재매핑 — slug 기반으로 Neon categories id 맞추기
// 사용: node scripts/fix-neon-category-ids.mjs
import { config } from "dotenv";
config({ path: ".env.local" }); config();
import pg from "pg";
const N = (process.env.NEON_DATABASE_URL||"").trim();
if(!N){console.error("NEON_DATABASE_URL required");process.exit(1);}

async function main(){
  const n=new pg.Client({connectionString:N,ssl:{rejectUnauthorized:false}});
  await n.connect();

  // 1) Neon categories: slug -> id
  const cats=await n.query(`select id, slug from public."categories"`);
  const slugToId=new Map(cats.rows.map(r=>[r.slug,r.id]));
  console.log("Neon categories: "+cats.rows.length+"건");

  // 2) products 중 category_id가 잘못된 것 식별 (join 안 되는 것)
  const bad=await n.query(`
    select p.id as pid, p.slug as pslug, p.category_id as cid, c.slug as cslug
    from public."products" p
    left join public."categories" c on c.id=p.category_id
    where p.is_dummy=false and c.id is null`);
  console.log("잘못된 category_id: "+bad.rows.length+"건");

  // 3) 로컬에서 women 계열 products → 실제 카테고리 slug 매핑 (로컬 PG or 로컬 JSON)
  //    로컬 PG 기준
  const L="postgresql://lexi:sAEwmkYxPKkQ5mQdPkvKXx8hNg@127.0.0.1:5432/lexi";
  const l=new pg.Client({connectionString:L,ssl:false});
  await l.connect();
  const localRows=await l.query(`
    select p.slug, c.slug as cat_slug
    from public."products" p
    left join public."categories" c on c.id=p.category_id
    where p.is_dummy=false`);
  await l.end();

  // 4) Neon products 업데이트
  let ok=0, skip=0, fail=0;
  for(const row of localRows.rows){
    const catSlug=row.cat_slug;
    const neonCatId=catSlug?slugToId.get(catSlug):null;
    if(!neonCatId){skip++;continue;}
    try{
      await n.query(`update public."products" set category_id=$1 where slug=$2 and (category_id is null or category_id not in (select id from public."categories"))`,[neonCatId,row.slug]);
      ok++;
    }catch(e){fail++;if(fail<=3)console.error("  fail:",e.message.slice(0,100));}
  }
  console.log(`업데이트: ${ok}건 / 스킵(카테고리 없음): ${skip}건 / 실패: ${fail}건`);
  await n.end();
}
main().catch(e=>{console.error("FAIL",e);process.exit(1);});