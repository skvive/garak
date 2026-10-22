/**
 * 상품 이미지 중 CJ 서버(cjdropshipping/aliyuncs)에서 직접 불러오는 것을 LEXI Vercel Blob 으로 옮긴다.
 * 공급처 URL 노출 방지. 원본 URL → Blob URL 매핑을 tmp/rehost-map.json 에 저장해 재실행·다른 DB 적용 시 재업로드하지 않는다.
 *
 *   node scripts/rehost-cj-images.mjs --target=neon [--dry-run] [--limit=N]
 *   node scripts/rehost-cj-images.mjs --target=local
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import pg from "pg";
import sharp from "sharp";
import { put } from "@vercel/blob";

const args = process.argv.slice(2);
const target = args.find((a) => a.startsWith("--target="))?.split("=")[1] ?? "neon";
const dry = args.includes("--dry-run");
const limit = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0) || Infinity;
const url = target === "neon" ? process.env.NEON_DATABASE_URL : process.env.DATABASE_URL;
const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!url) throw new Error(`no db url for ${target}`);
if (!token && !dry) throw new Error("BLOB_READ_WRITE_TOKEN required");

const CJ_HOST = /^https?:\/\/([a-z0-9.-]*cjdropshipping\.com|[a-z0-9.-]*aliyuncs\.com)\//i;
const MAP_FILE = "tmp/rehost-map.json";
mkdirSync("tmp", { recursive: true });
const map = existsSync(MAP_FILE) ? JSON.parse(readFileSync(MAP_FILE, "utf-8")) : {};
const saveMap = () => writeFileSync(MAP_FILE, JSON.stringify(map, null, 1));

const client = new pg.Client({ connectionString: url, ssl: target === "neon" ? { rejectUnauthorized: false } : false });
await client.connect();
const rows = (
  await client.query(
    `select distinct pi.url from product_images pi join products p on p.id = pi.product_id
     where p.deleted_at is null and pi.url ~* '(cjdropshipping\\.com|aliyuncs\\.com)/'`,
  )
).rows.map((r) => r.url);
const todo = rows.filter((u) => !map[u]).slice(0, limit);
console.log(`target=${target} cj image urls=${rows.length} already mapped=${rows.length - todo.length} to upload=${dry ? 0 : todo.length}${dry ? " (dry-run)" : ""}`);

async function rehost(src) {
  const res = await fetch(src, { signal: AbortSignal.timeout(30_000), headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  const body = await sharp(input).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
  const key = createHash("sha1").update(src).digest("hex");
  const blob = await put(`products/rehost/${key}.webp`, body, {
    access: "public",
    contentType: "image/webp",
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}

let ok = 0, fail = 0;
if (!dry) {
  const queue = [...todo];
  const workers = Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const src = queue.shift();
      try {
        map[src] = await rehost(src);
        ok++;
      } catch (e) {
        fail++;
        console.log("FAIL", src.slice(0, 90), String(e).slice(0, 100));
      }
      if ((ok + fail) % 50 === 0) { saveMap(); console.log(`progress ${ok + fail}/${todo.length} ok=${ok} fail=${fail}`); }
    }
  });
  await Promise.all(workers);
  saveMap();
}

// DB 교체 (정확히 같은 URL 만)
let updated = 0;
if (!dry) {
  await client.query("begin");
  for (const src of rows) {
    const dst = map[src];
    if (!dst) continue;
    const r = await client.query("update product_images set url = $2 where url = $1", [src, dst]);
    updated += r.rowCount ?? 0;
  }
  await client.query("commit");
}
const left = (
  await client.query(
    `select count(*)::int n from product_images pi join products p on p.id = pi.product_id
     where p.deleted_at is null and pi.url ~* '(cjdropshipping\\.com|aliyuncs\\.com)/'`,
  )
).rows[0].n;
console.log(`uploaded ok=${ok} fail=${fail} rows updated=${updated} remaining cj urls=${left}`);
await client.end();
