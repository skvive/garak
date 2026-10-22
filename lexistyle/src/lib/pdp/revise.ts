/**
 * HQ 스튜디오 "수정" — 운영자의 자연어 지시로 PDP 문구(structured)를 AI가 교정한다.
 * 지시한 부분만 바꾸고 나머지는 그대로 둔다. 프로바이더: DeepSeek(OpenRouter) → OpenAI. 키가 없으면 명시적 오류.
 */
import { validatePdp, type PdpStructured } from "./ruleset";

type Provider = { name: string; url: string; key: string; model: string; json: boolean };

function providers(): Provider[] {
  const out: Provider[] = [];
  const ds = process.env.DEEPSEEK_API_KEY?.trim() || process.env.OPENROUTER_API_KEY?.trim();
  if (ds) {
    out.push({
      name: "deepseek",
      url:
        process.env.DEEPSEEK_ENDPOINT?.trim() ||
        process.env.OPENROUTER_BASE_URL?.trim() ||
        (process.env.OPENROUTER_API_KEY?.trim() ? "https://openrouter.ai/api/v1/chat/completions" : "http://127.0.0.1:8000/v1/chat/completions"),
      key: ds,
      model: process.env.DEEPSEEK_PDP_MODEL || "deepseek/deepseek-v4-flash",
      json: false,
    });
  }
  const oa = process.env.OPENAI_API_KEY?.trim();
  if (oa) {
    out.push({
      name: "openai",
      url: "https://api.openai.com/v1/chat/completions",
      key: oa,
      model: process.env.OPENAI_PDP_MODEL || "gpt-4o-mini",
      json: true,
    });
  }
  return out;
}

export function reviseConfigured() {
  return providers().length > 0;
}

/** 모델이 넣을 수 있는 스크립트·인라인 이벤트 제거 */
function cleanHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/javascript:/gi, "");
}

function parseJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(t);
}

export async function revisePdpWithAI(input: {
  structured: PdpStructured;
  instruction: string;
  locale?: string;
}): Promise<{ doc: PdpStructured; engine: string; model: string }> {
  const list = providers();
  if (!list.length) throw new Error("AI 키(OPENAI_API_KEY 또는 OPENROUTER_API_KEY)가 설정되지 않아 수정할 수 없습니다");

  const prompt = `You are LEXI's product-page copy editor. An operator reviewed the page and gave a correction instruction.
Apply ONLY what the instruction asks; keep every other field exactly as it is. Write in ${input.locale === "en" ? "English" : "Korean"} unless the instruction says otherwise.
Rules: never invent certifications, clinical claims, fake review counts or rankings; never use the words cheap, wholesale, dropshipping, free shipping, hot sale; usps must stay exactly 3 short bullets; faq must stay 2+ items; keep galleryAssetIndexes unchanged.
Return ONLY the full JSON object with the same schema, no markdown fences.

CURRENT PAGE JSON:
${JSON.stringify(input.structured)}

OPERATOR INSTRUCTION:
${input.instruction.slice(0, 2000)}`;

  const errs: string[] = [];
  for (const p of list) {
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: p.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 4000,
          ...(p.json ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: AbortSignal.timeout(60_000),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        errs.push(`${p.name}: ${json?.error?.message ?? res.status}`);
        continue;
      }
      const text = json?.choices?.[0]?.message?.content;
      if (!text) {
        errs.push(`${p.name}: 빈 응답`);
        continue;
      }
      const parsed = parseJson(text) as Partial<PdpStructured>;
      const doc: PdpStructured = {
        ...input.structured,
        ...parsed,
        descriptionHtml: cleanHtml(String(parsed.descriptionHtml ?? input.structured.descriptionHtml ?? "")),
        galleryAssetIndexes: input.structured.galleryAssetIndexes, // 이미지 배치는 AI가 바꾸지 않는다
      };
      const errors = validatePdp(doc);
      if (errors.length) {
        errs.push(`${p.name}: 검증 실패 (${errors.join(", ")})`);
        continue;
      }
      return { doc, engine: p.name, model: p.model };
    } catch (e) {
      errs.push(`${p.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(`AI 수정에 실패했습니다 — ${errs.join(" | ")}`);
}
