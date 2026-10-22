#!/usr/bin/env node
/**
 * Assign globally unique names to all 101 AMBA casts.
 * No two casts share a name. Deterministic per cast ID.
 *
 * node scripts/dedupe-cast-names.mjs
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const INDEX = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "casts", "amba", "index.json"), "utf8"));

// 89 unique female name pairs (Korean locale + English)
const ALL_F = [
  "아린 · Arin","지우 · Jiwoo","서연 · Seoyeon","수아 · Sua","민서 · Minseo",
  "유나 · Yuna","예진 · Yejin","혜원 · Hyewon","다은 · Daeun","지민 · Jimin",
  "채원 · Chaewon","은지 · Eunji","소희 · Sohee","나은 · Naeun","보람 · Boram",
  "현서 · Hyeonseo","린웨이 · Lin Wei","샤오칭 · Xiao Qing","위링 · Yuxin","메이린 · Mei Lin",
  "징화 · Jinghua","샤오화 · Xiaohua","화링 · Hualing","추이잉 · Cuiying","페이링 · Peiling",
  "사쿠라 · Sakura","아오이 · Aoi","히나 · Hina","유이 · Yui","미오 · Mio",
  "린 · Rin","메이 · Mei","코하루 · Koharu","린 · Linh",
  "마이 · Mai","아인 · Anh","쯔엉 · Trang","플로이 · Ploy","나라 · Nara",
  "민트 · Mint","파 · Fah","라라 · Lara","안드레아 · Andrea","소피아 · Sofia",
  "가브리엘라 · Gabriela","푸트리 · Putri","사리 · Sari","데위 · Dewi","아유 · Ayu",
  "아이샤 · Aisha","프리야 · Priya","아난야 · Ananya","디야 · Diya","니말리 · Nimali",
  "사시 · Sashi","아마야 · Amaya","딜라니 · Dilani","라일라 · Layla","누르 · Noor",
  "하나 · Hana","아미라 · Amira","아바 · Ava","에마 · Emma","올리비아 · Olivia",
  "샬롯 · Charlotte","아멜리아 · Amelia","이자벨라 · Isabella","하퍼 · Harper","에블린 · Evelyn",
  "카밀레 · Camille","클로에 · Chloe","이네스 · Ines","레아 · Lea","루나 · Luna",
  "아이리스 · Iris","노엘 · Noelle","세라 · Sera","미라 · Mira","레나 · Lena",
  "클라라 · Clara","에밀리아 · Emilia","노라 · Nora","루시아 · Lucia","발렌티나 · Valentina",
  "다니엘라 · Daniela","주리 · Zuri","타디 · Thandi","야라 · Yara",
  "자이라 · Zaira","라야 · Raya","마일라 · Myla","조이 · Zoe","아마라 · Amara",
];

const ALL_M = [
  "윤재하 · Yoon Jaeha","김도윤 · Kim Doyoon","박서준 · Park Seojun","강이안 · Kang Ian",
  "이단 · Ethan","올리버 · Oliver","루카스 · Lucas","메이슨 · Mason",
  "렌 · Ren","카이토 · Kaito","하루토 · Haruto","소타 · Sota",
];

// Sort casts by id, iterate in order, assign next unused name per sex
const casts = [...INDEX.casts].sort((a, b) => a.id.localeCompare(b.id));
const usedF = new Set();
const usedM = new Set();
let fi = 0;
let mi = 0;

casts.forEach((c) => {
  if (c.source.sex === "M") {
    c.name = ALL_M[mi];
    usedM.add(ALL_M[mi]);
    mi++;
  } else {
    while (fi < ALL_F.length && usedF.has(ALL_F[fi])) fi++;
    if (fi >= ALL_F.length) throw new Error(`Ran out of female names at ${c.id}`);
    c.name = ALL_F[fi];
    usedF.add(ALL_F[fi]);
    fi++;
  }
});

// Verify
const byName = {};
casts.forEach((c) => { (byName[c.name] = byName[c.name] || []).push(c.id); });
const dupes = Object.entries(byName).filter(([, v]) => v.length > 1);
if (dupes.length > 0) {
  dupes.forEach(([name, ids]) => console.error(`DUP: ${name} → ${ids.join(",")}`));
  process.exit(1);
}

console.log(`✅ ${usedM.size + usedF.size} globally unique names assigned (F${usedF.size}/M${usedM.size})`);

// Write meta.json
let metaOk = 0;
casts.forEach((c) => {
  const metaPath = path.join(ROOT, "public", "casts", "amba", c.folder, "meta.json");
  if (!fs.existsSync(metaPath)) return;
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  meta.name = c.name;
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
  metaOk++;
});

// Write index
INDEX.casts = casts;
INDEX.count = casts.length;
INDEX.generatedAt = new Date().toISOString();
fs.writeFileSync(path.join(ROOT, "public", "casts", "amba", "index.json"), JSON.stringify(INDEX, null, 2) + "\n");

console.log(`Updated ${metaOk} meta.json files ✅`);
casts.forEach((c) => console.log(`  ${c.id} → ${c.name}`));