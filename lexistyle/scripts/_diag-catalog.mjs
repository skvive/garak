import os from "os";
import { readFileSync } from "fs";
import path from "path";

const STORE = path.join(os.homedir(), ".lexi-local", "data", "lexi-local.json");
const s = JSON.parse(readFileSync(STORE, "utf8"));
const c = s.catalog ?? [];
const KW = /dress|blouse|skirt|women|top|cardigan|knit|coat|jacket|skirt|pants|jumpsuit|lady/i;
const w = c.filter((r) => KW.test((r.title ?? "") + " " + (r.categoryPath ?? []).join(" ")));
console.log("total catalog:", c.length);
console.log("womens-fashion candidates:", w.length);
for (const r of w.slice(0, 10)) {
  console.log(`[${r.id}] ${r.title} | ${(r.categoryPath ?? []).join("/")} | $${r.minPrice} | thumb=${r.primaryThumbUrl ? "Y" : "N"}`);
}