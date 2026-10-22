/**
 * 미생성 상품페이지 순차 생성 — 1개씩 (docs/pdp-bulk-cj-original-plan.md)
 * 생성형 AI 크레딧이 소진돼 이미지 검수·문구 작성은 사람이(Claude 세션) 하고, 이 스크립트는 수집·가공·업로드·게시·검증만 맡는다.
 *   prepare [--id X]                  다음 대상의 CJ 원본 후보 이미지·비교 시트·근거 데이터 → tmp/pdp-bulk/work-<id>/
 *   publish --id X --clean 0,2,3 --copy <copy.json> [--dry]
 *   skip --id X --reason <text>       게시 불가(정상 이미지 부족 등) 기록
 *   status                            진행 요약
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { buildQueue, type QueueItem } from "./queue";

const args = process.argv.slice(2);
const CMD = args[0] ?? "status";
const flag = (n: string) => args.includes(`--${n}`);
const val = (n: string) => args[args.indexOf(`--${n}`) + 1];
const DRY = flag("dry");
const MAX_CANDIDATES = 12;
const STATE_FILE = "tmp/pdp-bulk/state.json";

type State = Record<string, { status: "done" | "skipped" | "failed"; reason?: string; documentId?: number; images?: number; at: string }>;
const loadState = async (): Promise<State> => JSON.parse(await readFile(STATE_FILE, "utf8").catch(() => "{}"));
const saveState = async (s: State) => { await mkdir("tmp/pdp-bulk", { recursive: true }); await writeFile(STATE_FILE, JSON.stringify(s, null, 1)); };
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---------- 1) CJ 원본 이미지 ---------- */
function imageUrls(raw: Record<string, unknown>): string[] {
  const urls: string[] = [];
  const push = (v: unknown) => { if (typeof v === "string" && /^https?:\/\//.test(v)) urls.push(v); };
  const set = raw.productImageSet;
  if (Array.isArray(set)) set.forEach(push);
  const pi = raw.productImage;
  if (typeof pi === "string" && pi.trim().startsWith("[")) { try { (JSON.parse(pi) as unknown[]).forEach(push); } catch { /* ignore */ } }
  else push(pi);
  for (const v of (raw.variants as { variantImage?: string }[] | undefined) ?? []) push(v.variantImage);
  return [...new Set(urls)];
}

type Cand = { url: string; buf: Buffer };
async function downloadCandidates(urls: string[]): Promise<Cand[]> {
  const out: Cand[] = [];
  const seen = new Set<string>();
  for (const url of urls) {
    if (out.length >= MAX_CANDIDATES) break;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(25_000) });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const meta = await sharp(buf).metadata();
      if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < 500) continue;
      const h = createHash("sha1").update(await sharp(buf).resize(32, 32, { fit: "fill" }).raw().toBuffer()).digest("hex");
      if (seen.has(h)) continue;
      seen.add(h);
      out.push({ url, buf });
    } catch { /* 다음 후보 */ }
  }
  return out;
}

/* ---------- 2) 문구 계약 (쿠팡 규칙) ---------- */
type Copy = {
  title: string; subtitle: string;
  features: { head: string; body: string }[];
  specs: { label: string; value: string }[];
  options: string; usage: string; careNote: string;
  faq: { q: string; a: string }[]; keywords: string[];
};
const FORBIDDEN = /CJ|dropship|드롭십|도매|원가|최저가|1위|베스트셀러|KC|인증|특허|의학|치료|효능|효과 보장|무료배송|무료 배송/i;

function validateCopy(c: Copy) {
  const all = JSON.stringify(c);
  const errs: string[] = [];
  if (!c.title || c.title.length > 60 || /[^\u0000-\u007F가-힣\s\-·.,!?()]/.test(c.title)) errs.push("title rule");
  if (c.features?.length !== 3) errs.push("features need 3");
  if ((c.faq?.length ?? 0) < 3) errs.push("faq need 3");
  if (!c.specs?.length) errs.push("specs required");
  if (FORBIDDEN.test(all)) errs.push(`forbidden word: ${all.match(FORBIDDEN)?.[0]}`);
  if (errs.length) throw new Error(errs.join("; "));
}

/* ---------- 3) 쿠팡 규칙 상세 HTML ---------- */
function renderHtml(c: Copy, imgs: string[]): string {
  const at = (i: number) => imgs[i % imgs.length]!;
  const img = (i: number, alt: string) => `<img src="${esc(at(i))}" alt="${esc(alt)}" style="display:block;width:100%;max-width:780px;margin:0 auto;border:0"/>`;
  const feature = (f: Copy["features"][number], i: number) => `
<div style="padding:36px 24px">
  <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#e85d4c">POINT ${String(i + 1).padStart(2, "0")}</p>
  <h2 style="margin:0 0 10px;font-size:22px;line-height:1.4;text-wrap:balance">${esc(f.head)}</h2>
  <p style="margin:0;font-size:15px;line-height:1.75;color:#4a4a4f">${esc(f.body)}</p>
</div>${img(i + 1, f.head)}`;
  const rest = imgs.slice(4).map((u, i) => `<img src="${esc(u)}" alt="${esc(c.title)} 상세 ${i + 1}" style="display:block;width:100%;max-width:780px;margin:0 auto;border:0"/>`).join("");
  return `<div style="width:100%;max-width:780px;margin:0 auto;font-family:Pretendard,'Noto Sans KR',sans-serif;color:#1a1a1a;background:#faf9f7;word-break:keep-all;line-height:1.7">
<div style="background:#1a1a1a;color:#fff;padding:10px 20px;text-align:center;font-size:14px">해외배송 상품입니다 · 구매 전 하단 배송·교환·반품 안내를 확인해 주세요</div>
<div style="padding:22px 24px 8px;font-size:20px;font-weight:800">LEXI.</div>
${img(0, c.title)}
<div style="padding:36px 24px">
  <h1 style="margin:0 0 10px;font-size:26px;line-height:1.35;text-wrap:balance">${esc(c.title)}</h1>
  <p style="margin:0 0 14px;font-size:16px;color:#6e6e73">${esc(c.subtitle)}</p>
  <p style="margin:0;font-size:14px;color:#4a4a4f">${esc(c.options)}</p>
</div>
${c.features.slice(0, 3).map(feature).join("")}
<div style="padding:36px 24px;background:#ebe6dc">
  <h2 style="margin:0 0 10px;font-size:22px">이렇게 활용해 보세요</h2>
  <p style="margin:0;font-size:15px;line-height:1.75;color:#4a4a4f">${esc(c.usage)}</p>
</div>
${rest}
<div style="padding:36px 24px">
  <h2 style="margin:0 0 14px;font-size:22px">DETAILS</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px">${c.specs.map((s) => `<tr><th style="text-align:left;width:32%;padding:10px 8px;border-bottom:1px solid #ddd;background:#f3f0ea">${esc(s.label)}</th><td style="padding:10px 8px;border-bottom:1px solid #ddd">${esc(s.value)}</td></tr>`).join("")}<tr><th style="text-align:left;padding:10px 8px;border-bottom:1px solid #ddd;background:#f3f0ea">브랜드</th><td style="padding:10px 8px;border-bottom:1px solid #ddd">LEXI</td></tr></table>
  <p style="margin:14px 0 0;font-size:14px;color:#6e6e73">${esc(c.careNote)}</p>
</div>
<div style="padding:8px 24px 36px">
  <h2 style="margin:0 0 14px;font-size:22px">FAQ</h2>
  ${c.faq.map((f) => `<p style="margin:0 0 4px;font-size:15px;font-weight:700">Q. ${esc(f.q)}</p><p style="margin:0 0 16px;font-size:14px;color:#4a4a4f">A. ${esc(f.a)}</p>`).join("")}
</div>
<div style="margin:0 24px 28px;padding:18px;background:#fff;border:2px solid #1a1a1a;border-radius:12px">
  <p style="margin:0 0 10px;font-size:16px;font-weight:800">필독 · 교환/반품 비용 (해외배송 왕복비용) 48,000원</p>
  <p style="margin:0 0 8px;font-size:15px">해외배송 상품으로 반품 시 해외택배 왕복비용이 공제됩니다.</p>
  <p style="margin:0;font-size:15px">제품 하자 시 절반을 판매자가 부담하여 <strong>24,000원</strong>이 공제됩니다.</p>
  <p style="margin:14px 0 0;font-size:15px;color:#6e6e73">배송: LEXI 소싱 해외배송 · 결제 후 영업일 기준 7~14일 도착</p>
</div>
<div style="padding:40px 24px;background:#1a1a1a;color:#fff;text-align:center"><b style="font-size:17px">LEXI IS RPCOW.</b><br/><span style="color:#bbb;font-size:14px">Radiant Presence, Captivating Outfit for your Wardrobe.</span></div>
</div>`;
}

/* ---------- 4) 이미지 가공·업로드 ---------- */
async function toSquareJpeg(buf: Buffer): Promise<Buffer> {
  return sharp(buf).rotate().flatten({ background: "#ffffff" })
    .resize(1000, 1000, { fit: "contain", background: "#ffffff" }).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
}
async function upload(path: string, body: Buffer): Promise<string> {
  const { put } = await import("@vercel/blob");
  const blob = await put(path, body, { access: "public", contentType: "image/jpeg", token: process.env.BLOB_READ_WRITE_TOKEN, addRandomSuffix: false, allowOverwrite: true });
  return blob.url;
}

/* ---------- 5) 명령 ---------- */
const workDir = (id: number | string) => `tmp/pdp-bulk/work-${id}`;

async function pickTarget(state: State): Promise<QueueItem | null> {
  const queue = await buildQueue();
  if (flag("id")) return queue.find((q) => q.productId === Number(val("id"))) ?? null;
  return queue.find((q) => !state[q.productId]) ?? null;
}

async function prepare() {
  const state = await loadState();
  const n = Number(val("n")) || 1;
  const queue = await buildQueue();
  const targets = flag("id") ? queue.filter((q) => q.productId === Number(val("id"))) : queue.filter((q) => !state[q.productId]).slice(0, n);
  if (!targets.length) return console.log("대상 없음");
  for (const q of targets) await prepareOne(q);
}

async function prepareOne(q: QueueItem) {
  const { fetchCjProductRaw } = await import("../../src/lib/sourcing/connectors/cjdropshipping");
  let raw: Record<string, unknown> | null = null;
  try {
    raw = await fetchCjProductRaw(q.externalId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/removed from shelves|not found/i.test(msg)) {
      const s = await loadState();
      s[q.productId] = { status: "skipped", reason: "cj-product-removed", at: new Date().toISOString() };
      await saveState(s);
      return console.log(`#${q.productId} CJ 판매 중단 → 자동 skip`);
    }
    throw e;
  }
  const dir = workDir(q.productId);
  await mkdir(dir, { recursive: true });
  if (!raw) return console.log(`#${q.productId} CJ 상품 없음 → skip 필요`);
  const cands = await downloadCandidates(imageUrls(raw));
  const tiles: sharp.OverlayOptions[] = [];
  const COLS = 4;
  const T = 360;
  for (let i = 0; i < cands.length; i++) {
    await writeFile(`${dir}/cand-${i}.jpg`, await sharp(cands[i]!.buf).rotate().jpeg({ quality: 90 }).toBuffer());
    const tile = await sharp(cands[i]!.buf).rotate().flatten({ background: "#fff" }).resize(T, T, { fit: "contain", background: "#fff" }).jpeg().toBuffer();
    const label = Buffer.from(`<svg width="${T}" height="${T}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="70" height="52" fill="#d00"/><text x="35" y="40" font-size="40" font-family="Arial" font-weight="bold" fill="#fff" text-anchor="middle">${i}</text></svg>`);
    tiles.push({ input: await sharp(tile).composite([{ input: label }]).toBuffer(), left: (i % COLS) * (T + 6), top: Math.floor(i / COLS) * (T + 6) });
  }
  const rows = Math.max(1, Math.ceil(cands.length / COLS));
  await sharp({ create: { width: COLS * (T + 6), height: rows * (T + 6), channels: 3, background: "#888" } }).composite(tiles).jpeg({ quality: 82 }).toFile(`${dir}/sheet.jpg`);
  const description = String(raw.description ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, 1500);
  const variants = ((raw.variants as { variantKey?: string }[] | undefined) ?? []).map((v) => v.variantKey).filter(Boolean).slice(0, 40);
  const data = { productId: q.productId, bucket: q.bucket, leaf: q.leaf, krw: q.krw, productNameEn: raw.productNameEn, category: raw.categoryName, type: raw.entryNameEn, material: raw.materialNameEn, optionAxes: raw.productKeyEn, weightG: raw.productWeight, variants, descriptionFromSupplier: description };
  await writeFile(`${dir}/data.json`, JSON.stringify(data, null, 1));
  console.log(JSON.stringify({ ...data, candidates: cands.length, sheet: `${dir}/sheet.jpg` }));
}

async function publish() {
  const id = Number(val("id"));
  const state = await loadState();
  const q = (await buildQueue()).find((x) => x.productId === id);
  if (!q) throw new Error(`#${id} 대상 아님(이미 게시됐거나 조건 불충족)`);
  const dir = workDir(id);
  const copy = JSON.parse(await readFile(val("copy"), "utf8")) as Copy;
  // 표준 문구 자동 보충: 배송·교환 FAQ, 관리 안내
  const STD_FAQ = [
    { q: "배송은 얼마나 걸리나요?", a: "해외 소싱 상품이라 결제 후 영업일 기준 7~14일 정도 소요됩니다." },
    { q: "교환·반품은 어떻게 하나요?", a: "해외배송 상품은 왕복 배송비 48,000원이 공제되며, 제품 하자 시에는 24,000원이 공제됩니다." },
  ];
  copy.faq = [...(copy.faq ?? []).filter((f) => !/배송은 얼마나|교환·반품/.test(f.q)).slice(0, 1), ...STD_FAQ];
  copy.careNote ||= "소재와 관리 방법은 제품 라벨을 확인해 주세요. 모니터에 따라 실제 색상이 다소 다르게 보일 수 있습니다.";
  copy.keywords ||= [];
  validateCopy(copy);
  const picks = val("clean").split(",").map((n) => Number(n.trim()));
  const bufs = await Promise.all(picks.map((i) => readFile(`${dir}/cand-${i}.jpg`)));
  const jpgs = await Promise.all(bufs.map(toSquareJpeg));

  if (DRY) {
    const local = await Promise.all(jpgs.map(async (b, i) => { await writeFile(`${dir}/out-${i}.jpg`, b); return `out-${i}.jpg`; }));
    await writeFile(`${dir}/preview.html`, `<meta charset="utf-8">${renderHtml(copy, local)}`);
    return console.log(`dry: ${dir}/preview.html`);
  }

  const urls: string[] = [];
  for (let i = 0; i < jpgs.length; i++) urls.push(await upload(`lexi/pdp-bulk/${q.externalId}/${i}.jpg`, jpgs[i]!));
  const html = renderHtml(copy, urls);
  if (FORBIDDEN.test(html.replace(/<img[^>]*>/g, ""))) throw new Error("forbidden word in html");

  const { db } = await import("../../src/db");
  const { catalogIndex, contentDocuments, productImages } = await import("../../src/db/schema");
  const { eq, sql } = await import("drizzle-orm");
  // 카탈로그가 존재하지 않는 문서를 가리키면(깨진 연결) 생성 로직이 갱신만 시도하므로 먼저 해제한다
  const [link] = await db().select({ docId: catalogIndex.documentId }).from(catalogIndex).where(eq(catalogIndex.id, q.catalogId)).limit(1);
  if (link?.docId != null) {
    const found = await db().select({ id: contentDocuments.id }).from(contentDocuments).where(eq(contentDocuments.id, link.docId)).limit(1);
    if (!found.length) await db().update(catalogIndex).set({ documentId: null }).where(eq(catalogIndex.id, q.catalogId));
  }
  const { generatePdpForCatalog } = await import("../../src/lib/pdp/generate");
  const { publishPdpToStorefront } = await import("../../src/lib/pdp/publish");
  const structured = {
    title: copy.title, subtitle: copy.subtitle, descriptionHtml: `<p>${esc(copy.subtitle)}</p>`,
    usps: copy.features.map((f) => f.head), faq: copy.faq.slice(0, 3), ctaLabel: "장바구니 담기",
    seoKeywords: copy.keywords, galleryAssetIndexes: urls.map((_, i) => i),
  };
  const { documentId } = await generatePdpForCatalog(q.catalogId, { structured, extraAssetUrls: urls });
  await db().update(contentDocuments).set({ renderedHtml: html, status: "published", updatedAt: new Date() }).where(eq(contentDocuments.id, documentId));
  await publishPdpToStorefront(documentId, "pdp-bulk");
  await db().update(productImages).set({ sort: sql`${productImages.sort} + 100` }).where(eq(productImages.productId, q.productId));
  await db().insert(productImages).values(urls.map((url, i) => ({ productId: q.productId, url, sort: i })));

  const heads = await Promise.all(urls.map(async (u) => (await fetch(u, { method: "HEAD" })).status));
  state[q.productId] = { status: "done", documentId, images: urls.length, at: new Date().toISOString() };
  await saveState(state);
  console.log(`published #${q.productId} doc ${documentId} slug ${q.slug} | images ${urls.length} (HEAD ${heads.join(",")}) | title: ${copy.title}`);
}

async function skip() {
  const state = await loadState();
  state[val("id")!] = { status: "skipped", reason: val("reason") ?? "manual", at: new Date().toISOString() };
  await saveState(state);
  console.log(`skipped #${val("id")}: ${val("reason")}`);
}

async function status() {
  const state = await loadState();
  const queue = await buildQueue();
  const c: Record<string, number> = { done: 0, skipped: 0, failed: 0 };
  for (const v of Object.values(state)) c[v.status] = (c[v.status] ?? 0) + 1;
  console.log(`queue(남은 대상) ${queue.length} | state done ${c.done} skipped ${c.skipped} failed ${c.failed} | 다음 대기 ${queue.filter((q) => !state[q.productId]).length}`);
}

const cmds: Record<string, () => Promise<void>> = { prepare, publish, skip, status };
(cmds[CMD] ?? status)().then(() => setTimeout(() => process.exit(0), 2500)).catch((e) => { console.error("failed:", e.message); process.exit(1); });
