#!/usr/bin/env node
/**
 * lookbook-1000 (status=done) → Lexi Style cast cards
 *
 * Out: public/casts/amba/{id}_{eth}_{nat}_{sex}_{age}/face.webp + meta.json
 * Index: public/casts/amba/index.json
 *
 * Usage:
 *   node scripts/import-amba-casts.mjs
 *   AMBASSADOR_ROOT=E:/path/to/ambassador-ai-site node scripts/import-amba-casts.mjs
 */
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import sharp from "sharp";

const ROOT = process.cwd();
const EXISTING_CAST_REGISTRY = path.join(ROOT, "amba", "casts-registry.json");
const EXISTING_NAMES_BY_ID = fs.existsSync(EXISTING_CAST_REGISTRY)
  ? new Map(JSON.parse(fs.readFileSync(EXISTING_CAST_REGISTRY, "utf8")).casts.map((cast) => [String(cast.id), cast.name]))
  : new Map();
const DEFAULT_AMBASSADOR = [
  process.env.AMBASSADOR_ROOT,
  "E:/cursor_HS/kcci/SITE/ambassador-ai-site",
  "E:/cursor_HS/ambassador-ai-site",
].filter(Boolean);

function resolveAmbassadorRoot() {
  for (const p of DEFAULT_AMBASSADOR) {
    const csv = path.join(p, "manifests", "lookbook-1000.csv");
    const web = path.join(p, "lookbook-1000", "web");
    if (fs.existsSync(csv) && fs.existsSync(web)) return p;
  }
  throw new Error(
    "ambassador-ai-site not found (need manifests/lookbook-1000.csv + lookbook-1000/web). Set AMBASSADOR_ROOT.",
  );
}

const NAT_KO = {
  KR: "대한민국",
  JP: "일본",
  CN: "중국",
  US: "미국",
  GB: "영국",
  FR: "프랑스",
  DE: "독일",
  CA: "캐나다",
  VN: "베트남",
  TH: "태국",
  PH: "필리핀",
  ID: "인도네시아",
  IN: "인도",
  LK: "스리랑카",
  SA: "사우디아라비아",
  AE: "아랍에미리트",
  MX: "멕시코",
  BR: "브라질",
  NG: "나이지리아",
  KE: "케냐",
  ZA: "남아프리카공화국",
  ES: "스페인",
  IT: "이탈리아",
  AU: "호주",
  NL: "네덜란드",
  AR: "아르헨티나",
  SG: "싱가포르",
};

const INTERESTS_BY_STYLE = {
  FML: ["포멀 룩", "시티 워킹", "갤러리"],
  STU: ["스튜디오 라이트", "미니멀 스타일", "필름"],
  BTY: ["뷰티 케어", "스킨 글로우", "매크로 디테일"],
  OUT: ["아웃도어", "여행", "자연광"],
  STR: ["스트리트", "스니커즈", "시티 산책"],
  SPO: ["액티브웨어", "러닝", "헬시 루틴"],
  HIG: ["하이패션", "에디토리얼", "런웨이"],
  KID: ["플레이", "컬러", "주말 룩"],
};

const NAMES_F = {
  KR: [
    ["서아린", "Seo Arin"],
    ["한유나", "Han Yuna"],
    ["도지원", "Do Jiwon"],
    ["문채린", "Moon Chaerin"],
    ["배소율", "Bae Soyul"],
  ],
  JP: [
    ["사쿠라", "Sakura"],
    ["미유", "Miyu"],
    ["하나", "Hana"],
  ],
  CN: [
    ["린웨이", "Lin Wei"],
    ["샤오칭", "Xiao Qing"],
  ],
  US: [
    ["에이바", "Ava"],
    ["노아", "Noah"],
    ["마일라", "Myla"],
  ],
  default: [
    ["루나", "Luna"],
    ["이리스", "Iris"],
    ["노엘", "Noelle"],
    ["세라", "Sera"],
    ["미라", "Mira"],
  ],
};

const NAMES_M = {
  KR: [
    ["강이안", "Kang Ian"],
    ["오시온", "Oh Sion"],
    ["윤재하", "Yoon Jaeha"],
  ],
  JP: [
    ["렌", "Ren"],
    ["카이", "Kai"],
  ],
  US: [
    ["이단", "Ethan"],
    ["노아", "Noah"],
  ],
  default: [
    ["리오", "Leo"],
    ["카일", "Kyle"],
    ["에이든", "Aiden"],
  ],
};

function pickName(id, sex, nat) {
  const existing = EXISTING_NAMES_BY_ID.get(String(id));
  if (existing) return existing;
  const pool = (sex === "M" ? NAMES_M : NAMES_F)[nat] || (sex === "M" ? NAMES_M : NAMES_F).default;
  const n = Number.parseInt(id, 10) || 0;
  const [ko, en] = pool[n % pool.length];
  return `${ko} · ${en}`;
}

function parseCsv(csvPath) {
  const raw = fs.readFileSync(csvPath, "utf8");
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });
}

function findWebFile(webDir, row) {
  const id = String(row.id).padStart(4, "0");
  const exact = `${id}_${row.ethnicity}_${row.nationality}_${row.sex}_${row.age_band}_${row.style}.webp`;
  const exactPath = path.join(webDir, exact);
  if (fs.existsSync(exactPath)) return { file: exact, abs: exactPath };

  // fallback: any file starting with id_eth_nat_sex_age
  const prefix = `${id}_${row.ethnicity}_${row.nationality}_${row.sex}_${row.age_band}_`;
  const hits = fs.readdirSync(webDir).filter((f) => f.startsWith(prefix) && f.endsWith(".webp"));
  if (hits[0]) return { file: hits[0], abs: path.join(webDir, hits[0]) };

  const idHits = fs.readdirSync(webDir).filter((f) => f.startsWith(`${id}_`) && f.endsWith(".webp"));
  if (idHits.length === 1) return { file: idHits[0], abs: path.join(webDir, idHits[0]) };
  return null;
}

async function writeFace(srcAbs, destAbs) {
  const { data, info } = await sharp(srcAbs)
    .rotate()
    .resize(960, 1200, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80, alphaQuality: 80, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  fs.writeFileSync(destAbs, data);
  return info;
}

async function main() {
  const ambRoot = resolveAmbassadorRoot();
  const csvPath = path.join(ambRoot, "manifests", "lookbook-1000.csv");
  const webDir = path.join(ambRoot, "lookbook-1000", "web");
  const outRoot = path.join(ROOT, "public", "casts", "amba");

  fs.mkdirSync(outRoot, { recursive: true });

  const rows = parseCsv(csvPath).filter((r) => String(r.status || "").trim().toLowerCase() === "done");
  // storefront fashion: skip child bands
  const adult = rows.filter((r) => !/^C/i.test(String(r.age_band || "")));

  console.log(`ambassador: ${ambRoot}`);
  console.log(`done=${rows.length} adult=${adult.length}`);

  const casts = [];
  let ok = 0;
  let missing = 0;

  for (const row of adult) {
    const id = String(row.id).padStart(4, "0");
    const eth = row.ethnicity;
    const nat = row.nationality;
    const sex = row.sex;
    const age = row.age_band;
    const style = row.style;
    const folderName = `${id}_${eth}_${nat}_${sex}_${age}`;
    const folder = path.join(outRoot, folderName);
    const hit = findWebFile(webDir, { ...row, id });
    if (!hit) {
      missing += 1;
      console.warn(`  miss web: ${id} ${eth}/${nat}/${sex}/${age}/${style}`);
      continue;
    }

    fs.mkdirSync(folder, { recursive: true });
    const facePath = path.join(folder, "face.webp");
    const info = await writeFace(hit.abs, facePath);

    const gender = sex === "M" ? "남성" : "여성";
    const nationality = NAT_KO[nat] || nat;
    const interests = INTERESTS_BY_STYLE[style] || INTERESTS_BY_STYLE.STU;
    const name = pickName(id, sex, nat);

    const meta = {
      id,
      name,
      gender,
      nationality,
      interests,
      agency: "AMBA",
      agencyFull: "AI Ambassador",
      faceSeed: "./face.webp",
      source: {
        lookbookId: id,
        eth,
        nat,
        sex,
        age,
        style,
        file: hit.file,
        ambassadorRoot: ambRoot.replace(/\\/g, "/"),
      },
    };
    fs.writeFileSync(path.join(folder, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

    casts.push({
      ...meta,
      folder: folderName,
      publicPath: `/casts/amba/${folderName}/face.webp`,
      metaPath: `/casts/amba/${folderName}/meta.json`,
      faceBytes: info.size,
      faceSize: `${info.width}x${info.height}`,
    });
    ok += 1;
    console.log(`  ✓ ${folderName} ← ${hit.file} (${info.width}x${info.height} ${(info.size / 1024).toFixed(0)}KB)`);
  }

  const index = {
    agency: "AMBA",
    agencyFull: "AI Ambassador",
    sourceRepo: "https://github.com/shinkangteam/ambassador-ai-site",
    ambassadorRoot: ambRoot.replace(/\\/g, "/"),
    generatedAt: new Date().toISOString(),
    count: casts.length,
    missing,
    casts: casts.sort((a, b) => a.id.localeCompare(b.id)),
  };
  fs.writeFileSync(path.join(outRoot, "index.json"), JSON.stringify(index, null, 2) + "\n");

  // convenience registry at repo amba/casts-registry.json
  const ambaDir = path.join(ROOT, "amba");
  fs.mkdirSync(ambaDir, { recursive: true });
  fs.writeFileSync(path.join(ambaDir, "casts-registry.json"), JSON.stringify(index, null, 2) + "\n");

  console.log(`\ncast cards: ${ok}  missing: ${missing}`);
  console.log(`index: public/casts/amba/index.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
