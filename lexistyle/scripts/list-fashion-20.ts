import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { readFileSync } from "fs";
import path from "path";
import os from "os";

const STORE = path.join(os.homedir(), ".lexi-local", "data", "lexi-local.json");
const store = JSON.parse(readFileSync(STORE, "utf8"));

const APPAREL_CHIPS = new Set([
  "Lady Dresses","Evening Dresses","Blouses & Shirts","Women's Short-Sleeved Shirts",
  "Women's Long-Sleeved Shirts","Skirts","Rompers","Jumpsuits","Wide Leg Pants",
  "Woman Jeans","Casual Pants","Pants & Capris","Woman Hoodies & Sweatshirts",
  "Sweaters","Women's Cargo Pants","Knitwear","Women's Sweatshirts",
  "Women's Knitted Pullovers","Women's Cardigans","Coats & Jackets",
  "Women's Coats","Down Coats & Jackets","Outerwear & Coats",
  "Women's Trench Coats","Hoodies","Men's Shirts & T-Shirts",
  "Men's Long-Sleeved Shirts","Sweatshirts & Hoodies","Men's Coats & Jackets",
  "Men's Outerwear","Men's Sweaters","Men's Down Coats",
]);

const cats = (store.catalog ?? []).filter(
  (c: any) =>
    c.supplierCode === "cjdropshipping" &&
    c.sourceStatus === "active" &&
    c.primaryThumbUrl &&
    c.categoryPath?.length > 0 &&
    APPAREL_CHIPS.has(c.categoryPath[0])
);

console.log("Total apparel CJ items:", cats.length);
console.log("\nSample 25 with their IDs:\n");

const top25 = cats.sort((a: any, b: any) => parseFloat(a.minPrice ?? "99") - parseFloat(b.minPrice ?? "99")).slice(0, 25);
top25.forEach((p: any, i: number) => {
  const price = parseFloat(p.minPrice ?? "0").toFixed(2);
  const sell = (parseFloat(price) + 20) * 1.3;
  console.log(`${String(i+1).padStart(2," ")}. id=${String(p.id).padStart(5," ")} | $${price}→$${sell.toFixed(1)} | ${p.categoryPath[0].padEnd(30," ")} | ${p.title.slice(0,55)}`);
});