#!/usr/bin/env node
/**
 * AMBA MODEL LIST.pdf — 세련된 편집(editorial) 디자인 PDF 카탈로그
 *
 *   node scripts/generate-amba-catalog.mjs
 *
 * 렌더 전략: @napi-rs/canvas (150dpi) 픽셀 렌더 → pdf-lib 합성.
 * 한글은 시스템 폰트(Malgun Gothic / 맑은 고딕) 사용 → 한글 온전 렌더.
 *
 * Out: ambas-site/
 *   index.html
 *   AMBA MODEL LIST.pdf
 *   SUMMARY.json
 *   faces/*.webp
 *   thumbs/*.jpg
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { PDFDocument, rgb } from "pdf-lib";

const ROOT = process.cwd();
const INDEX = path.join(ROOT, "public", "casts", "amba", "index.json");
const OUT = path.join(ROOT, "ambas-site");
const PDF_NAME = "AMBA MODEL LIST.pdf";
const FACES = path.join(OUT, "faces");
const THUMBS = path.join(OUT, "thumbs");

/* ---------- 디자인 토큰 ---------- */
const W = 595; // pt @72dpi → 1240px @150dpi
const H = 842;
const SCALE = 150 / 72; // ≈2.0833
const INK = "#17161a";
const PAPER = "#f7f5f1";
const CORAL = "#e2543f";
const FOG = "#8b898d";
const LINE = "#dfd9cf";
const GOLD = "#b98a2f";
const CREAM = "#efece3";
const M = Math.round(42 * SCALE); // ≈88px

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function mapStyle(s) {
  const map = {
    STU: "Studio", BTY: "Beauty", STR: "Street", HIG: "High Fashion",
    SPO: "Sport", FML: "Formal", OUT: "Outdoor",
  };
  return map[s] || s || "";
}

/* ---------- 폰트 ---------- */
GlobalFonts.registerFromPath("C:/Windows/Fonts/malgun.ttf", "MalgunGothic");
GlobalFonts.registerFromPath("C:/Windows/Fonts/arialbd.ttf", "ArialBD");
GlobalFonts.registerFromPath("C:/Windows/Fonts/arial.ttf", "Arial");

const FONT_KR = "MalgunGothic";
const FONT_EN = "Arial";
const FONT_EN_B = "ArialBD";

/* ---------- util: 박스·텍스트 ---------- */
function box(ctx, x, y, w, h, fill, radius = 0) {
  ctx.save();
  ctx.fillStyle = fill;
  if (radius > 0) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}
function text(ctx, str, x, y, opts = {}) {
  const {
    font = FONT_EN, size = 12, color = INK, align = "left",
    weight = "", letterSpacing = 0, maxWidth = 0, lineHeight = 1.35,
  } = opts;
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  if (letterSpacing) ctx.letterSpacing = `${letterSpacing}px`;
  if (maxWidth > 0 && align === "left") {
    let s = str;
    while (ctx.measureText(s).width > maxWidth && s.length > 1) s = s.slice(0, -1);
    if (s.length !== str.length) s = s.replace(/\s\S*$/, "") + "…";
    ctx.fillText(s, x, y);
  } else {
    ctx.fillText(str, x, y);
  }
  ctx.restore();
}

/* ---------- 페이지 캔버스 래퍼 ---------- */
function newPage() {
  const canvas = createCanvas(Math.round(W * SCALE), Math.round(H * SCALE));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

function drawCoverPage(ctx, summary, natList, natFull) {
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  // 배경
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, cw, ch);
  // 골드 라인 top/bottom
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 0, cw, Math.round(14 * SCALE));
  ctx.fillRect(0, ch - Math.round(14 * SCALE), cw, Math.round(14 * SCALE));
  // 얇은 네온 라인
  ctx.strokeStyle = "rgba(185,138,47,0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(Math.round(70 * SCALE), Math.round(56 * SCALE), cw - Math.round(140 * SCALE), ch - Math.round(112 * SCALE));
  // 워드마크
  text(ctx, "AMBA  ·  AI AMBASSADOR AGENCY", Math.round(88 * SCALE), Math.round(64 * SCALE), {
    font: FONT_EN_B, size: Math.round(10 * SCALE), color: GOLD, letterSpacing: 2,
  });
  text(ctx, "AMBAS.RPCOW.COM", cw - Math.round(88 * SCALE), Math.round(64 * SCALE), {
    font: FONT_EN, size: Math.round(8 * SCALE), color: FOG, align: "right",
  });

  const cy = ch / 2 + Math.round(50 * SCALE);
  // 메인 타이포
  text(ctx, "AMBA", cw / 2, cy - Math.round(210 * SCALE), {
    font: FONT_EN_B, size: Math.round(118 * SCALE), color: "#f7f5f1", align: "center", letterSpacing: 6,
  });
  text(ctx, "AI AMBASSADOR AGENCY", cw / 2, cy - Math.round(70 * SCALE), {
    font: FONT_EN, size: Math.round(16 * SCALE), color: GOLD, align: "center", letterSpacing: 8,
  });
  text(ctx, "M O D E L   L I S T", cw / 2, cy - Math.round(18 * SCALE), {
    font: FONT_EN_B, size: Math.round(58 * SCALE), color: "#f7f5f1", align: "center", letterSpacing: 10,
  });
  text(ctx, "—  100% AI-GENERATED LOOKBOOK AGENCY  —", cw / 2, cy + Math.round(70 * SCALE), {
    font: FONT_EN, size: Math.round(11 * SCALE), color: FOG, align: "center", letterSpacing: 3,
  });

  // 통계
  const stats = [
    `${summary.count} MODELS`,
    `${summary.bySex.F} FEMALE`,
    `${summary.bySex.M} MALE`,
    `${Object.keys(summary.byNat).length} NATIONALITIES`,
    `${Object.keys(summary.byStyle).length} STYLES`,
  ];
  text(ctx, stats.join("   ·   "), cw / 2, cy + Math.round(150 * SCALE), {
    font: FONT_EN_B, size: Math.round(14 * SCALE), color: GOLD, align: "center", letterSpacing: 1,
  });
  // 국적
  const natLine = natList.slice(0, 10).map(([k, v]) => `${natFull[k] || k} ${v}`).join("   ·   ");
  text(ctx, natLine, cw / 2, cy + Math.round(190 * SCALE), {
    font: FONT_EN, size: Math.round(9 * SCALE), color: FOG, align: "center",
  });

  // 하단
  text(ctx, summary.generatedAt.slice(0, 10), Math.round(88 * SCALE), ch - Math.round(40 * SCALE), {
    font: FONT_EN, size: Math.round(8 * SCALE), color: FOG,
  });
}

function drawSheetPage(ctx, prepared, summary, pageStartIdx, pageNo, totalPages) {
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  // 헤더
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, cw, Math.round(98 * SCALE));
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, Math.round(98 * SCALE), cw, Math.round(4 * SCALE));
  text(ctx, "AMBA MODEL LIST", Math.round(88 * SCALE), Math.round(30 * SCALE), {
    font: FONT_EN_B, size: Math.round(22 * SCALE), color: "#f7f5f1",
  });
  text(ctx, `${summary.count} MODELS  ·  ${summary.bySex.F} F / ${summary.bySex.M} M  ·  ${Object.keys(summary.byNat).length} NATIONALITIES`, Math.round(88 * SCALE), Math.round(62 * SCALE), {
    font: FONT_EN, size: Math.round(10 * SCALE), color: FOG,
  });
  text(ctx, "AI AMBASSADOR AGENCY", cw - Math.round(88 * SCALE), Math.round(30 * SCALE), {
    font: FONT_EN, size: Math.round(10 * SCALE), color: FOG, align: "right",
  });
  text(ctx, "AMBAS.RPCOW.COM", cw - Math.round(88 * SCALE), Math.round(62 * SCALE), {
    font: FONT_EN_B, size: Math.round(11 * SCALE), color: GOLD, align: "right",
  });

  // 카드 그리드: 페이지당 2행 × 3열
  const cols = 3, rows = 2;
  const cwPx = (cw - M * 2 - 2 * 22 * SCALE) / 3;
  const imgW = cwPx - 2 * 14 * SCALE;
  const imgH = 330 * SCALE;
  const nameY = 14 * SCALE + imgH + 12 * SCALE;
  const natY = nameY + 24 * SCALE;
  const intrY = natY + 18 * SCALE;
  const idY = intrY + 18 * SCALE;
  const cardH = idY + 26 * SCALE - 8 * SCALE;
  const rowGap = 30 * SCALE;
  const startY = Math.round(140 * SCALE);

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const idx = pageStartIdx + r * cols + col;
      if (idx >= prepared.length) break;
      const c = prepared[idx];
      const x = M + col * (cwPx + 22 * SCALE);
      const y = startY + r * (cardH + rowGap);

      // 카드 배경
      box(ctx, x, y, cwPx, cardH, "#ffffff", 12);
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cwPx, cardH);
      // 이미지
      try {
        const img = loadImageSync(c.thumbAbs);
        const aspect = img.width / img.height;
        let dw = imgW, dh = imgW / aspect;
        if (dh < imgH) { dh = imgH; dw = imgH * aspect; }
        const dx = x + 14 * SCALE + (imgW - dw) / 2;
        const dy = y + 14 * SCALE + (imgH - dh) / 2;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 14 * SCALE, y + 14 * SCALE, imgW, imgH);
        ctx.clip();
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
      } catch {
        box(ctx, x + 14 * SCALE, y + 14 * SCALE, imgW, imgH, CREAM);
      }
      // 텍스트
      text(ctx, "AMBA · " + (c.styleLabel || "").toUpperCase(), x + 14 * SCALE, y + nameY, {
        font: FONT_EN_B, size: Math.round(8 * SCALE), color: CORAL, letterSpacing: 1,
      });
      text(ctx, c.name || "", x + 14 * SCALE, y + nameY + Math.round(18 * SCALE), {
        font: FONT_KR, size: Math.round(13 * SCALE), color: INK, weight: "bold", maxWidth: imgW,
      });
      text(ctx, `${c.gender} · ${c.nationality}`, x + 14 * SCALE, y + natY + Math.round(16 * SCALE), {
        font: FONT_KR, size: Math.round(10 * SCALE), color: FOG,
      });
      text(ctx, (c.interests || []).slice(0, 2).join(" · "), x + 14 * SCALE, y + intrY + Math.round(16 * SCALE), {
        font: FONT_KR, size: Math.round(9 * SCALE), color: FOG, maxWidth: imgW,
      });
      text(ctx, "ID " + (c.id || ""), x + 14 * SCALE, y + idY + Math.round(16 * SCALE), {
        font: FONT_EN_B, size: Math.round(9 * SCALE), color: GOLD,
      });
    }
  }

  // 푸터
  box(ctx, 0, ch - Math.round(74 * SCALE), cw, Math.round(74 * SCALE), PAPER);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, ch - Math.round(74 * SCALE));
  ctx.lineTo(cw, ch - Math.round(74 * SCALE));
  ctx.stroke();
  text(ctx, "(c) AMBA · AI AMBASSADOR AGENCY — fictional profiles included · " + summary.generatedAt.slice(0, 10), cw / 2, ch - Math.round(44 * SCALE), {
    font: FONT_EN, size: Math.round(9 * SCALE), color: FOG, align: "center",
  });
  text(ctx, `${pageNo} / ${totalPages}`, cw - Math.round(88 * SCALE), ch - Math.round(44 * SCALE), {
    font: FONT_EN, size: Math.round(9 * SCALE), color: FOG, align: "right",
  });
}

/* 동기 이미지 로드 캐시 */
const imgCache = new Map();
function loadImageSync(p) {
  if (!imgCache.has(p)) imgCache.set(p, loadImage(p));
  return imgCache.get(p);
}

async function main() {
  if (!fs.existsSync(INDEX)) {
    throw new Error("Missing public/casts/amba/index.json — run npm run casts:import-amba first");
  }
  const data = JSON.parse(fs.readFileSync(INDEX, "utf8"));
  const casts = data.casts || [];
  ensureDir(OUT);
  ensureDir(FACES);
  ensureDir(THUMBS);

  const prepared = [];
  for (const c of casts) {
    const srcFace = path.join(ROOT, "public", "casts", "amba", c.folder, "face.webp");
    if (!fs.existsSync(srcFace)) {
      console.warn("skip missing face", c.id);
      continue;
    }
    const faceName = `${c.folder}.webp`;
    const thumbName = `${c.folder}.jpg`;
    const faceOut = path.join(FACES, faceName);
    const thumbOut = path.join(THUMBS, thumbName);
    if (!fs.existsSync(faceOut)) fs.copyFileSync(srcFace, faceOut);
    if (!fs.existsSync(thumbOut)) {
      await sharp(srcFace)
        .rotate()
        .resize(320, 426, { fit: "cover" })
        .jpeg({ quality: 82 })
        .toFile(thumbOut);
    }
    prepared.push({ ...c, styleLabel: mapStyle(c.source?.style), faceRel: `faces/${faceName}`, thumbRel: `thumbs/${thumbName}`, thumbAbs: thumbOut });
  }

  prepared.sort((a, b) => a.source?.sex.localeCompare(b.source?.sex) || a.nationality.localeCompare(b.nationality) || a.id.localeCompare(b.id));

  const bySex = {
    F: prepared.filter((c) => c.source?.sex === "F").length,
    M: prepared.filter((c) => c.source?.sex === "M").length,
  };
  const byNat = {}, natFull = {};
  for (const c of prepared) {
    const code = c.source?.nat || "?";
    byNat[code] = (byNat[code] || 0) + 1;
    natFull[code] = c.nationality;
  }
  const natList = Object.entries(byNat).sort((a, b) => b[1] - a[1]);
  const byStyle = {};
  for (const c of prepared) byStyle[c.styleLabel] = (byStyle[c.styleLabel] || 0) + 1;

  const generatedAt = new Date().toISOString();
  const summary = {
    agency: "AMBA", agencyFull: "AI Ambassador", title: "AMBA MODEL LIST", generatedAt,
    count: prepared.length, bySex, byNat, byStyle,
    source: "public/casts/amba (lookbook-1000 done)",
    ambassadorRoot: data.ambassadorRoot, pdf: PDF_NAME, site: "https://ambas.rpcow.com",
  };
  fs.writeFileSync(path.join(OUT, "SUMMARY.json"), JSON.stringify(summary, null, 2), "utf8");

  /* ---- HTML 랜딩 ---- */
  const cards = prepared
    .map((c) => `
    <a class="card" href="${esc(c.faceRel)}" id="m-${esc(c.id)}">
      <img src="${esc(c.faceRel)}" alt="${esc(c.name)}" loading="lazy" width="400" height="533" />
      <div class="meta">
        <span class="agency">AMBA · ${esc(c.styleLabel)}</span>
        <h2>${esc(c.name)}</h2>
        <p>${esc(c.gender)} · ${esc(c.nationality)}</p>
        <p class="interests">${esc((c.interests || []).join(" · "))}</p>
        <p class="id">ID ${esc(c.id)}</p>
      </div>
    </a>`)
    .join("\n");
  const natChips = natList.map(([k, v]) => `<span class="chip">${esc(natFull[k] || k)} ${v}</span>`).join("");
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AMBA MODEL LIST · ${prepared.length} Models</title>
  <meta name="description" content="AMBA (AI Ambassador) agency model list — ${prepared.length} casts with fictional profiles." />
  <style>
    :root { --paper:#faf9f7; --ink:#17161a; --coral:#e2543f; --fog:#8b898d; --line:#dfd9cf; --cream:#f0ece3; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Pretendard, Inter, system-ui, sans-serif; background:var(--paper); color:var(--ink); }
    header { max-width:1120px; margin:0 auto; padding:48px 20px 24px; }
    .kicker { font-size:11px; letter-spacing:.26em; font-weight:800; color:var(--coral); text-transform:uppercase; }
    h1 { font-family: "Playfair Display", Georgia, serif; font-size:clamp(30px,4.5vw,46px); margin:10px 0 14px; font-weight:600; letter-spacing:-.01em; }
    .lead { color:var(--fog); line-height:1.7; max-width:660px; }
    .stats { display:flex; flex-wrap:wrap; gap:10px; margin:22px 0 8px; }
    .stat { border:1px solid var(--line); background:#fff; border-radius:16px; padding:14px 18px; min-width:120px; }
    .stat b { display:block; font-size:24px; font-family:"Playfair Display",Georgia,serif; }
    .stat span { font-size:12px; color:var(--fog); }
    .chips { display:flex; flex-wrap:wrap; gap:6px; margin:12px 0 8px; }
    .chip { font-size:11px; border:1px solid var(--line); border-radius:999px; padding:4px 11px; background:#fff; }
    .actions { margin:20px 0 8px; display:flex; gap:10px; flex-wrap:wrap; }
    .btn { display:inline-flex; align-items:center; gap:8px; border-radius:999px; padding:11px 20px; text-decoration:none; font-size:14px; font-weight:700; }
    .btn-primary { background:var(--ink); color:var(--paper); }
    .btn-ghost { border:1px solid var(--line); color:var(--ink); background:#fff; }
    .grid { max-width:1120px; margin:0 auto; padding:8px 20px 64px; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
    @media (min-width:720px){ .grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
    @media (min-width:1024px){ .grid { grid-template-columns:repeat(4,minmax(0,1fr)); } }
    .card { display:block; text-decoration:none; color:inherit; background:#fff; border:1px solid var(--line); border-radius:16px; overflow:hidden; transition:transform .2s,border-color .2s; }
    .card:hover { transform:translateY(-2px); border-color:var(--ink); }
    .card img { width:100%; aspect-ratio:3/4; object-fit:cover; display:block; background:var(--cream); }
    .meta { padding:12px; }
    .agency { font-size:10px; font-weight:800; letter-spacing:.16em; color:var(--coral); text-transform:uppercase; }
    .meta h2 { font-size:14px; margin:6px 0 4px; }
    .meta p { margin:0; font-size:12px; color:var(--fog); }
    .interests { margin-top:6px !important; line-height:1.4; }
    .id { margin-top:6px !important; font-family:ui-monospace,monospace; font-size:11px !important; }
    footer { max-width:1120px; margin:0 auto; padding:0 20px 48px; color:var(--fog); font-size:12px; }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&display=swap" rel="stylesheet" />
</head>
<body>
  <header>
    <p class="kicker">AMBA · AI Ambassador</p>
    <h1>Model List</h1>
    <p class="lead">AI AMBASSADOR AGENCY — LEXI Style 화보용 AMBA 소속 가상 모델 ${prepared.length}명. 가상 프로필(이름·국적·관심사)과 face seed 이미지 포함. 생성시각 ${esc(generatedAt)}.</p>
    <div class="stats">
      <div class="stat"><b>${prepared.length}</b><span>Total Models</span></div>
      <div class="stat"><b>${bySex.F}</b><span>Female</span></div>
      <div class="stat"><b>${bySex.M}</b><span>Male</span></div>
      <div class="stat"><b>${Object.keys(byNat).length}</b><span>Nationalities</span></div>
      <div class="stat"><b>${Object.keys(byStyle).length}</b><span>Styles</span></div>
    </div>
    <div class="chips">${natChips}</div>
    <div class="actions">
      <a class="btn btn-primary" href="./${esc(PDF_NAME).replace(/ /g, "%20")}">PDF 카탈로그 다운로드 (${PDF_NAME})</a>
      <a class="btn btn-ghost" href="./SUMMARY.json">SUMMARY.json</a>
    </div>
  </header>
  <section class="grid">
    ${cards}
  </section>
  <footer>
    AMBA (AI Ambassador) Agency · Source lookbook-1000 done casts · ambas.rpcow.com
  </footer>
</body>
</html>`;
  fs.writeFileSync(path.join(OUT, "index.html"), html, "utf8");

  /* ---- PDF: canvas 렌더 → pdf-lib 합성 ---- */
  const perPage = 6;
  const pages = [];
  // 커버
  const coverPage = newPage();
  drawCoverPage(coverPage.ctx, summary, natList, natFull);
  pages.push(coverPage);

  const totalSheets = Math.ceil(prepared.length / perPage);
  for (let s = 0; s < totalSheets; s++) {
    const pg = newPage();
    drawSheetPage(pg.ctx, prepared, summary, s * perPage, s + 1, totalSheets);
    pages.push(pg);
  }

  const pdf = await PDFDocument.create();
  pdf.setTitle("AMBA MODEL LIST — AI Ambassador Agency");
  pdf.setAuthor("AMBA · AI Ambassador Agency");
  pdf.setSubject("AI Ambassador agency model catalog with fictional profiles");
  pdf.setKeywords(["AMBA", "AI Ambassador", "lookbook", "model", "LEXI Style", "catalog"]);
  for (const p of pages) {
    const png = p.canvas.toBuffer("image/png");
    const img = await pdf.embedPng(png);
    const page = pdf.addPage([W, H]);
    page.drawImage(img, { x: 0, y: 0, width: W, height: H });
  }
  const pdfPath = path.join(OUT, PDF_NAME);
  fs.writeFileSync(pdfPath, await pdf.save());

  console.log(JSON.stringify({
    ok: true, count: prepared.length, bySex, styles: Object.keys(byStyle).length,
    pdfSheets: totalSheets, totalPages: pages.length, out: OUT, pdf: pdfPath,
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });