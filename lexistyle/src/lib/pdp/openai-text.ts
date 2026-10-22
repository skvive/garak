/** OpenAI(GPT 계열) PDP 문구 생성기 — 키 없거나 실패 시 null 반환(호출부가 다음 프로바이더로 폴백). */
import { PDP_SYSTEM_PROMPT, validatePdp, type PdpStructured } from "./ruleset";

export function openaiTextConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function modelName() {
  return process.env.OPENAI_PDP_MODEL || "gpt-4o-mini";
}

export async function generatePdpWithOpenAI(input: {
  title: string;
  category: string;
  price: string;
  seller?: string;
  description?: string;
  locale?: string;
  assetUrls: string[];
  voice?: string;
  copyRuleset?: string;
}): Promise<{ doc: PdpStructured; engine: "openai"; model: string } | null> {
  if (!openaiTextConfigured()) return null;

  const voiceLine = input.voice?.trim() ? `brand voice (tone & style): ${input.voice.trim()}` : "";
  const rulesetLine = input.copyRuleset?.trim() ? `copy ruleset id: ${input.copyRuleset.trim()}` : "";
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

Respond with ONLY a JSON object matching this schema (no markdown fences):
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
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY!.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName(),
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn("[openai pdp]", json?.error?.message ?? res.status);
      return null;
    }
    const text = json?.choices?.[0]?.message?.content;
    if (!text) return null;
    const parsed = JSON.parse(text) as PdpStructured;
    const errors = validatePdp(parsed);
    if (errors.length) {
      console.warn("[openai pdp validation]", errors);
      return null;
    }
    return { doc: parsed, engine: "openai", model: modelName() };
  } catch (e) {
    console.warn("[openai pdp]", e);
    return null;
  }
}
