/**
 * P3 리뉴얼 초안 생성기 — 스펙 §2 P3
 *
 * v1은 결정적 템플릿 엔진("lexi-pdp-v1")으로 designDoc/카피를 생성한다.
 * loyadbeta AI 잡(LLM 카피 + 이미지 생성)이 준비되면 같은 스키마의 draft를
 * POST /api/hq/drafts 로 밀어넣어 이 함수를 대체한다 — 승인 게이트는 동일.
 */
import { audit, iso, mutate, nextId } from "@/lib/hq/store";
import type { DesignBlock, ListingDraft, SupplierProduct } from "@/lib/hq/types";
import { toUsd } from "@/lib/hq/types";
import { renderDesignDoc } from "./render";
import { generateCopyLLM, llmRenewalConfigured, type RenewalCopy } from "./llm";

const STOPWORDS = /\b(cheap|hot sale|free shipping|wholesale|dropshipping|2024|2025|2026)\b/gi;

function polishTitle(raw: string) {
  const cleaned = raw.replace(STOPWORDS, "").replace(/\s{2,}/g, " ").trim();
  return cleaned
    .split(" ")
    .map((w) => (w.length > 2 && w === w.toUpperCase() ? w[0] + w.slice(1).toLowerCase() : w))
    .join(" ")
    .slice(0, 80);
}

function uspFrom(sp: SupplierProduct): string[] {
  const cat = sp.rawCategoryPath.at(-1) ?? "Lifestyle";
  return [
    `Curated ${cat.toLowerCase()} pick — quality-checked before every shipment`,
    `Duty-calculated pricing: what you see is the final landed cost`,
    sp.stock > 200 ? "In stock and ready for fast dispatch" : "Small-batch stock — limited availability",
  ];
}

export function buildDraft(
  sp: SupplierProduct,
  collectionId: number | undefined,
  version: number,
  genId: () => number,
  copy?: RenewalCopy | null,
): ListingDraft {
  const title = copy?.title ?? polishTitle(sp.rawTitle);
  const hero = sp.images[0]?.url ?? "https://picsum.photos/seed/lexi/800/800";
  const assets: ListingDraft["assets"] = [
    { kind: "hero", url: hero, source: "template" },
    ...sp.images.slice(1, 4).map((i) => ({ kind: "detail" as const, url: i.url, source: "template" as const })),
  ];
  const blocks: DesignBlock[] = [
    { type: "hero", headline: title, sub: copy?.subtitle || `From our ${sp.rawCategoryPath.join(" · ")} edit`, assetIndex: 0 },
    { type: "usp", items: copy?.usps?.length ? copy.usps : uspFrom(sp) },
    ...(assets.length > 1 ? [{ type: "gallery", assetIndexes: assets.slice(1).map((_, i) => i + 1) } as DesignBlock] : []),
    {
      type: "spec-table",
      rows: [
        ["Category", sp.rawCategoryPath.join(" > ")],
        ["Sourced from", sp.sellerName ?? "Verified partner"],
        ["Dispatch", "1–2 business days after sourcing confirmation"],
      ],
    },
    {
      type: "faq",
      items: [
        { q: "Who handles returns?", a: "After-sales service is managed by the supplier's A/S center; we coordinate the ticket for you." },
        { q: "Are duties included?", a: "Yes — the checkout total includes estimated duties for your country." },
      ],
    },
    { type: "cta", label: "Add to cart" },
  ];
  const designDoc = { blocks };
  return {
    id: genId(),
    supplierProductId: sp.id,
    collectionId,
    version,
    title,
    subtitle:
      copy?.subtitle ||
      `Sourced cost ${sp.currency} ${sp.priceOriginal} ≈ $${toUsd(sp.priceOriginal, sp.currency)}`,
    descriptionHtml:
      copy?.descriptionHtml ??
      `<p>${title} — fully redesigned listing. Original supplier content replaced with LEXI editorial copy.</p>`,
    seoKeywords: copy?.seoKeywords?.length
      ? copy.seoKeywords
      : [...new Set([...sp.rawCategoryPath, ...title.split(" ").filter((w) => w.length > 3)])].slice(0, 10),
    designDoc,
    renderedHtml: renderDesignDoc(designDoc, assets),
    assets,
    aiModel: copy?.model ?? "template:lexi-pdp-v1",
    status: "review",
    createdAt: iso(),
  };
}

/** 컬렉션 내 approved 아이템 전체에 대해 초안 생성(재생성 시 version+1).
 *  ANTHROPIC_API_KEY 설정 시 LLM이 카피를 재창작하고, 미설정/실패 시 템플릿으로 폴백한다. */
export async function generateDraftsForCollection(collectionId: number, actor: string) {
  return mutate(async (s) => {
    const items = s.collectionItems.filter((i) => i.collectionId === collectionId && i.decision === "approved");
    const made: number[] = [];
    let llmUsed = 0;
    for (const item of items) {
      const sp = s.supplierProducts.find((p) => p.id === item.supplierProductId);
      if (!sp) continue;
      const prev = s.drafts.filter((d) => d.supplierProductId === sp.id);
      if (prev.some((d) => d.status === "review" || d.status === "approved")) continue; // 중복 방지
      const copy = await generateCopyLLM(sp);
      if (copy) llmUsed++;
      const draft = buildDraft(sp, collectionId, prev.length + 1, () => nextId(s), copy);
      s.drafts.unshift(draft);
      audit(s, "listing_draft", draft.id, "review", actor, "draft", { supplierProductId: sp.id, llm: Boolean(copy) });
      made.push(draft.id);
    }
    return {
      generated: made.length,
      draftIds: made,
      llmUsed,
      engine: llmRenewalConfigured() ? "llm(+template fallback)" : "template",
    };
  });
}
