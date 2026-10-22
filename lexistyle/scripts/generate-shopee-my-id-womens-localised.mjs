/** Build Malay (MY) and Indonesian (ID) Shopee drafts from the SEA English package. */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = JSON.parse(fs.readFileSync(path.join(root, "docs/shopee-sea-womens-listing-drafts.json"), "utf8"));
const baseProducts = source.products.filter((p) => p.marketplace === "MY");
if (baseProducts.length !== 98) throw new Error(`Expected 98 MY source products, found ${baseProducts.length}`);

const common = [
  ["Women's", "Wanita"], ["Women’s", "Wanita"], ["Floral Print", "Motif Bunga"], ["Print", "Cetakan"],
  ["Chiffon", "Sifon"], ["Midi Dress", "Gaun Midi"], ["Mini Dress", "Gaun Mini"], ["Maxi Dress", "Gaun Maxi"],
  ["Dress", "Gaun"], ["Blouse", "Blus"], ["Shirt", "Kemeja"], ["Top", "Atasan"], ["Camisole", "Kamisol"],
  ["Cardigan", "Kardigan"], ["Sweater", "Sweater"], ["Knit", "Rajut"], ["Skirt", "Rok"], ["Pants", "Celana"],
  ["Trousers", "Celana"], ["Jacket", "Jaket"], ["Coat", "Mantel"], ["Blazer", "Blazer"], ["Vest", "Rompi"],
  ["Set", "Setelan"], ["Jumpsuit", "Jumpsuit"], ["Hoodie", "Hoodie"], ["Sweatshirt", "Sweatshirt"],
  ["Leggings", "Legging"], ["Shorts", "Celana Pendek"], ["Jeans", "Jeans"], ["Belt", "Ikat Pinggang"],
  ["Scarf", "Syal"], ["Gloves", "Sarung Tangan"], ["Hat", "Topi"], ["Necklace", "Kalung"], ["Bag", "Tas"],
  ["Two-Piece", "Dua Potong"], ["Long Sleeve", "Lengan Panjang"], ["Short Sleeve", "Lengan Pendek"],
];
const msWords = new Map(common.map(([a, b]) => [a, b]));
msWords.set("Dress", "Dress");
msWords.set("Skirt", "Skirt");
msWords.set("Pants", "Seluar");
msWords.set("Trousers", "Seluar");
msWords.set("Top", "Baju Atasan");
msWords.set("Blouse", "Blaus");
msWords.set("Coat", "Kot");
const idWords = new Map([
  ["Women's", "Wanita"], ["Women’s", "Wanita"], ["Floral Print", "Motif Bunga"], ["Print", "Motif"],
  ["Chiffon", "Sifon"], ["Midi Dress", "Gaun Midi"], ["Mini Dress", "Gaun Mini"], ["Maxi Dress", "Gaun Maxi"],
  ["Dress", "Gaun"], ["Blouse", "Blus"], ["Shirt", "Kemeja"], ["Top", "Atasan"], ["Camisole", "Kamisol"],
  ["Cardigan", "Kardigan"], ["Sweater", "Sweater"], ["Knit", "Rajut"], ["Skirt", "Rok"], ["Pants", "Celana"],
  ["Trousers", "Celana Panjang"], ["Jacket", "Jaket"], ["Coat", "Mantel"], ["Blazer", "Blazer"], ["Vest", "Rompi"],
  ["Set", "Setelan"], ["Jumpsuit", "Jumpsuit"], ["Hoodie", "Hoodie"], ["Sweatshirt", "Sweatshirt"],
  ["Leggings", "Legging"], ["Shorts", "Celana Pendek"], ["Jeans", "Jeans"], ["Belt", "Ikat Pinggang"],
  ["Scarf", "Syal"], ["Gloves", "Sarung Tangan"], ["Hat", "Topi"], ["Necklace", "Kalung"], ["Bag", "Tas"],
  ["Two-Piece", "Dua Potong"], ["Long Sleeve", "Lengan Panjang"], ["Short Sleeve", "Lengan Pendek"],
]);
function localiseTitle(title, words, prefix) {
  let out = title;
  for (const [from, to] of words) out = out.replaceAll(from, to);
  return `${prefix} ${out}`.replace(/\s+/g, " ").trim().slice(0, 120);
}
function buildCopy(base, language) {
  const isMs = language === "ms-MY";
  const words = isMs ? [...msWords.entries()] : [...idWords.entries()];
  const title = localiseTitle(base.source.titleInternal, words, isMs ? "LEXI Wanita" : "LEXI Wanita");
  const category = isMs ? "fesyen wanita" : "fesyen wanita";
  const bullets = isMs
    ? [
        `Siluet ${category} yang mudah digayakan setiap hari.`,
        "Reka bentuk mengikut nama produk; semak gambar dan variasi yang dipilih sebelum membeli.",
        "Rujuk carta ukuran penjual sebelum membuat pesanan.",
        "Warna, bahan dan arahan penjagaan hanya disahkan selepas variasi sumber disemak.",
        "Sila periksa foto produk dan pilihan variasi untuk item sebenar.",
      ]
    : [
        `Siluet ${category} yang mudah dipadukan untuk gaya harian.`,
        "Desain mengikuti nama produk; periksa foto dan varian yang dipilih sebelum membeli.",
        "Lihat tabel ukuran penjual sebelum memesan.",
        "Warna, bahan, dan perawatan hanya dikonfirmasi setelah varian sumber diverifikasi.",
        "Periksa foto produk dan pilihan varian untuk item yang dikirim.",
      ];
  const description = isMs
    ? `Produk ${base.source.titleInternal.toLowerCase()} disediakan untuk koleksi fesyen wanita LEXI. Ini ialah draf Shopee ${language}; warna, binaan, bahan, penjagaan dan item yang termasuk mesti sepadan dengan rekod pembekal yang disahkan sebelum diterbitkan.`
    : `Produk ${base.source.titleInternal.toLowerCase()} disiapkan untuk koleksi fesyen wanita LEXI. Ini adalah draf Shopee ${language}; warna, konstruksi, bahan, perawatan, dan isi paket harus sesuai dengan data pemasok yang telah diverifikasi sebelum diterbitkan.`;
  const searchTerms = isMs ? ["fesyen wanita", "pakaian wanita", "LEXI", "gaya harian"] : ["fesyen wanita", "pakaian wanita", "LEXI", "gaya sehari-hari"];
  return { itemName: title, bullets, description, searchTerms };
}

const drafts = [];
for (const base of baseProducts) {
  for (const cfg of [
    { market: "MY", currency: "MYR", locale: "ms-MY", language: "Malay", rateFromMyr: 1 },
    { market: "ID", currency: "IDR", locale: "id-ID", language: "Indonesian", rateFromMyr: 16000 / 4.7 },
  ]) {
    const copy = buildCopy(base, cfg.locale);
    drafts.push({
      draftId: `SHOPEE-${cfg.market}-${base.skuSeed}`,
      marketplace: cfg.market,
      currency: cfg.currency,
      locale: cfg.locale,
      language: cfg.language,
      status: "CONCEPT",
      skuSeed: base.skuSeed,
      source: base.source,
      listing: { ...copy, suggestedPrice: cfg.currency === "IDR" ? Math.round(base.listing.suggestedPrice * cfg.rateFromMyr) : base.listing.suggestedPrice, stock: null, itemStatus: "NORMAL" },
      variations: { theme: "SIZE/COLOR", values: [], status: "UNVERIFIED", note: "Isi hanya berdasarkan varian dan tabel ukuran pemasok yang diverifikasi." },
      shipping: { logisticId: null, status: "UNVERIFIED", note: "Pilih saluran logistik Shopee yang aktif untuk pasaran ini." },
      category: { categoryId: null, status: "UNVERIFIED", note: "Semak kategori fesyen tempatan melalui metadata Shopee." },
      images: base.images,
      gates: { sourceMatch: "BLOCKED", category: "BLOCKED", logistics: "BLOCKED", validationPreview: "NOT_RUN", liveListing: "NOT_RUN" },
    });
  }
}

const output = { version: 1, generatedAt: new Date().toISOString(), channel: "shopee", markets: ["MY", "ID"], products: drafts, status: "CONCEPT" };
const jsonPath = path.join(root, "docs/shopee-my-id-womens-localised-drafts.json");
fs.writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const cards = drafts.map((p) => `<article><p class="status">${p.marketplace} · ${p.locale} · CONCEPT</p><h2>${esc(p.listing.itemName)}</h2><p>${esc(p.listing.description)}</p><ul>${p.listing.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul><p class="meta">${esc(p.currency)} ${p.listing.suggestedPrice} · ${esc(p.source.categoryPath.join(" / "))} · Category/logistics: verify</p></article>`).join("\n");
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LEXI Shopee MY ID Localised Women's Drafts</title><style>body{margin:0;background:#f5f2ed;color:#202020;font:15px/1.6 Arial,sans-serif}main{max-width:960px;margin:auto;padding:28px 18px}article{background:#fff;margin:0 0 14px;padding:20px;border-radius:12px;box-shadow:0 2px 10px #0001}h1{font-size:30px}h2{font-size:19px;margin:4px 0 10px}.status{color:#bd503e;font-size:11px;font-weight:700;letter-spacing:.08em}.meta{color:#666;font-size:12px;border-top:1px solid #eee;padding-top:10px}</style><main><h1>LEXI · Shopee Malay &amp; Indonesian Women's Pages</h1><p>98 Malay listings for Malaysia and 98 Indonesian listings for Indonesia. All drafts require source, category, logistics, variant and stock verification.</p>${cards}</main></html>`;
const htmlPath = path.join(root, "public/pdp-preview/shopee-my-id-womens-localised.html");
fs.writeFileSync(htmlPath, html);
console.log(JSON.stringify({ products: drafts.length, byMarket: { MY: 98, ID: 98 }, json: path.relative(root, jsonPath), preview: path.relative(root, htmlPath) }));
