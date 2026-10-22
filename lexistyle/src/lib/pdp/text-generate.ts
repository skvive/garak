/** PDP 문구 생성 프로바이더 선택 — deepseek → gemini → openai(GPT) → template. */
import { generatePdpWithOpenAI } from "./openai-text";
import { generatePdpWithGemini } from "./gemini";
import { generatePdpWithDeepSeek } from "./deepseek";
import type { PdpStructured } from "./ruleset";

export type PdpTextInput = {
  title: string;
  category: string;
  price: string;
  seller?: string;
  description?: string;
  locale?: string;
  assetUrls: string[];
  voice?: string;
  copyRuleset?: string;
};

export async function generatePdpText(
  input: PdpTextInput,
): Promise<{ doc: PdpStructured; engine: "deepseek" | "gemini" | "openai" | "template"; model?: string }> {
  // 1순위: DeepSeek v4 Flash (OpenRouter 로컬 프록시)
  const viaDeepSeek = await generatePdpWithDeepSeek(input);
  if (viaDeepSeek) return viaDeepSeek;

  // 2순위: Gemini
  const viaGemini = await generatePdpWithGemini(input);
  if (viaGemini.engine === "gemini") return viaGemini;

  // 3순위: OpenAI
  const viaOpenAI = await generatePdpWithOpenAI(input);
  if (viaOpenAI) return viaOpenAI;

  // 폴백: 템플릿
  return viaGemini;
}