/**
 * CommerceShorts 렌더 워커 — 앱 API에서 잡을 claim → Remotion으로 MP4 → Vercel Blob → 완료 보고.
 * DB에 직접 붙지 않는다. 필요한 env: SHORTS_API_BASE, SHORTS_WORKER_TOKEN, BLOB_READ_WRITE_TOKEN.
 * PORT가 있으면 /healthz 를 연다(Render web service 호환).
 */
import http from "node:http";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { put } from "@vercel/blob";

const here = path.dirname(fileURLToPath(import.meta.url));
// Windows: 사용자 Temp에서는 FFmpeg 출력이 막히는 경우가 있어 작업 폴더를 고정
const WORK_DIR = process.env.RENDER_TMP ?? path.join(here, ".render-tmp");
mkdirSync(WORK_DIR, { recursive: true });
process.env.TEMP = process.env.TMP = process.env.TMPDIR = WORK_DIR;
const API = (process.env.SHORTS_API_BASE ?? "").replace(/\/$/, "");
const TOKEN = process.env.SHORTS_WORKER_TOKEN ?? "";
const POLL_MS = Number(process.env.POLL_MS ?? 5000);
const ONCE = process.argv.includes("--once");
const WATERMARK = process.env.SHORTS_WATERMARK ?? "CommerceShorts";

if (!API || !TOKEN) {
  console.error("SHORTS_API_BASE, SHORTS_WORKER_TOKEN 필요");
  process.exit(1);
}

let lastBeat = new Date().toISOString();
let rendered = 0;
if (process.env.PORT) {
  http
    .createServer((req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, lastBeat, rendered }));
    })
    .listen(Number(process.env.PORT), "0.0.0.0");
}

async function api(route, body) {
  const res = await fetch(`${API}/api/shorts/worker/${route}`, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(60_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${route} ${res.status}: ${data.error ?? ""}`);
  return data;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function renderJob(serveUrl, job) {
  const inputProps = {
    hookText: job.script.hookText,
    cta: job.script.cta,
    scenes: job.script.scenes,
    images: job.product.imageUrls,
    wanVideoUrl: job.strategy === "wan_i2v" ? job.wanVideoUrl : null,
    watermark: job.watermark ? WATERMARK : null,
  };
  const composition = await selectComposition({ serveUrl, id: "ShortVideo", inputProps });
  const out = path.join(WORK_DIR, `short-${job.id}-${Date.now()}.mp4`);
  let lastSent = 40;
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: out,
    inputProps,
    concurrency: Number(process.env.RENDER_CONCURRENCY ?? 2),
    onProgress: ({ progress }) => {
      const p = 40 + Math.round(progress * 45);
      if (p - lastSent >= 10) {
        lastSent = p;
        api("report", { jobId: job.id, status: "rendering", progress: p }).catch(() => {});
      }
    },
  });
  await api("report", { jobId: job.id, status: "uploading", progress: 90 });
  const blob = await put(`shorts/videos/${job.id}-${Date.now()}.mp4`, await readFile(out), {
    access: "public",
    contentType: "video/mp4",
  });
  await rm(out, { force: true });
  return blob.url;
}

async function main() {
  console.log("[worker] bundling…");
  const serveUrl = await bundle({ entryPoint: path.join(here, "src", "index.ts") });
  console.log(`[worker] ready → ${API}`);
  for (;;) {
    lastBeat = new Date().toISOString();
    let job = null;
    try {
      job = (await api("claim")).job;
    } catch (e) {
      console.error("[worker] claim:", e.message);
    }
    if (job) {
      console.log(`[worker] job ${job.id} (${job.strategy}) start`);
      try {
        const url = await renderJob(serveUrl, job);
        await api("report", { jobId: job.id, status: "completed", url });
        rendered++;
        console.log(`[worker] job ${job.id} done ${url}`);
      } catch (e) {
        console.error(`[worker] job ${job.id} failed:`, e);
        await api("report", { jobId: job.id, status: "failed", error: String(e?.message ?? e).slice(0, 300) }).catch(() => {});
      }
      if (ONCE) return;
      continue;
    }
    if (ONCE) return;
    await sleep(POLL_MS);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
