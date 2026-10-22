/**
 * LLM 카피 리뉴얼 — 공급처 원본 상품을 LEXI 에디토리얼 카피로 재창작.
 *
 * 스펙 §2 P3의 "loyadbeta AI 잡" 자리를 채우는 구현체.
 * 기존 결정적 템플릿(generate.ts)은 금칙어 제거·대소문자 정리 수준이라
 * 제목/본문이 공급처 원본과 사실상 같았다. 여기서는 실제로 다시 쓴다.
 *
 * ANTHROPIC_API_KEY 미설정 시 null을 반환해 호출측이 템플릿으로 폴백한다
 * (커넥터들과 동일한 configured() 분기 패턴).
 */
import type { SupplierProduct } from "@/lib/hq/types";

export type RenewalCopy = {
  title: string;
  subtitle: string;
  descriptionHtml: string;
  usps: string[];
  seoKeywords: string[];
  model: string;
};

const MODEL = process.env.LEXI_RENEWAL_MODEL?.trim() || "claude-sonnet-5";

export const llmRenewalConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY?.trim());

const SYSTEM = `You are a senior e-commerce copywriter for LEXI, a curated K-style cross-border boutique.
Rewrite raw supplier listings (often machine-translated, keyword-stuffed Chinese factory copy) into clean editorial English.

Rules:
- Invent NO facts: no materials, sizes, certifications, or origin claims not present in the input.
- Drop supplier spam: "hot sale", "cheap", "dropshipping", "2024/2025", ALL-CAPS shouting, emoji.
- Title: 4-9 words, specific and human. Never a keyword list.
- Tone: understated, confident, editorial. No hype, no exclamation marks.
- USPs must be about what the product IS, not vague promises.
Return ONLY valid JSON, no markdown fence.`;

function userPrompt(sp: SupplierProduct) {
  return `Rewrite this supplier listing.

Raw title: ${sp.rawTitle}
Supplier category path: ${sp.rawCategoryPath.join(" > ")}
Supplier price: ${sp.priceOriginal} ${sp.currency}
Seller: ${sp.sellerName ?? "unknown"}
Raw description: ${(sp.rawDescriptionHtml ?? "").replace(/<[^>]+>/g, " ").slice(0, 600) || "(none provided)"}

Return JSON exactly:
{
  "title": "...",
  "subtitle": "one short editorial line",
  "descriptionHtml": "<p>2-3 sentences of editorial body copy.</p>",
  "usps": ["...", "...", "..."],
  "seoKeywords": ["...", "..."]
}`;
}

/** 실패/미설정 시 null → 호출측이 템플릿 폴백 */
export async function generateCopyLLM(sp: SupplierProduct): Promise<RenewalCopy | null> {
  if (!llmRenewalConfigured()) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!.trim(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        system: SYSTEM,
        messages: [{ role: "user", content: userPrompt(sp) }],
      }),
    });
    if (!res.ok) {
      console.error("[renewal.llm]", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = json.content?.find((c) => c.type === "text")?.text ?? "";
    const parsed = JSON.parse(text.replace(/^```(?:json)?|```$/g, "").trim()) as Partial<RenewalCopy>;
    if (!parsed.title) return null;
    return {
      title: String(parsed.title).slice(0, 80),
      subtitle: String(parsed.subtitle ?? ""),
      descriptionHtml: String(parsed.descriptionHtml ?? `<p>${parsed.title}</p>`),
      usps: (parsed.usps ?? []).map(String).slice(0, 4),
      seoKeywords: (parsed.seoKeywords ?? []).map(String).slice(0, 10),
      model: `anthropic:${MODEL}`,
    };
  } catch (e) {
    console.error("[renewal.llm]", e instanceof Error ? e.message : e);
    return null;
  }
}
