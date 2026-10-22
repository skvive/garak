/** Gemini PDP generator — 키 없으면 template 폴백 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PDP_SYSTEM_PROMPT, templatePdp, type PdpStructured, validatePdp } from "./ruleset";

export function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function modelName() {
  return process.env.LEXI_PDP_MODEL || "gemini-2.0-flash";
}

export async function generatePdpWithGemini(input: {
  title: string;
  category: string;
  price: string;
  seller?: string;
  description?: string;
  locale?: string;
  assetUrls: string[];
  voice?: string;
  copyRuleset?: string;
}): Promise<{ doc: PdpStructured; engine: "gemini" | "template"; model?: string }> {
  const fallback = () => ({
    doc: templatePdp({
      title: input.title,
      category: input.category,
      price: input.price,
      seller: input.seller,
    }),
    engine: "template" as const,
  });

  if (!geminiConfigured()) return fallback();

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: modelName(),
      generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
    });
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

JSON schema:
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

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as PdpStructured;
    const errors = validatePdp(parsed);
    if (errors.length) {
      console.warn("[gemini pdp validation]", errors);
      return fallback();
    }
    return { doc: parsed, engine: "gemini", model: modelName() };
  } catch (e) {
    console.warn("[gemini pdp]", e);
    return fallback();
  }
}
