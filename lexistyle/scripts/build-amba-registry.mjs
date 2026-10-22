/**
 * Build AMBA cast registry from ambassador-ai-site LEXI STYLE packages.
 * Adds deterministic fictional profiles (name / interests) for storefront cast.
 *
 *   node scripts/build-amba-registry.mjs
 */
import fs from "fs";
import path from "path";
import { createHash } from "crypto";

const ROOT = process.cwd();
const PKG = path.join(ROOT, "amba", "models", "kcci-submission");
const PUBLIC_AMBA = path.join(ROOT, "public", "amba");
const OUT = path.join(ROOT, "amba", "registry.json");

const ethnicityLabel = {
  EA: "East Asian",
  WE: "Western European / N. American",
  SE: "Southeast Asian",
  SA: "South Asian",
  ME: "Middle Eastern",
  LT: "Latino / Hispanic",
  BL: "Black / African diaspora",
  MX: "Mixed",
};
const sexLabel = { F: "\uC5EC\uC131", M: "\uB0A8\uC131" };
const natLabel = {
  KR: "\uB300\uD55C\uBBFC\uAD6D",
  JP: "\uC77C\uBCF8",
  CN: "\uC911\uAD6D",
  US: "\uBBF8\uAD6D",
  GB: "\uC601\uAD6D",
  FR: "\uD504\uB791\uC2A4",
  DE: "\uB3C5\uC77C",
  CA: "\uCE90\uB098\uB2E4",
  VN: "\uBCA0\uD2B8\uB0A8",
  TH: "\uD0DC\uAD6D",
  PH: "\uD544\uB9AC\uD540",
  ID: "\uC778\uB3C4\uB124\uC2DC\uC544",
  IN: "\uC778\uB3C4",
  LK: "\uC2A4\uB9AC\uB791\uCE74",
  SA: "\uC0AC\uC6B0\uB514",
  AE: "UAE",
  MX: "\uBA55\uC2DC\uCF54",
  BR: "\uBE0C\uB77C\uC9C8",
  NG: "\uB098\uC774\uC9C0\uB9AC\uC544",
  KE: "\uCF00\uB0D0",
  ZA: "\uB0A8\uC544\uD504\uB9AC\uCE74",
  IT: "\uC774\uD0C8\uB9AC\uC544",
  AU: "\uD638\uC8FC",
  TR: "\uD130\uD0A4",
};

/** Given names by nationality + sex (fictional, commercial cast) */
const GIVEN = {
  KR: { F: ["Arin", "Sua", "Yuna", "Haeun", "Jiwoo", "Minseo"], M: ["Junho", "Minjae", "Seojun", "Haru", "Dooyun"] },
  JP: { F: ["Aoi", "Yui", "Hina", "Sakura", "Mio"], M: ["Haruto", "Sota", "Ren", "Kaito"] },
  CN: { F: ["Lina", "Mei", "Yuxin", "Qing"], M: ["Wei", "Jun", "Kai", "Chen"] },
  US: { F: ["Ava", "Maya", "Zoe", "Nora", "Ivy"], M: ["Noah", "Ethan", "Leo", "Miles"] },
  GB: { F: ["Olivia", "Isla", "Freya", "Amelia"], M: ["Oliver", "Arthur", "Jack", "Harry"] },
  FR: { F: ["Camille", "Chloe", "Ines", "Lea"], M: ["Louis", "Hugo", "Theo", "Adam"] },
  DE: { F: ["Lena", "Mia", "Emilia", "Nora"], M: ["Leon", "Felix", "Paul", "Jonas"] },
  CA: { F: ["Emma", "Sophie", "Chloe", "Avery"], M: ["Liam", "Owen", "Lucas", "Nathan"] },
  VN: { F: ["Linh", "Mai", "Anh", "Trang"], M: ["Minh", "Khoa", "Duy", "Nam"] },
  TH: { F: ["Ploy", "Nara", "Mint", "Fah"], M: ["Arm", "Pun", "Boss", "Tee"] },
  PH: { F: ["Lara", "Sofia", "Andrea", "Mia"], M: ["Miguel", "Carlo", "Jose", "Marco"] },
  ID: { F: ["Putri", "Sari", "Dewi", "Ayu"], M: ["Budi", "Rafi", "Dimas", "Agus"] },
  IN: { F: ["Aisha", "Priya", "Ananya", "Diya"], M: ["Arjun", "Rohan", "Kabir", "Vikram"] },
  LK: { F: ["Nimali", "Sashi", "Amaya"], M: ["Kasun", "Dilshan", "Ruwan"] },
  SA: { F: ["Layla", "Noor", "Hana"], M: ["Omar", "Yusuf", "Zayd"] },
  AE: { F: ["Amira", "Sara", "Lina"], M: ["Khalid", "Omar", "Rayan"] },
  MX: { F: ["Sofia", "Camila", "Valentina", "Lucia"], M: ["Diego", "Mateo", "Santiago", "Leo"] },
  BR: { F: ["Ana", "Beatriz", "Julia", "Lara"], M: ["Pedro", "Lucas", "Gabriel", "Rafael"] },
  NG: { F: ["Amara", "Zainab", "Ada"], M: ["Chidi", "Tunde", "Emeka"] },
  KE: { F: ["Amina", "Wanjiku", "Grace"], M: ["Jomo", "Brian", "Kevin"] },
  ZA: { F: ["Thandi", "Lerato", "Zuri"], M: ["Sipho", "Theo", "Neo"] },
  DEFAULT: { F: ["Nova", "Iris", "Luna", "Skye"], M: ["Atlas", "Orion", "Kai", "River"] },
};

const FAMILY = {
  KR: ["Seo", "Han", "Park", "Choi", "Yoon", "Kang"],
  JP: ["Sato", "Suzuki", "Takahashi", "Watanabe"],
  CN: ["Li", "Wang", "Zhang", "Chen"],
  US: ["Bennett", "Hayes", "Cole", "Reed", "Brooks"],
  GB: ["Hart", "Clarke", "Walsh", "Shaw"],
  FR: ["Moreau", "Dupont", "Laurent", "Martin"],
  DE: ["Weber", "Keller", "Hoffmann", "Bauer"],
  CA: ["Martin", "Tremblay", "Roy", "Gagnon"],
  VN: ["Nguyen", "Tran", "Le", "Pham"],
  TH: ["Srisawat", "Chai", "Wong"],
  PH: ["Santos", "Reyes", "Cruz", "Garcia"],
  ID: ["Wijaya", "Santoso", "Putra"],
  IN: ["Sharma", "Patel", "Kapoor", "Mehta"],
  LK: ["Fernando", "Perera", "Silva"],
  SA: ["Alami", "Hassan", "Farid"],
  AE: ["Al Mansoori", "Hassan", "Noor"],
  MX: ["Garcia", "Lopez", "Hernandez", "Ramirez"],
  BR: ["Silva", "Santos", "Oliveira", "Costa"],
  NG: ["Okafor", "Adeyemi", "Balogun"],
  KE: ["Kamau", "Otieno", "Wanjala"],
  ZA: ["Dlamini", "Ndlovu", "Botha"],
  DEFAULT: ["Vale", "Stone", "North", "West"],
};

const KO_GIVEN = {
  F: ["\uC544\uB9B0", "\uC218\uC544", "\uC720\uB098", "\uD558\uC740", "\uC9C0\uC6B0", "\uBBFC\uC11C", "\uC608\uB9B0", "\uC2DC\uC724"],
  M: ["\uC900\uD638", "\uBBFC\uC7AC", "\uC11C\uC900", "\uD558\uB8E8", "\uB3C4\uC724", "\uC9C0\uD6C8", "\uD0DC\uC724", "\uC740\uC6B0"],
};

const INTERESTS_BY_STYLE = {
  STU: ["\uC2A4\uD29C\uB514\uC624 \uB8E9\uBD81", "\uBBF8\uB2C8\uBA40 \uC2A4\uD0C0\uC77C\uB9C1", "\uD3F4\uB77C\uB85C\uC774\uB4DC \uCE74\uBA54\uB77C"],
  HIG: ["\uD558\uC774\uD328\uC158 \uC5D0\uB514\uD1A0\uB9AC\uC5BC", "\uB9E4\uAC70\uC9C4 \uCEA0\uD398\uC778", "\uC544\uD2B8 \uAC24\uB7EC\uB9AC"],
  STR: ["\uC2A4\uD2B8\uB9AC\uD2B8 \uC2A4\uB0E5", "\uCE74\uD398 \uC0B0\uCC45", "\uB3C4\uC2DC \uD3EC\uD1A0\uADF8\uB798\uD53C"],
  SPO: ["\uB7EC\uB2DD", "\uD53C\uD2B8\uB2C8\uC2A4", "\uC561\uD2F0\uBE0C \uC6E8\uC5B4"],
  BTY: ["\uC2A4\uD0A8\uCF00\uC5B4", "\uB9C8\uCFE0\uC5C5", "\uD544\uB9BC \uCE74\uBA54\uB77C"],
  FML: ["\uD14C\uC77C\uB7EC\uB4DC \uC218\uD2B8", "\uC624\uD53C\uC2A4 \uB8E9", "\uC774\uBE0C\uB2DD \uC2A4\uD0C0\uC77C"],
  OUT: ["\uC5EC\uD589 \uC2A4\uD0C0\uC77C\uB9C1", "\uC624\uD504\uB85C\uB4DC \uD788\uD0B9", "\uB9AC\uC870\uD2B8 \uD3EC\uD1A0"],
  KID: ["\uD50C\uB808\uC774", "\uCE5C\uAD6C", "\uADF8\uB9BC"],
  DEFAULT: ["\uD328\uC158 \uC2A4\uD0C0\uC77C\uB9C1", "\uCE74\uD398 \uC0B0\uCC45", "\uD544\uB984 \uCE74\uBA54\uB77C"],
};

function pick(arr, n) {
  return arr[Math.abs(n) % arr.length];
}

function hashInt(s) {
  const h = createHash("sha256").update(String(s)).digest();
  return h.readUInt32BE(0);
}

function fictionalProfile(m) {
  const seed = hashInt(`${m.lookbookId}:${m.nationality}:${m.sex}`);
  const gPool = GIVEN[m.nationality] || GIVEN.DEFAULT;
  const fPool = FAMILY[m.nationality] || FAMILY.DEFAULT;
  const givenEn = pick(gPool[m.sex] || gPool.F, seed);
  const familyEn = pick(fPool, seed >>> 8);
  const givenKo = pick(KO_GIVEN[m.sex] || KO_GIVEN.F, seed >>> 16);
  const nameEn = `${givenEn} ${familyEn}`;
  const nameKo =
    m.nationality === "KR" ? `${familyEn} ${givenKo}` : `${givenKo} · ${nameEn}`;
  const displayName = m.nationality === "KR" ? `${nameKo} · ${nameEn}` : `${nameKo}`;
  const pool = INTERESTS_BY_STYLE[m.style] || INTERESTS_BY_STYLE.DEFAULT;
  const interests = [
    pick(pool, seed),
    pick(pool, seed >>> 5),
    pick(INTERESTS_BY_STYLE.DEFAULT, seed >>> 11),
  ].filter((v, i, a) => a.indexOf(v) === i);
  while (interests.length < 3) {
    interests.push(pick(INTERESTS_BY_STYLE.DEFAULT, seed + interests.length));
  }
  return {
    name: displayName,
    nameKo,
    nameEn,
    interests: interests.slice(0, 3),
  };
}

function ensurePublicCopy(packId, filename, absSrc) {
  const destDir = path.join(PUBLIC_AMBA, packId);
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, filename);
  if (!fs.existsSync(dest) && fs.existsSync(absSrc)) {
    fs.copyFileSync(absSrc, dest);
  }
}

const models = [];
if (!fs.existsSync(PKG)) {
  console.error("Missing package junction:", PKG);
  process.exit(1);
}

const dirs = fs
  .readdirSync(PKG, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith("LEXI-STYLE-"));

for (const d of dirs.sort()) {
  const pack = path.join(PKG, d.name);
  const manifestPath = path.join(pack, "MANIFEST.csv");
  if (!fs.existsSync(manifestPath)) continue;
  const lines = fs.readFileSync(manifestPath, "utf8").trim().split(/\r?\n/).slice(1);
  for (const line of lines) {
    if (!line.trim()) continue;
    const [page, id, filename, ethnicity, nationality, sex, age_band, style] = line.split(",");
    if (/^C/i.test(age_band || "")) continue;
    const abs = path.join(pack, "images", filename);
    if (!fs.existsSync(abs)) continue;
    ensurePublicCopy(d.name, filename, abs);
    const base = {
      id: `amba-${id}`,
      lookbookId: id,
      packageId: d.name,
      filename,
      path: path.join("amba", "models", "kcci-submission", d.name, "images", filename).replace(/\\/g, "/"),
      publicPath: `/amba/${d.name}/${filename}`,
      ethnicity,
      ethnicityLabel: ethnicityLabel[ethnicity] || ethnicity,
      nationality,
      nationalityLabel: natLabel[nationality] || nationality,
      sex,
      gender: sexLabel[sex] || sex,
      age_band,
      style,
      agency: "AMBA",
      agencyFull: "AI Ambassador",
      faceSeed: path.join("amba", "models", "kcci-submission", d.name, "images", filename).replace(/\\/g, "/"),
    };
    const profile = fictionalProfile(base);
    models.push({
      ...base,
      ...profile,
      modelCast: {
        name: profile.name,
        gender: base.gender,
        nationality: base.nationalityLabel,
        interests: profile.interests,
        agency: "AMBA",
        agencyFull: "AI Ambassador",
        faceSeed: base.publicPath,
      },
    });
  }
}

const seen = new Set();
const unique = [];
for (const m of models) {
  if (seen.has(m.lookbookId)) continue;
  seen.add(m.lookbookId);
  unique.push(m);
}

const out = {
  sourceRepo: "https://github.com/shinkangteam/ambassador-ai-site",
  localClone: "E:/cursor_HS/kcci/SITE/ambassador-ai-site",
  agency: "AMBA",
  agencyFull: "AI Ambassador",
  generatedAt: new Date().toISOString(),
  count: unique.length,
  models: unique,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), "utf8");
const srcCopy = path.join(ROOT, "src", "lib", "amba", "registry.json");
fs.mkdirSync(path.dirname(srcCopy), { recursive: true });
fs.writeFileSync(srcCopy, JSON.stringify(out, null, 2), "utf8");
console.log("models", unique.length, "packages", dirs.length);
console.log(
  "sample",
  JSON.stringify(
    unique.filter((m) => m.nationality === "KR").slice(0, 2).map((m) => ({
      id: m.id,
      name: m.name,
      interests: m.interests,
      publicPath: m.publicPath,
    })),
    null,
    2,
  ),
);
