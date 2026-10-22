// 로컬 PG 스토어프론트 -> Neon 동기화 (brands, categories, products, product_images, site_settings)
import { config } from "dotenv";
config({ path: ".env.local" }); config();
import pg from "pg";

const L = (process.env.DATABASE_URL||"").trim()||"postgresql://lexi:sAEwmkYxPKkQ5mQdPkvKXx8hNg@127.0.0.1:5432/lexi";
const N = (process.env.NEON_DATABASE_URL||"").trim();
if(!N){console.error("NEON_DATABASE_URL required");process.exit(1);}

const U = {brands:["slug"],categories:["slug"],products:["slug"],site_settings:["key"]}; // upsert 키

async function main(){
  const l=new pg.Client({connectionString:L,ssl:false});
  const n=new pg.Client({connectionString:N,ssl:{rejectUnauthorized:false}});
  await l.connect(); await n.connect();

  // identity 컬럼 확인
  const idcAll=new Map();
  for(const t of[...Object.keys(U),"product_images"]){
    const r=await n.query(`select column_name from information_schema.columns where table_schema='public' and table_name=$1 and is_identity='YES'`,[t]);
    idcAll.set(t,new Set(r.rows.map(x=>x.column_name)));
  }

  // 1) upsert 테이블 (brands, categories, products, site_settings)
  for(const[t,cf] of Object.entries(U)){
    const lc=(await l.query(`select column_name from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position`,[t])).rows.map(r=>r.column_name);
    const nc=new Set((await n.query(`select column_name from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position`,[t])).rows.map(r=>r.column_name));
    const idc=idcAll.get(t)||new Set();
    const cols=lc.filter(c=>nc.has(c)&&!idc.has(c)); // identity 제외
    if(!cols.length){console.log("skip "+t+": no cols");continue;}
    const rows=(await l.query(`select ${lc.map(c=>'"'+c+'"').join(",")} from public."${t}"`)).rows;
    if(!rows.length){console.log(t+": 0 rows");continue;}
    const cs=cols.map(c=>'"'+c+'"').join(","), ph=cols.map((_,i)=>`$${i+1}`).join(",");
    const cfj=cf.map(c=>'"'+c+'"').join(",");
    const up=cols.filter(c=>!cf.includes(c)).map(c=>`"${c}"=excluded."${c}"`).join(",");
    const sql=`insert into public."${t}" (${cs}) values (${ph}) on conflict (${cfj}) do update set ${up}`;
    let ok=0,fail=0;
    for(const r of rows){try{await n.query(sql,cols.map(c=>r[c]));ok++;}catch(e){fail++;if(fail<=3)console.error("  "+t+":",(e.message||"").slice(0,80));}}
    console.log(t+": synced="+ok+" fail="+fail+" /"+rows.length);
  }

  // 2) product_images: DELETE + INSERT (no unique constraint)
  const piCols=(await l.query(`select column_name from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position`,"product_images")).rows.map(r=>r.column_name);
  const piIdc=idcAll.get("product_images")||new Set();
  const piInsCols=piCols.filter(c=>!piIdc.has(c));
  const piRows=(await l.query(`select ${piCols.map(c=>'"'+c+'"').join(",")} from public."product_images"`)).rows;
  if(piRows.length){
    // product별 grouping
    const byProd=new Map();
    for(const r of piRows){
      const pid=r.product_id;
      if(!byProd.has(pid))byProd.set(pid,[]);
      byProd.get(pid).push(r);
    }
    const cs=piInsCols.map(c=>'"'+c+'"').join(","), ph=piInsCols.map((_,i)=>`$${i+1}`).join(",");
    let ok=0,fail=0;
    for(const[pid,prs] of byProd){
      try{await n.query(`delete from public."product_images" where product_id=$1`,[pid]);}catch(e){fail++;console.error("  del fail:",e.message.slice(0,80));continue;}
      for(const r of prs){
        try{await n.query(`insert into public."product_images" (${cs}) values (${ph})`,piInsCols.map(c=>r[c]));ok++;}catch(e){fail++;if(fail<=3)console.error("  ins fail:",(e.message||"").slice(0,80));}
      }
    }
    console.log("product_images: synced="+ok+" fail="+fail+" /"+piRows.length+" rows in "+byProd.size+" products");
  } else {
    console.log("product_images: 0 rows");
  }

  await l.end();await n.end();
}
main().catch(e=>{console.error("FAIL",e);process.exit(1);});