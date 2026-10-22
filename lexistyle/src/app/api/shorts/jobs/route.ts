import { sanitizeProduct } from "@/lib/shorts/extract";
import type { ShortProduct, ShortScript } from "@/lib/shorts/script";
import { createJob, listJobs } from "@/lib/shorts/service";
import { fail, json, sessionEmail } from "@/lib/shorts/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const email = await sessionEmail();
  if (!email) return json({ error: "로그인이 필요합니다." }, 401);
  try {
    return json({ jobs: await listJobs(email) });
  } catch (e) {
    return fail(e);
  }
}

/** POST {product, script} → 크레딧 1 차감 후 렌더 잡 생성 */
export async function POST(req: Request) {
  const email = await sessionEmail();
  if (!email) return json({ error: "영상을 만들려면 로그인해 주세요." }, 401);
  try {
    const body = (await req.json().catch(() => ({}))) as { product?: Partial<ShortProduct>; script?: ShortScript };
    if (!body.script) return json({ error: "대본을 선택해 주세요." }, 400);
    const product = sanitizeProduct(body.product ?? {});
    const job = await createJob(email, product, body.script);
    return json({ job }, 202);
  } catch (e) {
    return fail(e);
  }
}
