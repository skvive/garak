import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
import { mkdir, writeFile } from "node:fs/promises";

const BASE = "https://developers.cjdropshipping.com/api2.0/v1";
const SKUS = [
  "CJYD1910916", "CJMY1224717", "CJJJCWMY00727", "CJYD3233379", "CJYD3073532",
  "CJXZ1914107", "CJYD1876114", "CJJT1723382", "CJMY2563890", "CJWY2812113",
  "CJJK1139730", "CJQB1322244", "CJQB1562100", "CJWY3206345", "CJXZ3183638",
  "CJYH1178713", "CJMY3060348", "CJYD3060906", "CJLS3061165", "CJLY3062288",
  "CJLY3064619",
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  if (!process.env.CJ_API_EMAIL || !process.env.CJ_API_KEY) throw new Error("CJ API credentials missing");
  const auth = await fetch(`${BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: process.env.CJ_API_EMAIL, password: process.env.CJ_API_KEY }),
  }).then((response) => response.json()) as { data?: { accessToken?: string }; message?: string };
  const token = auth.data?.accessToken;
  if (!token) throw new Error(auth.message ?? "CJ authentication failed");
  const headers = { "CJ-Access-Token": token };
  const out: Record<string, unknown>[] = [];
  await mkdir("tmp/coupang/added-products", { recursive: true });
  for (const [index, sku] of SKUS.entries()) {
    if (index) await wait(1100);
    const listed = await fetch(`${BASE}/product/list?pageNum=1&pageSize=1&productSku=${encodeURIComponent(sku)}`, { headers })
      .then((response) => response.json()) as { data?: { list?: Record<string, unknown>[] }; message?: string };
    const row = listed.data?.list?.[0];
    const pid = row?.pid ? String(row.pid) : "";
    if (!pid) {
      out.push({ sku, error: listed.message ?? "not found" });
      continue;
    }
    await wait(1100);
    const detail = await fetch(`${BASE}/product/query?pid=${encodeURIComponent(pid)}&features=enable_inventory`, { headers })
      .then((response) => response.json()) as { data?: Record<string, unknown>; message?: string };
    if (!detail.data) {
      out.push({ sku, pid, error: detail.message ?? "detail not found" });
      continue;
    }
    await writeFile(`tmp/coupang/added-products/${sku}.json`, JSON.stringify(detail.data, null, 2));
    const variants = (detail.data.variants ?? detail.data.productVariants ?? []) as Record<string, unknown>[];
    out.push({
      sku,
      pid,
      title: detail.data.productNameEn ?? detail.data.productName,
      category: detail.data.categoryName,
      price: detail.data.sellPrice,
      images: Array.isArray(detail.data.productImage) ? detail.data.productImage.length : 1,
      variants: variants.length,
      optionKeys: [...new Set(variants.map((variant) => String(variant.variantKey ?? "").split("-").slice(0, -1).join("-")))],
    });
    console.log(`[${index + 1}/${SKUS.length}] ${sku} ${pid} variants=${variants.length}`);
  }
  await writeFile("tmp/coupang/added-products/index.json", JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ total: out.length, ok: out.filter((row) => !row.error).length }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
