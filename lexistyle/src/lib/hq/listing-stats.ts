/** 판매채널 리스팅 KPI + 실대시보드 URL */
import { eq } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { exportJobs } from "@/db/schema";
import type { HqState } from "./store";
import { listExports } from "@/lib/export/jobs";
import type { Listing } from "./types";

export type ListingStats = {
  pending: number;
  live: number;
  stopped: number;
  note?: string;
};

export function sellerDashboardUrl(code: string): string | null {
  if (code === "coupang") return "https://wing.coupang.com";
  if (code === "lexi" || code === "cafe24") {
    return (
      process.env.NEXT_PUBLIC_CAFE24_ADMIN_URL ||
      `https://${process.env.CAFE24_MALL_ID || "partnersc88"}.cafe24.com/admin`
    );
  }
  if (code === "shopify") {
    const domain = process.env.SHOPIFY_STORE_DOMAIN;
    return domain ? `https://${domain.replace(/^https?:\/\//, "")}/admin/products` : "https://admin.shopify.com";
  }
  if (code === "amazon_au") {
    return process.env.AMAZON_AU_SELLER_URL || "https://sellercentral.amazon.com.au";
  }
  if (code === "shopee") {
    return process.env.SHOPEE_SELLER_URL || "https://seller.shopee.sg";
  }
  return null;
}

function bucketFromPublishState(state: string | null | undefined): "pending" | "live" | "stopped" | null {
  if (!state) return null;
  if (state === "queued" || state === "pushed") return "pending";
  if (state === "live" || state === "preview_ok" || state === "mock_ok" || state === "package") return "live";
  if (state === "failed" || state === "delisted" || state === "paused") return "stopped";
  return null;
}

function fromExportJob(status: string, responsePayload: unknown): "pending" | "live" | "stopped" {
  if (status === "queued" || status === "retry" || status === "running") return "pending";
  if (status === "failed") return "stopped";
  if (status === "done") {
    const pub =
      responsePayload && typeof responsePayload === "object"
        ? String((responsePayload as { publishState?: string }).publishState ?? "live")
        : "live";
    return bucketFromPublishState(pub) ?? "live";
  }
  return "pending";
}

export async function listingStatsForCode(code: string, s: HqState): Promise<ListingStats> {
  const stats: ListingStats = { pending: 0, live: 0, stopped: 0 };
  const hq = s.channels.find((c) => c.code === code);
  if (hq) {
    for (const cl of s.channelListings.filter((l) => l.channelId === hq.id)) {
      const b = bucketFromPublishState(cl.publishState);
      if (b) stats[b] += 1;
    }
  }

  try {
    if (!hasDb()) {
      const jobs = (await listExports(200)).filter(
        (j) => (j as { channelCode?: string }).channelCode === code,
      );
      for (const j of jobs) {
        const b = fromExportJob(
          String((j as { status: string }).status),
          (j as { responsePayload?: unknown }).responsePayload,
        );
        stats[b] += 1;
      }
      return stats;
    }

    const rows = await db()
      .select({
        status: exportJobs.status,
        responsePayload: exportJobs.responsePayload,
      })
      .from(exportJobs)
      .where(eq(exportJobs.channelCode, code))
      .limit(500);

    for (const r of rows) {
      const b = fromExportJob(r.status, r.responsePayload);
      stats[b] += 1;
    }
    if (!rows.length && stats.pending + stats.live + stats.stopped === 0) {
      stats.note = "DB기준 · Export 이력 없음";
    }
  } catch {
    stats.note = "API 미연결·DB기준";
  }
  return stats;
}

export async function listingStatsMap(s: HqState, codes: string[]): Promise<Record<string, ListingStats>> {
  const out: Record<string, ListingStats> = {};
  await Promise.all(
    codes.map(async (code) => {
      out[code] = await listingStatsForCode(code, s);
    }),
  );
  return out;
}

/** Export 성공/실패 시 HQ channel_listings 반영 */
export async function upsertChannelListingFromExport(opts: {
  channelCode: string;
  documentId: number;
  publishState: string;
  externalRef?: string | null;
  error?: string | null;
}) {
  const { mutate, nextId } = await import("./store");
  await mutate((s) => {
    let channel = s.channels.find((c) => c.code === opts.channelCode);
    if (!channel) {
      channel = {
        id: nextId(s),
        code: opts.channelCode,
        kind:
          opts.channelCode === "lexi"
            ? "own"
            : opts.channelCode === "cafe24"
              ? "cafe24"
              : opts.channelCode === "coupang"
                ? "coupang"
                : "marketplace",
        name: opts.channelCode.toUpperCase(),
        config: {},
      };
      s.channels.push(channel);
    }
    const listingId = opts.documentId;
    if (!s.listings.find((l) => l.id === listingId)) {
      const listing: Listing = {
        id: listingId,
        draftId: listingId,
        productSlug: `pdp-${opts.documentId}`,
        marginPolicy: { type: "rate", value: 0.3, minMarginUsd: 20 },
        supplierCostUsd: 0,
        sellPriceUsd: 0,
        status: "ready",
        createdAt: new Date().toISOString(),
      };
      s.listings.push(listing);
    }
    const mapped =
      bucketFromPublishState(opts.publishState) === "live"
        ? ("live" as const)
        : bucketFromPublishState(opts.publishState) === "stopped"
          ? opts.publishState === "delisted"
            ? ("delisted" as const)
            : ("failed" as const)
          : opts.publishState === "pushed"
            ? ("pushed" as const)
            : ("queued" as const);
    let cl = s.channelListings.find((x) => x.listingId === listingId && x.channelId === channel!.id);
    if (!cl) {
      cl = {
        id: nextId(s),
        listingId,
        channelId: channel.id,
        publishState: mapped,
        retryCount: 0,
        externalRef: opts.externalRef ?? undefined,
        lastError: opts.error ?? undefined,
      };
      s.channelListings.unshift(cl);
    } else {
      cl.publishState = mapped;
      if (opts.externalRef) cl.externalRef = opts.externalRef;
      if (opts.error) cl.lastError = opts.error;
    }
    return cl;
  });
}
