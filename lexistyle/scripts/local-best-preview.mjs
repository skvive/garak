import "dotenv/config";
import http from "node:http";
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const { rows } = await client.query(`
  select p.slug, p.name, p.price_usd as price, coalesce(b.name, 'LEXI') as brand,
         (select pi.url from product_images pi where pi.product_id=p.id order by pi.sort limit 1) as image
  from export_shelf es
  join catalog_index c on c.id=es.catalog_id and c.document_id=es.document_id
  join products p on p.id=c.product_id
  left join brands b on b.id=p.brand_id
  where es.stage='shelf' and es.channels_desired @> array['amazon_au']::text[]
    and p.deleted_at is null and p.is_dummy=false
  order by es.updated_at desc
  limit 30
`);
await client.end();

const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const cards = rows.map((p, i) => `<a class="card" href="http://localhost:3010/ko/product/${encodeURIComponent(p.slug)}" target="_blank"><i>${String(i+1).padStart(2,"0")}</i><img src="${esc(p.image)}"><div><strong>${esc(p.name)}</strong><span>${esc(p.brand)}</span><b>$${Number(p.price).toFixed(2)}</b></div></a>`).join("");
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LEXI Local Best</title><style>*{box-sizing:border-box}body{margin:0;background:#faf9f7;color:#1a1a1a;font-family:Arial,sans-serif}header{position:sticky;top:0;z-index:2;background:#faf9f7ee;padding:22px 5vw;border-bottom:1px solid #e8e4dc}h1{margin:0;font:600 30px Georgia,serif}p{margin:6px 0;color:#6e6e73}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:28px 14px;padding:24px 5vw 60px}@media(min-width:900px){.grid{grid-template-columns:repeat(4,1fr);gap:36px 18px}}.card{position:relative;color:inherit;text-decoration:none}.card img{width:100%;aspect-ratio:4/5;object-fit:cover;background:#ebe6dc}.card i{position:absolute;top:9px;left:9px;background:#1a1a1a;color:#fff;padding:5px 7px;font:11px Arial}.card div{display:grid;gap:4px;padding-top:9px}.card strong{font-size:14px}.card span{font-size:11px;color:#6e6e73}.card b{font-size:13px}</style></head><body><header><h1>Best</h1><p>Amazon AU 준비 완료 · SAMPLE3 상품 ${rows.length}개</p></header><main class="grid">${cards}</main></body></html>`;
http.createServer((_req,res)=>{res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});res.end(html)}).listen(3020,"127.0.0.1",()=>console.log("http://localhost:3020"));
