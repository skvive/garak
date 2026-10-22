import { extractProduct } from "@/lib/shorts/extract";
import { buildShortScripts } from "@/lib/shorts/script";
import { fail, json } from "@/lib/shorts/http";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** POST {url} → 상품 + 대본 3종 미리보기 (무료·비로그인) */
export async function POST(req: Request) {
  try {
    const { url } = (await req.json().catch(() => ({}))) as { url?: string };
    if (!url) return json({ error: "상품 URL을 입력해 주세요." }, 400);
    const product = await extractProduct(url);
    return json({ product, scripts: buildShortScripts(product) });
  } catch (e) {
    return fail(e);
  }
}
