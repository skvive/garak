import { put } from "@vercel/blob";
import { fail, json, sessionEmail } from "@/lib/shorts/http";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** 수동 입력용 상품 이미지 업로드 (로그인, 4MB 이하) */
export async function POST(req: Request) {
  const email = await sessionEmail();
  if (!email) return json({ error: "이미지를 올리려면 로그인해 주세요." }, 401);
  if (!process.env.BLOB_READ_WRITE_TOKEN) return json({ error: "이미지 업로드를 준비 중입니다. 이미지 URL을 입력해 주세요." }, 503);
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "이미지 파일을 선택해 주세요." }, 400);
    const ext = TYPES[file.type];
    if (!ext) return json({ error: "JPG, PNG, WEBP만 올릴 수 있습니다." }, 415);
    if (file.size > 4_000_000) return json({ error: "이미지는 4MB 이하로 올려 주세요." }, 413);
    const blob = await put(`shorts/uploads/${crypto.randomUUID()}.${ext}`, file, { access: "public", contentType: file.type });
    return json({ url: blob.url });
  } catch (e) {
    return fail(e);
  }
}
