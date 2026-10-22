/** designDoc → HTML 렌더러 — 자사몰 PDP와 Cafe24/쿠팡 상세HTML 공용. 스펙 §2 P3 */
import type { DesignBlock, ListingDraft } from "@/lib/hq/types";
import type { LayoutId } from "@/lib/pdp/concept-spec";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const DEFAULT_TOKENS = {
  paper: "#faf9f7",
  ink: "#1a1a1a",
  accent: "#e85d4c",
  radius: "14px",
  heroRatio: "4/5",
};

export type RenderDesignOptions = {
  layoutId?: LayoutId;
  tokens?: Record<string, string>;
};

function mergeTokens(tokens?: Record<string, string>): Record<string, string> {
  return { ...DEFAULT_TOKENS, ...tokens };
}

function layoutStyles(layoutId: LayoutId = "editorial-fullbleed") {
  switch (layoutId) {
    case "lookbook-split":
      return { pad: "20px", h1: "28px", base: "15px", maxW: "960px" };
    case "catalog-compact":
      return { pad: "12px", h1: "20px", base: "13px", maxW: "640px" };
    default:
      return { pad: "24px", h1: "32px", base: "15px", maxW: "720px" };
  }
}

export function renderDesignDoc(
  doc: { blocks: DesignBlock[] },
  assets: ListingDraft["assets"],
  opts?: RenderDesignOptions,
): string {
  const layoutId = opts?.layoutId ?? "editorial-fullbleed";
  const tok = mergeTokens(opts?.tokens);
  const ls = layoutStyles(layoutId);
  const muted = "#6e6e73";
  const border = "#e4e4e0";
  const img = (i: number) => esc(assets[i]?.url ?? "");
  const heroImgStyle = `border-radius:${tok.radius};aspect-ratio:${tok.heroRatio};object-fit:cover`;

  const parts = doc.blocks.map((b) => {
    switch (b.type) {
      case "hero": {
        if (layoutId === "lookbook-split") {
          return `<section style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:center;padding:${ls.pad} 0">
  <img src="${img(b.assetIndex)}" alt="" style="width:100%;${heroImgStyle}"/>
  <div>
    <h1 style="font-size:${ls.h1};margin:0 0 8px;color:${tok.ink}">${esc(b.headline)}</h1>
    ${b.sub ? `<p style="color:${muted};margin:0;font-size:${ls.base}">${esc(b.sub)}</p>` : ""}
  </div>
</section>`;
        }
        const fullBleed = layoutId === "editorial-fullbleed";
        return `<section style="text-align:center;padding:${ls.pad} 0">
  <img src="${img(b.assetIndex)}" alt="" style="${fullBleed ? "width:100%;" : "max-width:100%;"}${heroImgStyle}"/>
  <h1 style="font-size:${ls.h1};margin:16px 0 4px;color:${tok.ink}">${esc(b.headline)}</h1>
  ${b.sub ? `<p style="color:${muted};font-size:${ls.base}">${esc(b.sub)}</p>` : ""}
</section>`;
      }
      case "usp":
        return `<ul style="padding:0 8px;list-style:none;font-size:${ls.base}">
${b.items.map((i) => `  <li style="padding:8px 0;border-bottom:1px solid ${border};color:${tok.ink}">✓ ${esc(i)}</li>`).join("\n")}
</ul>`;
      case "gallery":
        return `<section style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;padding:${ls.pad} 0">
${b.assetIndexes.map((i) => `  <img src="${img(i)}" alt="" style="width:100%;border-radius:${tok.radius}"/>`).join("\n")}
</section>`;
      case "story":
        return `<section style="padding:${ls.pad} 8px;font-size:${ls.base};line-height:1.6;color:${tok.ink}">${b.html}</section>`;
      case "spec-table":
        return `<table style="width:100%;border-collapse:collapse;font-size:${ls.base}">
${b.rows.map(([k, v]) => `  <tr><th style="text-align:left;padding:8px;border:1px solid ${border};background:${tok.paper};color:${tok.ink}">${esc(k)}</th><td style="padding:8px;border:1px solid ${border};color:${tok.ink}">${esc(v)}</td></tr>`).join("\n")}
</table>`;
      case "faq":
        return b.items
          .map(
            (f) =>
              `<details style="border:1px solid ${border};border-radius:${tok.radius};padding:12px;margin:8px 0;font-size:${ls.base}"><summary style="font-weight:700;color:${tok.ink}">${esc(f.q)}</summary><p style="color:${muted}">${esc(f.a)}</p></details>`,
          )
          .join("\n");
      case "cta":
        return `<div style="text-align:center;padding:${ls.pad} 0"><span style="display:inline-block;background:${tok.accent};color:#fff;font-weight:700;padding:14px 40px;border-radius:${tok.radius}">${esc(b.label)}</span></div>`;
    }
  });

  const ogSrc = tok.ogImage || assets[0]?.url || "";
  const ogBlock = ogSrc
    ? `<section data-block="og" style="padding:${ls.pad} 8px">
  <p style="font-size:11px;letter-spacing:.1em;color:${tok.accent};font-weight:700;margin:0 0 8px">SHARE · OG</p>
  <h2 style="font-size:20px;margin:0 0 12px;font-weight:800;color:${tok.ink}">LEXI OG 이미지</h2>
  <figure style="margin:0">
    <img src="${esc(ogSrc)}" alt="LEXI OG" width="1200" height="630" style="width:100%;height:auto;display:block;border-radius:${tok.radius};border:1px solid ${border};aspect-ratio:1200/630;object-fit:cover;background:#fff"/>
  </figure>
</section>`
    : "";

  return `<div class="lexi-pdp" data-layout="${layoutId}" style="max-width:${ls.maxW};margin:0 auto;font-family:Pretendard,Inter,sans-serif;color:${tok.ink};background:${tok.paper};font-size:${ls.base}">
${parts.join("\n")}
${ogBlock}
</div>`;
}
