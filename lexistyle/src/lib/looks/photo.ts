import sharp from "sharp";

export async function normalizePortrait(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3_000_000 || !file.size) {
    throw new Error("JPG·PNG·WEBP 사진을 3MB 이하로 선택해 주세요.");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const input = sharp(bytes, { limitInputPixels: 32_000_000, animated: false });
  const meta = await input.metadata();
  if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < 240 || (meta.pages ?? 1) > 1) {
    throw new Error("가로·세로 240px 이상의 정지 사진을 선택해 주세요.");
  }
  if (Math.max(meta.width, meta.height) / Math.min(meta.width, meta.height) > 4) throw new Error("얼굴이 잘 보이는 세로 또는 정사각형 사진을 선택해 주세요.");
  const clean = await input.rotate().resize(1200, 1600, { fit: "inside", withoutEnlargement: true }).flatten({ background: "#f5f5f3" }).jpeg({ quality: 85 }).toBuffer();
  return `data:image/jpeg;base64,${clean.toString("base64")}`;
}

export function checkOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) throw new Error("같은 사이트에서 다시 시도해 주세요.");
}
