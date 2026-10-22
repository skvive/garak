// scripts/fix-local-store.mjs
// 로컬 JSON 스토어(~/.lexi-local)의 잘못 분류된 7건 카테고리 동기화
import os from "os";
import path from "path";
import { readFileSync, writeFileSync } from "fs";

const DATA_DIR = process.env.LOCAL_DATA_DIR || path.join(os.homedir(), ".lexi-local", "data");
const STORE_PATH = path.join(DATA_DIR, "lexi-local.json");

// 수정 대상 externalId (Neon catalog_index.id 와 매칭되는 externalId)
const FIX_LEAF = {
  // id → 새 leaf (catalog_index.id)
};

// localStore.catalog 배열에서 title/categoryPath 로 매칭
const IDS_LEAF = {
  "2090273801489375234": "Men's Hats & Caps", // 225
  "2090632147582611458": "Men's Hats & Caps", // 205
  "2087069672651677698": "Men's Hats & Caps", // 336
  "2087079535363485698": "Men's Hats & Caps", // 334
  "2089992299672477698": "Men's Hats & Caps", // 244
  "2608200914001634500": "Men's Socks",       // 213
  "2608121006171622300": "Men's Socks",       // 305
};

const store = JSON.parse(readFileSync(STORE_PATH, "utf8"));
const cat = store.catalog ?? [];
let fixed = 0;

for (const item of cat) {
  const ext = String(item.externalId ?? "");
  const leaf = IDS_LEAF[ext];
  if (!leaf) continue;
  if (item.categoryPath?.[0] === leaf) continue;

  item.categoryPath = [leaf];
  if (item.rawMeta) {
    item.rawMeta.categoryPath = [leaf];
    item.rawMeta.lexCategoryId = "men-clothing";
  }
  fixed++;
}

if (fixed > 0) {
  writeFileSync(STORE_PATH, JSON.stringify(store), "utf8");
  console.log(`로컬 스토어 수정: ${fixed}건 → men-clothing`);
} else {
  console.log("로컬 스토어 수정 대상 없음 (이미 반영 또는 externalId 불일치)");
}
