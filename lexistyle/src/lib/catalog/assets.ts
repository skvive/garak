/** 이미지 다운로드 → sharp WebP → Blob / 로컬 파일 폴백 */
import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { db, hasDb } from "@/db";
import { assetCache } from "@/db/schema";
import { eq } from "drizzle-orm";
import { localStore, scheduleLocalPersist, localAssetsDir } from "@/lib/local-store";

export type AssetVariant = "thumb" | "card" | "pdp";

const SIZES: Record<AssetVariant, number> = {
  thumb: 160,
  card: 480,
  pdp: 1200,
};

type MemAsset = {
  id: number;
  catalogId: number | null;
  supplierCode: string;
  externalId: string;
  sourceUrl: string;
  sourceHash: string;
  variant: string;
  optimizedUrl: string;
  mimeType: string;
  bytes: number;
  width: number;
  height: number;
  status: string;
};

const g = globalThis as unknown as {
  __lexiAssets?: MemAsset[];
  __lexiAssetSeq?: number;
  __lexiAssetsHydrated?: boolean;
};
function mem() {
  if (!g.__lexiAssetsHydrated) {
    const s = localStore();
    g.__lexiAssets = (s.assets ?? []) as MemAsset[];
    g.__lexiAssetSeq = s.assetSeq ?? 1;
    g.__lexiAssetsHydrated = true;
  }
  if (!g.__lexiAssets) g.__lexiAssets = [];
  if (!g.__lexiAssetSeq) g.__lexiAssetSeq = 1;
  return g;
}
function persistAssets() {
  const s = localStore();
  s.assets = mem().__lexiAssets;
  s.assetSeq = mem().__lexiAssetSeq;
  scheduleLocalPersist();
}

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(25_000) });
  if (!res.ok) throw new Error(`download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function storeBlob(pathname: string, body: Buffer, contentType: string): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(pathname, body, {
      access: "public",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }

  // 로컬 개발: 홈 `.lexi-local/data/assets` 저장 후 /api/local-media 서빙
  const rel = pathname.replace(/^\/+/, "").replace(/\.\./g, "");
  const abs = path.join(localAssetsDir(), rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body);
  return `/api/local-media/${rel.split(path.sep).join("/")}`;
}

export async function optimizeAndStore(opts: {
  catalogId?: number | null;
  supplierCode: string;
  externalId: string;
  sourceUrl: string;
  variants?: AssetVariant[];
}): Promise<{ variant: AssetVariant; url: string; bytes: number; hash: string }[]> {
  const buf = await download(opts.sourceUrl);
  const hash = createHash("sha256").update(buf).digest("hex").slice(0, 24);
  const variants = opts.variants ?? (["thumb", "card", "pdp"] as AssetVariant[]);
  const out: { variant: AssetVariant; url: string; bytes: number; hash: string }[] = [];

  for (const variant of variants) {
    const size = SIZES[variant];
    const webp = await sharp(buf)
      .rotate()
      .resize(size, size, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: variant === "thumb" ? 70 : 78 })
      .toBuffer({ resolveWithObject: true });

    const url = await storeBlob(
      `lexi/${opts.supplierCode}/${opts.externalId}/${hash}-${variant}.webp`,
      webp.data,
      "image/webp",
    );

    const meta = {
      catalogId: opts.catalogId ?? null,
      supplierCode: opts.supplierCode,
      externalId: opts.externalId,
      sourceUrl: opts.sourceUrl,
      sourceHash: hash,
      variant,
      optimizedUrl: url,
      mimeType: "image/webp",
      bytes: webp.info.size,
      width: webp.info.width,
      height: webp.info.height,
      status: "ready",
    };

    if (!hasDb()) {
      mem().__lexiAssets!.push({ id: mem().__lexiAssetSeq!++, ...meta });
      persistAssets();
    } else {
      await db().insert(assetCache).values(meta);
    }
    out.push({ variant, url, bytes: webp.info.size, hash });
  }
  return out;
}

export async function listAssetsFor(externalId: string, supplierCode: string) {
  if (!hasDb()) {
    return (mem().__lexiAssets ?? []).filter(
      (a) => a.externalId === externalId && a.supplierCode === supplierCode && a.status === "ready",
    );
  }
  return db()
    .select()
    .from(assetCache)
    .where(eq(assetCache.externalId, externalId));
}

export function pickOptimizedUrls(
  assets: { variant: string; optimizedUrl?: string | null; url?: string }[],
): string[] {
  const order = ["pdp", "card", "thumb"];
  const urls: string[] = [];
  for (const v of order) {
    for (const a of assets) {
      if (a.variant === v) {
        const u = a.optimizedUrl ?? a.url;
        if (u && !urls.includes(u) && !u.includes("cjdropshipping.com")) urls.push(u);
      }
    }
  }
  return urls;
}
