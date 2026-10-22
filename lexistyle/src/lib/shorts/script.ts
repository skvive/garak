/**
 * CommerceShorts 대본 엔진 — 상품 1건 → 템플릿 3종 15초 숏폼 대본.
 * marketing/hooks(Hook Lab) + antislop 재사용. LLM 없이 결정적으로 동작하고,
 * LLM을 붙여도 verify/normalize는 그대로 통과시켜 렌더러는 항상 유효한 대본을 받는다.
 */
import { generateHooks } from "@/lib/marketing/hooks";
import { antiSlop } from "@/lib/marketing/antislop";
import { distributeSeconds, TOTAL_SECONDS, MAX_OVERLAY } from "@/lib/marketing/storyboard";
import type { HookType } from "@/lib/marketing/types";

export type ShortProduct = {
  sourceUrl: string;
  title: string;
  brand?: string | null;
  priceAmount?: number | null;
  originalPrice?: number | null;
  currency: string;
  imageUrls: string[];
  features: string[];
  reviews: string[];
};

export const TEMPLATES = ["ugc_review", "discount_sale", "brand_emotion"] as const;
export type ShortTemplate = (typeof TEMPLATES)[number];
export type ShortVisual = "kenburns" | "wan_i2v";

export type ShortScene = {
  sceneId: number;
  duration: number;
  narration: string;
  overlayText: string;
  visual: ShortVisual;
  imageIndex: number;
};

export type ShortScript = {
  template: ShortTemplate;
  label: string;
  hookText: string;
  cta: string;
  scenes: ShortScene[];
  totalSeconds: number;
  valid: boolean;
  source: "template" | "normalized";
};

export const TEMPLATE_LABEL: Record<ShortTemplate, string> = {
  ugc_review: "UGC 리뷰형",
  discount_sale: "세일 강조형",
  brand_emotion: "감성 브랜딩형",
};

const HOOK_PREF: Record<ShortTemplate, HookType[]> = {
  ugc_review: ["SOC", "PAIN", "QUES"],
  discount_sale: ["PAIN", "BENE", "STAT"],
  brand_emotion: ["EMO", "QUES", "BENE"],
};

const HANGUL = /[가-힣]/;
const MAX_HOOK = 28;
const MAX_NARRATION = 40;

/** 단어 경계에서 자르기 */
export function clip(text: string, max: number): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp >= max * 0.5 ? cut.slice(0, sp) : cut).trim();
}

function overlay(text: string, fallback: string): string {
  const t = clip(antiSlop(text).text, MAX_OVERLAY);
  return HANGUL.test(t) ? t : fallback;
}

export function formatPrice(amount: number | null | undefined, currency: string): string {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return "";
  if (currency === "KRW") return `${Math.round(amount).toLocaleString("ko-KR")}원`;
  return `${currency === "USD" ? "$" : `${currency} `}${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function discountRate(p: ShortProduct): number {
  const { priceAmount: now, originalPrice: was } = p;
  if (!now || !was || was <= now) return 0;
  return Math.round(((was - now) / was) * 100);
}

function shortName(title: string): string {
  const t = title.replace(/\[[^\]]*\]|\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  return clip(t, 12) || "이 아이템";
}

/** 템플릿별 씬 설계: [오버레이, 나레이션] */
function sceneLines(t: ShortTemplate, p: ShortProduct, hook: string): [string, string][] {
  const name = shortName(p.title);
  const f1 = p.features[0] ?? `${name}의 디테일`;
  const f2 = p.features[1] ?? "매일 손이 가는 구성";
  const review = p.reviews[0] ?? "재구매 후기가 많아요";
  const price = formatPrice(p.priceAmount, p.currency);
  const rate = discountRate(p);

  if (t === "ugc_review") {
    return [
      [hook, hook],
      [`직접 써보니 ${clip(f1, 8)}`, `직접 써보니 ${f1}`],
      [`후기: ${clip(review, 10)}`, review],
      [clip(f2, MAX_OVERLAY), f2],
      ["링크에서 확인하세요", `${name}, 링크에서 바로 확인하세요`],
    ];
  }
  if (t === "discount_sale") {
    return [
      [hook, hook],
      [rate ? `지금 ${rate}% 할인` : price ? `단 ${price}` : "오늘만 특가", rate && price ? `지금 ${rate}% 할인, ${price}` : `특가로 만나는 ${name}`],
      [clip(f1, MAX_OVERLAY), f1],
      ["수량 한정 진행 중", "준비된 수량이 빠르게 줄고 있어요"],
      ["지금 바로 구매", "품절 전에 지금 바로 담으세요"],
    ];
  }
  return [
    [hook, hook],
    [clip(f1, MAX_OVERLAY), f1],
    [clip(f2, MAX_OVERLAY), f2],
    [p.brand ? clip(`${p.brand}의 감도`, MAX_OVERLAY) : "일상을 바꾸는 한 끗", "일상을 바꾸는 한 끗"],
    ["지금 만나보세요", `${name}, 지금 만나보세요`],
  ];
}

function pickHook(t: ShortTemplate, p: ShortProduct): string {
  const hooks = generateHooks(
    {
      title: p.title,
      category: shortName(p.title),
      benefit: shortName(p.title),
      painPoint: t === "discount_sale" ? "비싼 가격" : "매일 반복되는 고민",
      audience: "구매 고객",
    },
    18,
  );
  for (const type of HOOK_PREF[t]) {
    const h = hooks.find((x) => x.type === type && HANGUL.test(x.text) && x.text.length <= MAX_HOOK);
    if (h) return h.text;
  }
  return clip(hooks[0]?.text ?? "지금 가장 많이 담는 아이템", MAX_HOOK);
}

export function buildShortScript(t: ShortTemplate, p: ShortProduct): ShortScript {
  const hookText = pickHook(t, p);
  const lines = sceneLines(t, p, hookText);
  const secs = distributeSeconds(lines.length, TOTAL_SECONDS);
  const imgCount = Math.max(1, p.imageUrls.length);
  const scenes: ShortScene[] = lines.map(([ov, nar], i) => ({
    sceneId: i + 1,
    duration: secs[i],
    overlayText: overlay(ov, "지금 확인하세요"),
    narration: clip(antiSlop(nar).text, MAX_NARRATION),
    visual: t === "brand_emotion" && i === 0 ? "wan_i2v" : "kenburns",
    imageIndex: i % imgCount,
  }));
  const script: ShortScript = {
    template: t,
    label: TEMPLATE_LABEL[t],
    hookText,
    cta: lines[lines.length - 1][0],
    scenes,
    totalSeconds: TOTAL_SECONDS,
    valid: false,
    source: "template",
  };
  script.valid = verifyShortScript(script, imgCount);
  return script.valid ? script : normalizeShortScript(script, imgCount);
}

export function buildShortScripts(p: ShortProduct): ShortScript[] {
  return TEMPLATES.map((t) => buildShortScript(t, p));
}

export function verifyShortScript(s: ShortScript, imgCount: number): boolean {
  if (!TEMPLATES.includes(s.template)) return false;
  if (!s.hookText || s.hookText.length > MAX_HOOK + 6) return false;
  if (s.scenes.length < 3 || s.scenes.length > 6) return false;
  const sum = s.scenes.reduce((a, x) => a + x.duration, 0);
  if (sum !== TOTAL_SECONDS) return false;
  return s.scenes.every(
    (x) =>
      Number.isInteger(x.duration) &&
      x.duration >= 2 &&
      HANGUL.test(x.overlayText) &&
      x.overlayText.length <= MAX_OVERLAY &&
      x.narration.length <= MAX_NARRATION &&
      (x.visual === "kenburns" || x.visual === "wan_i2v") &&
      Number.isInteger(x.imageIndex) &&
      x.imageIndex >= 0 &&
      x.imageIndex < Math.max(1, imgCount),
  );
}

/** 외부(LLM·클라이언트) 입력도 렌더 가능한 형태로 강제 */
export function normalizeShortScript(s: ShortScript, imgCount: number): ShortScript {
  const n = Math.max(1, imgCount);
  const raw = Array.isArray(s.scenes) ? s.scenes.slice(0, 6) : [];
  while (raw.length < 3) {
    raw.push({ sceneId: raw.length + 1, duration: 3, narration: "", overlayText: "지금 확인하세요", visual: "kenburns", imageIndex: 0 });
  }
  const secs = distributeSeconds(raw.length, TOTAL_SECONDS);
  const scenes = raw.map((x, i) => ({
    sceneId: i + 1,
    duration: secs[i],
    overlayText: overlay(String(x.overlayText ?? ""), "지금 확인하세요"),
    narration: clip(String(x.narration ?? ""), MAX_NARRATION),
    visual: (x.visual === "wan_i2v" ? "wan_i2v" : "kenburns") as ShortVisual,
    imageIndex: Number.isInteger(x.imageIndex) && x.imageIndex >= 0 ? x.imageIndex % n : 0,
  }));
  const template = TEMPLATES.includes(s.template) ? s.template : "ugc_review";
  const hook = clip(String(s.hookText ?? ""), MAX_HOOK);
  return {
    template,
    label: TEMPLATE_LABEL[template],
    hookText: HANGUL.test(hook) ? hook : "지금 가장 많이 담는 아이템",
    cta: clip(String(s.cta ?? scenes[scenes.length - 1].overlayText), MAX_OVERLAY),
    scenes,
    totalSeconds: TOTAL_SECONDS,
    valid: true,
    source: "normalized",
  };
}
