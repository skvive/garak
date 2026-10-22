/**
 * 릴스/숏폼 HTML 생성 (M10) — ah-my-marketing amm-reels.md + Amore 스토리보드 결합.
 * 9:16(1080×1920) 자가 애니메이션 HTML: CSS keyframe 씬 페이드 + JS 시퀀서(timings[]).
 * 렌더 경로:
 *   (a) Playwright recordVideo로 재생 캡처 → webm  (amm-reels 방식)
 *   (b) Remotion 컴포지션(services/remotion)으로 스토리보드 JSON → MP4 (권장, 결정적)
 * 앱은 저작 레이어(HTML) + 스토리보드 JSON을 생성하고, 바이너리 렌더는 서비스가 수행.
 */
import type { Storyboard } from "./types";

const FONT = `'Pretendard','Pretendard Variable','Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif`;
const esc = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 스토리보드 + 이미지 URL 배열 → 자가재생 9:16 HTML (미리보기/recordVideo 캡처용) */
export function renderReelHtml(sb: Storyboard, images: string[]): string {
  const scenes = sb.scenes;
  const timings = scenes.map((s) => s.duration * 1000);
  const totalMs = timings.reduce((a, b) => a + b, 0);

  const sceneEls = scenes
    .map((sc, i) => {
      const img = images[sc.imageIndex] ?? images[0] ?? "";
      return `<div class="scene" data-i="${i}">
  <div class="img" style="background-image:url('${esc(img)}')"></div>
  <div class="overlay"><span>${esc(sc.overlayText)}</span></div>
</div>`;
    })
    .join("\n");

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;background:#111114;overflow:hidden;font-family:${FONT}}
.stage{position:relative;width:1080px;height:1920px}
.scene{position:absolute;inset:0;opacity:0;transition:opacity .4s ease}
.scene.active{opacity:1}
.img{position:absolute;inset:0;background-size:cover;background-position:center;
  animation:kenburns 5s ease-out both}
@keyframes kenburns{from{transform:scale(1)}to{transform:scale(1.08)}}
.overlay{position:absolute;left:64px;right:64px;bottom:280px;display:flex;justify-content:center}
.overlay span{background:rgba(0,0,0,.55);color:#fff;font-size:72px;font-weight:800;
  line-height:1.2;padding:24px 40px;border-radius:28px;text-align:center;letter-spacing:-1px}
.progress{position:absolute;left:0;top:0;height:10px;background:#FF5C4D;width:0;
  animation:bar ${totalMs}ms linear both}
@keyframes bar{to{width:100%}}
.brand{position:absolute;left:0;right:0;bottom:120px;text-align:center;color:#fff;
  font-size:48px;font-weight:800;letter-spacing:2px}</style></head>
<body><div class="stage">
  <div class="progress"></div>
  ${sceneEls}
  <div class="brand">${esc(sb.brand ?? "LEXI")}<span style="color:#FF5C4D">.</span></div>
</div>
<script>
const timings = ${JSON.stringify(timings)};
const scenes = [...document.querySelectorAll('.scene')];
let idx = 0;
function show(i){ scenes.forEach((s,k)=>s.classList.toggle('active', k===i)); }
function step(){ show(idx); const t = timings[idx] || 1000; idx++;
  if (idx < scenes.length) setTimeout(step, t); }
show(0); setTimeout(step, timings[0] || 1000);
window.__REEL_TOTAL_MS__ = ${totalMs};
</script>
</body></html>`;
}

/** 콘솔 미리보기: 9:16을 축소 스케일로 감싼 iframe */
export function reelPreviewHtml(sb: Storyboard, images: string[]): string {
  const inner = renderReelHtml(sb, images);
  const scale = 0.22;
  return `<!doctype html><html><head><meta charset="utf-8"/>
<style>body{margin:0;background:#e4e4e0;display:flex;justify-content:center;padding:16px}
.wrap{width:${Math.round(1080 * scale)}px;height:${Math.round(1920 * scale)}px}
iframe{border:0;width:1080px;height:1920px;transform:scale(${scale});transform-origin:top left}</style></head>
<body><div class="wrap"><iframe srcdoc="${esc(inner)}"></iframe></div></body></html>`;
}
