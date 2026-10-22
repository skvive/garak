import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import http from "node:http";
import { listBestProductsPage } from "../src/lib/catalog";

const port = 3020;

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]!));

http.createServer(async (_req, res) => {
  try {
    const page = await listBestProductsPage({ page: 1, pageSize: 40 });
    const products = page.items.slice(0, 30);
    const cards = products.map((product, index) => `
      <a class="card" href="http://localhost:3010/ko/product/${encodeURIComponent(product.slug)}" target="_blank">
        <div class="rank">${String(index + 1).padStart(2, "0")}</div>
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" />
        <div class="copy"><strong>${escapeHtml(product.name)}</strong><span>${escapeHtml(product.brand)}</span><b>$${product.price.toFixed(2)}</b></div>
      </a>`).join("");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LEXI Local Best</title><style>
      *{box-sizing:border-box}body{margin:0;background:#faf9f7;color:#1a1a1a;font-family:Pretendard,Arial,sans-serif}.head{position:sticky;top:0;z-index:2;background:rgba(250,249,247,.94);backdrop-filter:blur(12px);padding:24px 5vw 18px;border-bottom:1px solid #e8e4dc}.head h1{margin:0;font:600 30px Georgia,serif}.head p{margin:6px 0 0;color:#6e6e73}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px 14px;padding:24px 5vw 60px}@media(min-width:900px){.grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:36px 18px}}.card{position:relative;color:inherit;text-decoration:none}.card img{display:block;width:100%;aspect-ratio:4/5;object-fit:cover;background:#ebe6dc}.rank{position:absolute;top:10px;left:10px;background:#1a1a1a;color:white;padding:5px 7px;font-size:11px;letter-spacing:.08em}.copy{display:grid;gap:4px;padding-top:10px}.copy strong{font-size:14px;line-height:1.4}.copy span{font-size:11px;color:#6e6e73}.copy b{font-size:13px}.note{padding:0 5vw 26px;color:#6e6e73;font-size:12px}
    </style></head><body><header class="head"><h1>Best</h1><p>Amazon AU 준비 완료 · SAMPLE3 상품 30개</p></header><main class="grid">${cards}</main><p class="note">로컬 DB 미리보기 · 카드를 누르면 정식 로컬 상품 상세페이지가 열립니다.</p></body></html>`);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(error instanceof Error ? error.stack : String(error));
  }
}).listen(port, "127.0.0.1", () => console.log(`LEXI local best preview: http://localhost:${port}`));
