import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { localAssetsDir } from "@/lib/local-store";

export const runtime = "nodejs";

/** 로컬 개발: 홈 `.lexi-local/data/assets` 이미지를 브라우저에서 서빙 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const parts = (await ctx.params).path ?? [];
  if (!parts.length || parts.some((p) => p.includes("..") || p.includes("\\"))) {
    return NextResponse.json({ error: "bad path" }, { status: 400 });
  }

  const root = path.resolve(localAssetsDir());
  const filePath = path.resolve(root, ...parts);
  if (!filePath.startsWith(root)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const buf = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const type =
      ext === ".webp"
        ? "image/webp"
        : ext === ".png"
          ? "image/png"
          : ext === ".jpg" || ext === ".jpeg"
            ? "image/jpeg"
            : "application/octet-stream";
    return new NextResponse(buf, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
