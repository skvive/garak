import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { getCatalogById } from "@/lib/catalog/index-store";
import { translateProductTitleKo } from "@/lib/catalog/title-ko";
import {
  generatePdpForCatalog,
  isDummyPdpDoc,
  isShelfReadyPdp,
  listPdpDocuments,
  purgeDummyPdpDocuments,
  purgeNonShelfPdpDocuments,
} from "@/lib/pdp/generate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const url = new URL(req.url);
  const shelfOnly = url.searchParams.get("shelf") === "1";
  const includeDummy = url.searchParams.get("includeDummy") === "1";
  const docs = await listPdpDocuments(80);
  const mapped = [];
  for (const d of docs) {
    if (!includeDummy && isDummyPdpDoc(d as never)) continue;
    if (shelfOnly && !isShelfReadyPdp(d as never)) continue;
    const body = (d as {
      body?: {
        engine?: string;
        catalogId?: number;
        assetUrls?: unknown;
        source?: string;
        shelfReady?: boolean;
      };
    }).body;
    const assets = Array.isArray(body?.assetUrls) ? body.assetUrls : [];
    let thumbUrl = typeof assets[0] === "string" ? assets[0] : null;
    const catalogId = (d as { catalogId?: number }).catalogId ?? body?.catalogId ?? null;
    let titleKo: string | null = null;
    let catalog = null;
    if (catalogId != null) {
      catalog = await getCatalogById(catalogId);
      if (!thumbUrl && catalog?.primaryThumbUrl) thumbUrl = catalog.primaryThumbUrl;
      titleKo = catalog?.titleKo ?? translateProductTitleKo(catalog?.title ?? (d as { title: string }).title);
    } else {
      titleKo = translateProductTitleKo((d as { title: string }).title);
    }
    const createdAt = (d as { createdAt?: Date | string }).createdAt;
    mapped.push({
      id: (d as { id: number }).id,
      title: (d as { title: string }).title,
      titleKo,
      status: (d as { status: string }).status,
      currentVersion: (d as { currentVersion?: number }).currentVersion,
      engine: (d as { engine?: string }).engine ?? body?.engine,
      catalogId,
      externalId: catalog?.externalId ?? null,
      sourceUrl: catalog?.sourceUrl ?? null,
      supplierCode: catalog?.supplierCode ?? "cjdropshipping",
      thumbUrl,
      source: body?.source ?? null,
      shelfReady: Boolean(body?.shelfReady || body?.source === "hq-studio"),
      createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt ?? null,
    });
  }
  return NextResponse.json({ documents: mapped });
}

/** POST { catalogId, ... } | { purgeDummy?, purgeNonShelf? } */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  try {
    const body = (await req.json()) as {
      catalogId?: number;
      catalogIds?: number[];
      locale?: string;
      conceptSpec?: import("@/lib/pdp/concept-spec").ConceptSpec;
      assetUrls?: string[];
      purgeDummy?: boolean;
      purgeNonShelf?: boolean;
      structured?: import("@/lib/pdp/ruleset").PdpStructured;
    };
    if (body.purgeNonShelf) {
      return NextResponse.json({ removed: await purgeNonShelfPdpDocuments() });
    }
    if (body.purgeDummy) {
      return NextResponse.json({ removed: await purgeDummyPdpDocuments() });
    }
    const opts = {
      locale: body.locale,
      conceptSpec: body.conceptSpec,
      extraAssetUrls: Array.isArray(body.assetUrls) ? body.assetUrls : undefined,
    };
    if (body.catalogIds?.length) {
      const results = [];
      for (const id of body.catalogIds) {
        try {
          results.push({ ok: true, ...(await generatePdpForCatalog(id, opts)) });
        } catch (e) {
          results.push({ ok: false, catalogId: id, error: e instanceof Error ? e.message : String(e) });
        }
      }
      return NextResponse.json({ results });
    }
    if (!body.catalogId) return bad("catalogId required");
    // 교정한 문구는 단건 저장에만 쓴다 (일괄 생성은 항상 새로 생성)
    return NextResponse.json(
      await generatePdpForCatalog(body.catalogId, { ...opts, structured: body.structured?.title ? body.structured : undefined }),
    );
  } catch (e) {
    return bad(e instanceof Error ? e.message : "generate failed", 500);
  }
}
