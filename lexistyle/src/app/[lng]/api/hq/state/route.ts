import { NextResponse } from "next/server";
import { hqActor, unauthorized } from "@/lib/hq/auth";
import { getState } from "@/lib/hq/store";

export const dynamic = "force-dynamic";

/** 콘솔용 상태 스냅샷 — catalog_index 전량은 /api/hq/catalog 로 분리 */
export async function GET(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  const s = await getState();
  return NextResponse.json({
    suppliers: s.suppliers,
    /** legacy 파이프라인용 — 전량 카탈로그는 /api/hq/catalog 사용 */
    supplierProducts: s.supplierProducts.slice(0, 200),
    supplierProductsTruncated: s.supplierProducts.length > 200,
    collections: s.collections,
    collectionItems: s.collectionItems,
    drafts: s.drafts.map(({ renderedHtml, ...d }) => ({ ...d, renderedHtml: renderedHtml.slice(0, 0) })),
    listings: s.listings,
    channels: s.channels,
    channelListings: s.channelListings,
    importBatches: s.importBatches,
    purchaseRequests: s.purchaseRequests,
    sourcingOrders: s.sourcingOrders,
    settlements: s.settlements,
    audit: s.audit.slice(0, 100),
    fx: s.fx,
    marketingAssets: s.marketingAssets.map(({ renderedHtml, embedding, payload, ...a }) => ({
      ...a,
      hasPreview: !!renderedHtml,
      summary:
        a.type === "hooks" ? { count: (payload.hooks as unknown[])?.length ?? 0 }
        : a.type === "copy" ? { count: (payload.copy as unknown[])?.length ?? 0 }
        : a.type === "cardnews" ? { slides: (payload.slides as unknown[])?.length ?? 0 }
        : a.type === "storyboard" ? { scenes: ((payload.storyboard as { scenes?: unknown[] })?.scenes)?.length ?? 0 }
        : {},
    })),
    marketingLearnings: s.marketingLearnings.slice(0, 100),
    campaignLog: s.campaignLog.slice(0, 100),
    contentCategories: s.contentCategories.map((c) => c.name),
  });
}
