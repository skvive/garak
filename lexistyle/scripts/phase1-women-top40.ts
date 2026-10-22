// Phase 1: 여성의류 판매량 상위 40개 진열 (CJ 썸네일 + 가격공식)
import { config } from "dotenv"; config({ path: ".env.local" }); config({ path: ".env" });
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path"; import os from "os";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { brands, categories, catalogIndex, productImages, products } from "../src/db/schema";
import { computeLexiSellUsd } from "../src/lib/pricing/lexi-sell";

const DD = process.env.LOCAL_DATA_DIR || path.join(os.homedir(),".lexi-local","data");
const SP = path.join(DD,"lexi-local.json"), OD = path.join(DD,"phase1-women-top40");

function sfy(t:string,e:string){const b=t.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48);return `${b||"item"}-${e}`.slice(0,72);}

function mC(lf:string):string{
  const l=lf.toLowerCase();
  if(/dress/i.test(l))return"women-dresses";
  if(/blouse|shirt|top|camis|tube/i.test(l))return"women-tops";
  if(/skirt/i.test(l))return"women-skirts";
  if(/pant|jean|legging|capri|shorts/i.test(l))return"women-pants";
  if(/jacket|coat|blazer|outer|sweater|hoodie|sweatshirt/i.test(l))return"women-outerwear";
  if(/knit|sweater|cardigan/i.test(l))return"women-knitwear";
  if(/suit|set/i.test(l))return"women-suits";
  if(/bikini|swim/i.test(l))return"women-swimwear";
  if(/bra|lingerie|underwear/i.test(l))return"women-underwear";
  if(/boot|shoe|sandal|slipper|pump|flat/i.test(l))return"women-shoes";
  if(/bag|tote|clutch|backpack|crossbody/i.test(l))return"women-bags";
  return"women-clothing";
}
const WCJP = new Set(["Lady Dresses","Blouses & Shirts","Wide Leg Pants","Blazers","Skirts","Sweaters","Basic Jacket","Suits & Sets","Women's Long-Sleeved Shirts","Women's Short-Sleeved Shirts","Women's Tube Tops","Women's Camis","Rompers","Leggings","Pants & Capris","Women's Outerwear","Bras","Woman Hoodies & Sweatshirts","Woman Shorts","Woman Boots","Pumps","Flats","Woman Sandals","Woman Slippers"]);

function load(){
  const s=JSON.parse(readFileSync(SP,"utf8"));
  const cat=(s.catalog??[])as Record<string,unknown>[];
  return cat.filter(r=>{const p=Array.isArray(r.categoryPath)?(r.categoryPath as string[]):typeof r.categoryPath=="string"?[r.categoryPath as string]:[];return WCJP.has(p[0]??"")&&String(r.sourceStatus??"")!=="gone";})
    .sort((a,b)=>(Number((b.rawMeta as Record<string,unknown>|undefined)?.listedNum??0))-(Number((a.rawMeta as Record<string,unknown>|undefined)?.listedNum??0)))
    .slice(0,40).map(r=>{const rm=r.rawMeta as Record<string,unknown>|undefined;const p=Array.isArray(r.categoryPath)?(r.categoryPath as string[]):typeof r.categoryPath=="string"?[r.categoryPath as string]:[];return{cid:Number(r.id),eid:String(r.externalId??""),title:String(r.title??""),cost:Number(r.minPrice??0),thumb:(r.primaryThumbUrl as string|null)??null,listed:Number(rm?.listedNum??0),slug:sfy(String(r.title??""),String(r.externalId??"")),price:computeLexiSellUsd(Number(r.minPrice??0)),lcat:mC(p[0]??""),hp:false};});
}

async function main(){
  const dry=process.argv.includes("--dry");
  const plans=load();
  console.log(`\n=== 여성의류 판매량 상위 ${plans.length}개 ===`);
  // 진열 상태 확인 (로컬 JSON의 productId)
  const ls=JSON.parse(readFileSync(SP,"utf8"));
  const pm=new Map<number,number>();
  for(const r of(ls.catalog??[])as Record<string,unknown>[]){const pid=r.productId as number|null;if(pid!=null)pm.set(Number(r.id),pid);}
  for(const p of plans)p.hp=pm.has(p.cid);
  let ec=0;
  for(const p of plans){if(p.hp)ec++;console.log(`  cat=${String(p.cid).padStart(5)}|${String(p.listed).padStart(3)}건|${p.hp?"✅진열완료":"🔲신규"}|${p.title.slice(0,34).padEnd(35)}|$${p.price.toFixed(2)}|${p.lcat}`);}
  console.log(`\n✅ 기진열: ${ec}건|🔲 신규: ${plans.length-ec}건|총: ${plans.length}건`);
  if(dry){console.log("--dry 종료");return;}

  process.env.DATABASE_URL="postgresql://lexi:sAEwmkYxPKkQ5mQdPkvKXx8hNg@127.0.0.1:5432/lexi";
  const d=db();
  let[b]=await d.select().from(brands).where(eq(brands.slug,"lexi-sourced")).limit(1);
  if(!b)[b]=await d.insert(brands).values({slug:"lexi-sourced",name:"LEXI Sourced"}).returning();
  const bid=b.id as number;

  // DB에 이미 존재하는 slug 확인
  const existingSlugMap=new Map<string,number>();
  try{const ep=await d.select({slug:products.slug,id:products.id}).from(products).limit(9999);for(const p of ep)if(p.slug&&p.id)existingSlugMap.set(p.slug,p.id);}catch(e){console.error("  ⚠ slug 조회 실패:",e instanceof Error?e.message:String(e));}

  const cc=new Map<string,number>();
  const nm:Record<string,string>={"women-clothing":"여성의류","women-dresses":"원피스","women-tops":"상의","women-skirts":"스커트","women-pants":"바지","women-outerwear":"아우터","women-knitwear":"니트","women-suits":"수트/세트","women-swimwear":"수영복","women-underwear":"속옷","women-socks":"양말","women-shoes":"신발","women-bags":"가방","women-accessories":"악세서리","women-loungewear":"홈웨어","women-rompers":"점프수트"};
  async function gc(s:string){if(!cc.has(s)){let[c]=await d.select().from(categories).where(eq(categories.slug,s)).limit(1);if(!c)[c]=await d.insert(categories).values({slug:s,name:nm[s]??s}).returning();cc.set(s,c.id as number);}return cc.get(s)!;}

  if(!existsSync(OD))mkdirSync(OD,{recursive:true});
  const res:Record<string,unknown>[]=[];

  for(const p of plans){
    const catId=await gc(p.lcat);
    const existingDbId=existingSlugMap.get(p.slug);
    if(p.hp||existingDbId){
      const pid=p.hp?pm.get(p.cid)!:existingDbId!;
      try{
        await d.update(products).set({priceUsd:String(p.price),deletedAt:null,categoryId:catId}).where(eq(products.id,pid));
        if(p.thumb){await d.delete(productImages).where(eq(productImages.productId,pid));await d.insert(productImages).values({productId:pid,url:p.thumb,sort:0,isDummy:false});}
        const tag=existingDbId?"(slug기존)":"(기존)";
        console.log(`  ✓ cat=${p.cid}→prod=${pid} ${tag} 가격업데이트 $${p.price.toFixed(2)}`);
        res.push({catalogId:p.cid,action:"update",productId:pid,priceUsd:p.price});
      }catch(e){console.error(`  ✗ cat=${p.cid} 실패: ${e instanceof Error?e.message:String(e)}`);}
      continue;
    }
    try{
      const[i]=await d.insert(products).values({slug:p.slug,brandId:bid,categoryId:catId,name:p.title,description:p.title,priceUsd:String(p.price),stock:10,isDummy:false,discountRate:0,ratingAvg:"4.5",reviewCount:Math.max(p.listed*3,5)}).returning({id:products.id});
      if(p.thumb)await d.insert(productImages).values({productId:i.id,url:p.thumb,sort:0,isDummy:false});
      console.log(`  ✓ cat=${p.cid}→prod=${i.id} 신규진열 $${p.price.toFixed(2)}`);
      res.push({catalogId:p.cid,action:"create",productId:i.id,priceUsd:p.price});
    }catch(e){console.error(`  ✗ cat=${p.cid} 실패: ${e instanceof Error?e.message:String(e)}`);}
  }

  writeFileSync(path.join(OD,"phase1-result.json"),JSON.stringify({completedAt:new Date().toISOString(),results:res},null,2),"utf-8");
  console.log(`\n=== Phase 1 완료: 신규 ${res.filter(r=>r.action==="create").length}건|업데이트 ${res.filter(r=>r.action==="update").length}건 ===`);
}

main().catch(e=>{console.error("❌",e);process.exit(1);});