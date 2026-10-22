/**
 * Docker 없을 때: DATABASE_URL 비움(JSON 폴백), Neon은 NEON_DATABASE_URL 유지.
 * 시크릿 미출력.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";

const envPath = path.resolve(".env.local");
if (!existsSync(envPath)) {
  console.error(".env.local missing");
  process.exit(1);
}

let text = readFileSync(envPath, "utf8");
const lines = text.split(/\r?\n/);
const out = [];
let neon = "";
let hadDb = false;

for (const line of lines) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!m) {
    out.push(line);
    continue;
  }
  const [, key, val] = m;
  if (key === "DATABASE_URL") {
    hadDb = true;
    const v = val.trim();
    // Neon URL이면 보존
    if (v && !/127\.0\.0\.1|localhost/.test(v) && /neon\.tech/i.test(v)) {
      neon = v;
    }
    out.push("DATABASE_URL=");
    continue;
  }
  if (key === "NEON_DATABASE_URL" || key === "DATABASE_URL_NEON") {
    if (val.trim()) neon = val.trim();
    continue; // rewrite once at end
  }
  out.push(line);
}

if (!hadDb) out.push("DATABASE_URL=");
if (neon) out.push(`NEON_DATABASE_URL=${neon}`);
else out.push("# NEON_DATABASE_URL=  # set when ready to sync");

writeFileSync(envPath, out.join("\n").replace(/\n*$/, "\n"), "utf8");
console.log("DATABASE_URL cleared → JSON local store (~/.lexi-local)");
console.log("NEON_DATABASE_URL kept=", Boolean(neon));
