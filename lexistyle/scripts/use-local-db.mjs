/**
 * .env.local: Neon URL을 NEON_DATABASE_URL로 옮기고 DATABASE_URL을 로컬 Postgres로 설정.
 * 이미 로컬이면 그대로 두고 NEON만 보강.
 * 시크릿은 출력하지 않음.
 */
import { config } from "dotenv";
import { readFileSync, writeFileSync, existsSync } from "fs";
import os from "os";
import path from "path";

config({ path: ".env.local" });
config();

/**
 * 로컬 PostgreSQL 18 접속 URL.
 * 비밀번호는 ~/.lexi-local/data/pg-local-credentials.txt (git 제외)에서 읽고,
 * 없으면 예전 관례(lexi:lexi)로 폴백한다.
 */
function localUrl() {
  try {
    const credPath = path.join(os.homedir(), ".lexi-local", "data", "pg-local-credentials.txt");
    const line = readFileSync(credPath, "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith("lexi_url="));
    if (line) return line.slice("lexi_url=".length).trim();
  } catch {
    /* ignore — fallback */
  }
  return "postgresql://lexi:lexi@127.0.0.1:5432/lexi";
}

const LOCAL = localUrl();
const envPath = path.resolve(".env.local");

function isLocal(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "postgres";
  } catch {
    return false;
  }
}

function upsertEnvFile(filePath, pairs) {
  let text = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  const lines = text.length ? text.split(/\r?\n/) : [];
  const keys = new Set(Object.keys(pairs));
  const out = [];
  const seen = new Set();
  for (const line of lines) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (m && keys.has(m[1])) {
      out.push(`${m[1]}=${pairs[m[1]]}`);
      seen.add(m[1]);
    } else {
      out.push(line);
    }
  }
  for (const k of keys) {
    if (!seen.has(k)) out.push(`${k}=${pairs[k]}`);
  }
  // trailing newline
  const body = out.join("\n").replace(/\n*$/, "\n");
  writeFileSync(filePath, body, "utf8");
}

const current = process.env.DATABASE_URL?.trim() || "";
const existingNeon =
  process.env.NEON_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL_NEON?.trim() ||
  "";

/** 로컬 Postgres에 실제 접속 가능한지 검증. 접속 가능하면 true */
async function canConnect(url) {
  if (!url) return false;
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: url, ssl: false, connectionTimeoutMillis: 3000 });
  try {
    await client.connect();
    await client.query("select 1");
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

const pairs = {};

if (current && !isLocal(current)) {
  pairs.NEON_DATABASE_URL = existingNeon || current;
  pairs.DATABASE_URL = LOCAL;
  console.log("moved Neon URL → NEON_DATABASE_URL; DATABASE_URL → local Postgres");
} else if (!current) {
  pairs.DATABASE_URL = LOCAL;
  if (existingNeon) pairs.NEON_DATABASE_URL = existingNeon;
  console.log("set DATABASE_URL → local Postgres");
} else {
  // 이미 로컬 URL — 접속 검증. 실패하면 자격증명 파일의 로컬 URL로 교체.
  const ok = await canConnect(current);
  if (ok) {
    pairs.DATABASE_URL = current;
    if (existingNeon) pairs.NEON_DATABASE_URL = existingNeon;
    console.log("DATABASE_URL already local & reachable; set NEON_DATABASE_URL manually if missing");
  } else {
    pairs.DATABASE_URL = LOCAL;
    if (existingNeon) pairs.NEON_DATABASE_URL = existingNeon;
    console.log(`DATABASE_URL local but unreachable → corrected to credentials URL (${isLocal(LOCAL) ? "local" : "?"})`);
  }
}

if (Object.keys(pairs).length) upsertEnvFile(envPath, pairs);

console.log("ok: local=", isLocal(pairs.DATABASE_URL || current));
console.log("ok: neon_saved=", Boolean(pairs.NEON_DATABASE_URL || existingNeon));
