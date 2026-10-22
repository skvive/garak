/**
 * DeepSeek v4 Flash PDP 텍스트 생성기 (OpenRouter 경유)
 * 로컬 프록시 http://127.0.0.1:8000/v1/chat/completions
 * 모델: deepseek/deepseek-v4-flash
 * 키는 OpenRouter 키로 대체, DEEPSEEK_API_KEY 환경변수 또는 OPENROUTER_API_KEY 사용
 */
import { PDP_SYSTEM_PROMPT, validatePdp, type PdpStructured } from "./ruleset";

export function deepseekConfigured() {
  return Boolean(
    process.env.DEEPSEEK_API_KEY?.trim() || process.env.OPENROUTER_API_KEY?.trim(),
  );
}

function apiKey() {
  return (
    process.env.DEEPSEEK_API_KEY?.trim() ||
    process.env.OPENROUTER_API_KEY?.trim() ||
    ""
  );
}

function endpoint() {
  return (
    process.env.DEEPSEEK_ENDPOINT?.trim() ||
    process.env.OPENROUTER_BASE_URL?.trim() ||
    "http://127.0.0.1:8000/v1/chat/completions"
  );
}

function modelName() {
  return process.env.DEEPSEEK_PDP_MODEL || "deepseek/deepseek-v4-flash";
}

export async function generatePdpWithDeepSeek(input: {
  title: string;
  category: string;
  price: string;
  seller?: string;
  description?: string;
  locale?: string;
  assetUrls: string[];
  voice?: string;
  copyRuleset?: string;
}): Promise<{ doc: PdpStructured; engine: "deepseek"; model: string } | null> {
  if (!deepseekConfigured()) return null;

  const voiceLine = input.voice?.trim()
    ? `brand voice (tone & style): ${input.voice.trim()}`
    : "";
  const rulesetLine = input.copyRuleset?.trim()
    ? `copy ruleset id: ${input.copyRuleset.trim()}`
    : "";
  const conceptLines = [voiceLine, rulesetLine].filter(Boolean).join("\n");

  const prompt = `${PDP_SYSTEM_PROMPT}
${conceptLines ? `\n${conceptLines}` : ""}

locale: ${input.locale ?? "ko"}
product title: ${input.title}
category: ${input.category}
price: ${input.price}
seller: ${input.seller ?? "verified"}
supplier notes (do not copy verbatim): ${(input.description ?? "").slice(0, 1200)}
assetUrls (use indexes in galleryAssetIndexes): ${JSON.stringify(input.assetUrls)}

Respond with ONLY a valid JSON object matching this schema. No markdown fences, no extra text.
{
  "title": string,
  "subtitle": string,
  "descriptionHtml": string,
  "usps": string[3],
  "faq": [{"q": string, "a": string}, {"q": string, "a": string}],
  "ctaLabel": string,
  "seoKeywords": string[],
  "galleryAssetIndexes": number[]
}`;

  try {
    const url = endpoint();
    const key = apiKey();
    const model = modelName();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    // OpenRouter 경유 시 헤더 추가
    if (url.includes("openrouter") || url.includes("127.0.0.1")) {
      headers["Authorization"] = `Bearer ${key}`;
      headers["HTTP-Referer"] = "https://lexistyle.vercel.app";
      headers["X-Title"] = "LEXI PDP Factory";
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(90_000),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn("[deepseek pdp]", json?.error?.message ?? res.status, url);
      return null;
    }

    const text = json?.choices?.[0]?.message?.content;
    if (!text) return null;

    // JSON 추출 (마크다운 코드블록 대응)
    const cleaned = text
      .replace(/```(?:json)?\s*/gi, "")
      .replace(/```\s*$/gm, "")
      .trim();
    const parsed = JSON.parse(cleaned) as PdpStructured;
    const errors = validatePdp(parsed);
    if (errors.length) {
      console.warn("[deepseek pdp validation]", errors);
      return null;
    }
    return { doc: parsed, engine: "deepseek", model };
  } catch (e) {
    console.warn("[deepseek pdp]", e);
    return null;
  }
}