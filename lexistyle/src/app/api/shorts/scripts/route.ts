import { sanitizeProduct } from "@/lib/shorts/extract";
import { buildShortScripts, type ShortProduct } from "@/lib/shorts/script";
import { fail, json } from "@/lib/shorts/http";

export const dynamic = "force-dynamic";

/** POST {product} → 대본 3종 (수동 입력·수정 후 재생성, 무료) */
export async function POST(req: Request) {
  try {
    const { product } = (await req.json().catch(() => ({}))) as { product?: Partial<ShortProduct> };
    const p = sanitizeProduct(product ?? {});
    return json({ product: p, scripts: buildShortScripts(p) });
  } catch (e) {
    return fail(e);
  }
}
