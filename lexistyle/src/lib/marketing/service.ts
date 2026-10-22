/**
 * AI 마케팅 피드 서비스 레이어 (M9~M11).
 * 상품(리스팅) → 마케팅 자산 생성(훅·카피·카드뉴스·스토리보드) → 검수 → 발행(Compounding).
 * HQ 스냅샷 스토어에 자산·학습·캠페인로그를 기록한다(현행 v1 내구화와 동일).
 */
import { audit, iso, mutate, nextId } from "@/lib/hq/store";
import type { HqState } from "@/lib/hq/store";
import { toUsd } from "@/lib/hq/types";
import type {
  CopyVariant, Hook, MarketingAsset, MarketingAssetType, Storyboard,
} from "./types";
import { generateHooks, type HookSeed } from "./hooks";
import { generateCopy, type LmfSeed } from "./lmf";
import { generateCardNews } from "./cardnews";
import { buildStoryboard } from "./storyboard";
import { renderReelHtml, reelPreviewHtml } from "./reels";
import { embed, embedOne, classify, semanticSearch, summarizeCentroid } from "./embed";
import { rankByEvidenceThenIce, needsHumanReview } from "./ice";

const AI_MODEL = "lexi-marketing-v1"; // 결정적 엔진. LLM 스왑인 시 교체.

/* ---------- 리스팅 → 시드 추출 ---------- */
function seedFromListing(s: HqState, listingId: number) {
  const listing = s.listings.find((l) => l.id === listingId);
  if (!listing) throw new Error("listing not found");
  const draft = s.drafts.find((d) => d.id === listing.draftId);
  const sp = draft ? s.supplierProducts.find((p) => p.id === draft.supplierProductId) : undefined;
  const title = draft?.title ?? sp?.rawTitle ?? `상품 #${listingId}`;
  const category = (sp?.rawCategoryPath?.at(-1) ?? draft?.seoKeywords?.[0] ?? "라이프스타일").toString();
  const kw = draft?.seoKeywords ?? [];
  const benefit = kw[1] ?? "매일 쓰고 싶은 실사용감";
  const painPoint = "마땅한 정품을 못 찾던 불편";
  const images = (draft?.assets ?? []).map((a) => a.url).filter(Boolean);
  return { listing, draft, sp, title, category, benefit, painPoint, images };
}

/* ---------- 자산 1건 저장 헬퍼 ---------- */
function pushAsset(
  s: HqState,
  base: Omit<MarketingAsset, "id" | "createdAt" | "reviewState" | "aiModel">,
): MarketingAsset {
  const asset: MarketingAsset = {
    ...base,
    id: nextId(s),
    reviewState: base.ice && needsHumanReview(base.ice) ? "draft" : "draft",
    aiModel: AI_MODEL,
    createdAt: iso(),
  };
  s.marketingAssets.unshift(asset);
  return asset;
}

/* ---------- M11: 상품 → 전체 마케팅 킷 생성 ---------- */
export async function generateMarketingKit(listingId: number, actor: string) {
  // 1) 순수 로직 생성(스토어 밖에서 계산 → 임베딩 비동기 포함)
  const pre = await mutate((s) => seedFromListing(s, listingId));
  const { title, category, benefit, painPoint, images } = pre;

  const audience = "해외직구 셀렉트족";
  const hookSeed: HookSeed = { title, category, benefit, painPoint, audience };
  const lmfSeed: LmfSeed = { title, category, benefit, painPoint, audience, priceUsd: pre.listing.sellPriceUsd };

  const hooks: Hook[] = generateHooks(hookSeed, 10);
  const copy: CopyVariant[] = generateCopy(lmfSeed, 1);

  const cardnews = generateCardNews({
    hook: hooks[0]?.text ?? `${category}, 새롭게`,
    painPoint,
    benefit,
    category,
    evidence: "정품 직소싱 · 관세 사전계산",
    detail: copy[0]?.body ?? "LEXI 큐레이션",
    cta: copy[0]?.cta ?? "지금 담아두기",
    heroImage: images[0],
    brand: "LEXI",
  }, "4:5");

  const overlays = [
    hooks[0]?.text ?? "지금 만나보세요",
    benefit,
    copy[0]?.headline ?? category,
    copy[0]?.cta ?? "지금 담기",
  ].map((t) => t.slice(0, 15));
  const storyboard: Storyboard = buildStoryboard({
    imageCount: Math.max(2, images.length || 3),
    overlays,
    bgmMood: "clean",
    brand: "LEXI",
  });
  const reelHtml = renderReelHtml(storyboard, images.length ? images : ["", "", ""]);
  const reelPreview = reelPreviewHtml(storyboard, images.length ? images : ["", "", ""]);

  // 2) 임베딩(시맨틱 검색용) — 대표 텍스트
  const repText = `${title} ${category} ${hooks[0]?.text ?? ""} ${copy[0]?.headline ?? ""}`;
  const emb = await embedOne(repText);

  // 3) 스토어에 자산 4종 기록
  return mutate((s) => {
    const bestHook = rankByEvidenceThenIce(hooks)[0];
    const bestCopy = copy[0];
    const created: MarketingAsset[] = [];

    created.push(pushAsset(s, {
      listingId, type: "hooks", title: `훅 ${hooks.length}종 — ${title}`,
      payload: { hooks }, ice: bestHook?.ice, embedding: emb,
      channelTargets: [bestHook?.channel ?? "메타 피드/IMG1x1"],
    }));
    created.push(pushAsset(s, {
      listingId, type: "copy", title: `카피 ${copy.length}종 — ${title}`,
      payload: { copy }, ice: bestCopy?.ice, embedding: emb,
      channelTargets: ["lexi", "coupang"],
    }));
    created.push(pushAsset(s, {
      listingId, type: "cardnews", title: `카드뉴스 ${cardnews.slides.length}컷 — ${title}`,
      payload: { ratio: cardnews.ratio, dims: cardnews.dims, slides: cardnews.slides.map((x) => ({ index: x.index, role: x.role, title: x.title })) },
      renderedHtml: cardnews.previewHtml, embedding: emb,
      channelTargets: ["sns"],
    }));
    created.push(pushAsset(s, {
      listingId, type: "storyboard", title: `숏폼 15초 — ${title}`,
      payload: { storyboard, reelHtml }, embedding: emb,
      renderedHtml: reelPreview,
      channelTargets: ["sns", "coupang"],
    }));

    audit(s, "marketing_kit", listingId, "generated", actor, undefined, { assets: created.length });
    return { listingId, created: created.map((a) => a.id), counts: { hooks: hooks.length, copy: copy.length, slides: cardnews.slides.length } };
  });
}

/* ---------- 검수 ---------- */
export async function reviewAsset(assetId: number, decision: "approved" | "rejected", actor: string) {
  return mutate((s) => {
    const a = s.marketingAssets.find((x) => x.id === assetId);
    if (!a) throw new Error("asset not found");
    const from = a.reviewState;
    a.reviewState = decision;
    a.reviewedBy = actor;
    a.reviewedAt = iso();
    audit(s, "marketing_asset", assetId, decision, actor, from);
    return { asset: a };
  });
}

/* ---------- 발행 → Compounding (campaign_log + learning) ---------- */
export async function publishAsset(assetId: number, channel: string, actor: string) {
  return mutate((s) => {
    const a = s.marketingAssets.find((x) => x.id === assetId);
    if (!a) throw new Error("asset not found");
    if (a.reviewState !== "approved") throw new Error("승인된 자산만 발행 가능");
    const listing = s.listings.find((l) => l.id === a.listingId);
    const draft = listing ? s.drafts.find((d) => d.id === listing.draftId) : undefined;
    const sp = draft ? s.supplierProducts.find((p) => p.id === draft.supplierProductId) : undefined;
    const category = sp?.rawCategoryPath?.at(-1) ?? "라이프스타일";

    // campaign_log write-back (GATE-6 불변식)
    const log = {
      id: nextId(s), listingId: a.listingId, assetId, channel,
      assetType: a.type as MarketingAssetType, iceScore: a.ice?.score ?? 0,
      metrics: {}, status: "published" as const, publishedAt: iso(), createdAt: iso(),
    };
    s.campaignLog.unshift(log);

    // learning 누적 (카피/훅이면 소구 언어 기록)
    if (a.type === "copy" || a.type === "hooks") {
      const appeal =
        a.type === "copy"
          ? ((a.payload.copy as CopyVariant[])?.[0]?.headline ?? a.title)
          : ((a.payload.hooks as Hook[])?.[0]?.text ?? a.title);
      s.marketingLearnings.unshift({
        id: nextId(s), listingId: a.listingId, category,
        appealText: appeal, customerLanguage: appeal,
        evidence: a.ice?.evidence ?? "Emerging",
        impact: a.ice?.impact ?? 5, confidence: a.ice?.confidence ?? 5, ease: a.ice?.ease ?? 5,
        outcome: "pending", createdAt: iso(),
      });
    }
    audit(s, "marketing_asset", assetId, "published", actor, a.reviewState, { channel });
    return { published: log.id, channel };
  });
}

/** 성과 반영 → 승자 승격 (Compounding 폐루프) */
export async function recordOutcome(logId: number, metrics: { impressions?: number; ctr?: number; cvr?: number }, actor: string) {
  return mutate((s) => {
    const log = s.campaignLog.find((l) => l.id === logId);
    if (!log) throw new Error("campaign log not found");
    log.metrics = { ...log.metrics, ...metrics };
    const winner = (metrics.ctr ?? 0) >= 0.02 || (metrics.cvr ?? 0) >= 0.01;
    const learning = s.marketingLearnings.find((l) => l.listingId === log.listingId && l.outcome === "pending");
    if (learning) learning.outcome = winner ? "winner" : "rejected";
    audit(s, "campaign_log", logId, winner ? "winner" : "recorded", actor);
    return { logId, winner };
  });
}

/* ---------- 시맨틱 검색 / 분류 (M8) ---------- */
export async function searchMarketing(query: string, s: HqState, topK = 10) {
  const hits = await semanticSearch(query, s.marketingAssets, topK);
  return hits.map((h) => ({ id: h.item.id, type: h.item.type, title: h.item.title, score: h.score }));
}

export async function classifyText(text: string, s: HqState) {
  return classify(text, s.contentCategories, 3);
}

/** 학습 원장 요약 (centroid 추출) — 카테고리별 인사이트 */
export async function summarizeLearnings(s: HqState, n = 5) {
  const texts = s.marketingLearnings.map((l) => `${l.appealText} (${l.evidence})`);
  if (texts.length === 0) return [];
  const embs = await embed(texts);
  return summarizeCentroid(texts, embs, n);
}
