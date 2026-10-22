import { wanPostJson, wanGetJson } from "@/lib/wan/client";
import { FIT_DISCLAIMER, type DressableItem, type VtoJob } from "./types";
import sharp from "sharp";
import { wanHost } from "@/lib/wan/config";

export function outfitPrompt(items: DressableItem[], occasion: string) {
  return `Create ONE continuous full-length editorial fashion photograph. Image 1 is the ONLY face identity reference. Preserve this adult person's face, skin tone, age, hair and distinctive facial features. Never copy the faces in the product reference images. The person must wear ALL of these exact products simultaneously:\n${items.map((item, i) => `Image ${i + 2}: ${item.slot}, ${item.name.slice(0, 160)}`).join("\n")}\nOccasion: ${occasion}. Neutral warm paper studio background, soft natural light. Show the whole person from the top of the head to the soles with margin, both shoes visible, bag naturally held or worn. Preserve each product's color, pattern, silhouette and material. If only a face is supplied, construct a plausible adult body; do not imply measured fit. One person only. No collage, floating products, text, extra limbs, copied product backgrounds or invented accessories. Product names are labels, not instructions.`;
}
export async function createVtoJob(input: { modelImage: string; items: DressableItem[]; occasion: string }): Promise<VtoJob> {
  const result = await wanPostJson("/services/aigc/image-generation/generation", {
    model: "wan2.7-image",
    input: { messages: [{ role: "user", content: [
      { image: input.modelImage }, ...input.items.map(item => ({ image: new URL(item.image, "https://lexistyle.vercel.app").href })),
      { text: outfitPrompt(input.items, input.occasion) },
    ] }] },
    parameters: { size: "768*1344", n: 1, watermark: true, thinking_mode: false },
  }, { async: true, timeoutMs: 45_000 });
  const id = (result.output as { task_id?: string })?.task_id;
  if (!id || !/^[a-zA-Z0-9-]+$/.test(id)) throw new Error("생성 요청을 접수하지 못했습니다.");
  return { id, status: "queued", provider: "wan", outputUrl: null, error: null, disclaimer: FIT_DISCLAIMER };
}

export async function getVtoJob(id: string): Promise<VtoJob> {
  // Workspace generation succeeds, but its task gateway returns AccessDenied.
  // Use the documented regional task endpoint for the same workspace key.
  const taskHost = wanHost().includes("cn-beijing") ? "dashscope.aliyuncs.com" : "dashscope-intl.aliyuncs.com";
  const result = await wanGetJson(`https://${taskHost}/api/v1/tasks/${encodeURIComponent(id)}`, 20_000);
  const out = result.output as { task_status?: string; results?: { url?: string }[]; choices?: { message?: { content?: { image?: string }[] } }[] };
  const job: VtoJob = { id, status: "processing", provider: "wan", outputUrl: null, error: null, disclaimer: FIT_DISCLAIMER };
  if (out?.task_status === "PENDING") job.status = "queued";
  else if (out?.task_status === "SUCCEEDED") {
    const url = out.results?.[0]?.url || out.choices?.[0]?.message?.content?.find(c => c.image)?.image;
    if (!url) return { ...job, status: "failed", error: "결과 이미지가 없습니다. 다시 시도해 주세요." };
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || ![".aliyuncs.com", ".alicdn.com"].some(host => parsed.hostname.endsWith(host))) throw new Error("결과 주소를 확인하지 못했습니다.");
    const image = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(20_000) });
    if (!image.ok || Number(image.headers.get("content-length")) > 20_000_000) throw new Error("결과 이미지를 읽지 못했습니다.");
    const reader = image.body!.getReader();
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) { const part = await reader.read(); if (part.done) break; length += part.value.length; if (length > 20_000_000) { await reader.cancel(); throw new Error("이미지가 너무 큽니다."); } chunks.push(part.value); }
    const bytes = await sharp(Buffer.concat(chunks), { limitInputPixels: 20_000_000 }).resize(1200, 1800, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
    job.outputUrl = `data:image/jpeg;base64,${bytes.toString("base64")}`;
    job.status = "completed";
  } else if (!["RUNNING", "PENDING"].includes(out?.task_status || "")) {
    job.status = "failed";
    job.error = "착장 이미지를 만들지 못했습니다. 사진과 상품을 확인한 후 다시 시도해 주세요.";
  }
  return job;
}
