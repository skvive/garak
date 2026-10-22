import { getChannelAdapter } from "@/lib/channels/registry";
import type { HqState } from "./store";
import type { InboxMatchOption, InboxStage, PurchaseInboxRow } from "./inbox-types";
import { inboxStageOf, SO_NEXT } from "./inbox-types";
import { canShipFromCj, isCjUnpaid } from "./cj-order";
import { publicTrackUrl, trackTokenOf } from "./track-public";

export type { InboxMatchOption, InboxStage, PurchaseInboxRow } from "./inbox-types";
export { inboxStageLabel, inboxStageOf } from "./inbox-types";

function listingTitle(s: HqState, channelListingId?: number) {
  const cl = channelListingId ? s.channelListings.find((c) => c.id === channelListingId) : undefined;
  const listing = cl && s.listings.find((l) => l.id === cl.listingId);
  const draft = listing && s.drafts.find((d) => d.id === listing.draftId);
  const sp = draft && s.supplierProducts.find((p) => p.id === draft.supplierProductId);
  const thumb = draft?.assets.find((a) => a.kind === "thumb" || a.kind === "hero")?.url ?? sp?.images[0]?.url;
  return {
    title: draft?.title || sp?.rawTitle || "",
    thumbUrl: thumb,
    listingRef: cl?.externalRef,
    listing,
    draft,
    sp,
  };
}

function rawStr(raw: Record<string, unknown> | Record<string, string> | undefined, keys: string[]): string | undefined {
  if (!raw) return undefined;
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return undefined;
}

function nestedOption(raw: Record<string, unknown> | undefined): string | undefined {
  if (!raw) return undefined;
  const items = (raw.line_items ?? raw.orderItems ?? raw.items ?? raw.order_items) as unknown;
  const first = Array.isArray(items) ? (items[0] as Record<string, unknown> | undefined) : undefined;
  if (!first) return undefined;
  return rawStr(first, ["variant_title", "option_value", "options", "sellerProductItemName", "sku"]);
}

function nestedPayment(raw: Record<string, unknown> | undefined): string | undefined {
  if (!raw) return undefined;
  const names = raw.payment_gateway_names;
  if (Array.isArray(names) && typeof names[0] === "string") return names[0];
  return rawStr(raw, ["payment_method_name", "payment_method", "payment_gateway_name", "gateway"]);
}

function stripHtml(html?: string) {
  if (!html) return undefined;
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 480) : undefined;
}

function productPageUrl(code: string, listingRef?: string, slug?: string, explicit?: string) {
  if (explicit) return explicit;
  if (slug) return `/product/${slug}`;
  if (!listingRef) return undefined;
  if (code === "cafe24" && /^\d+$/.test(listingRef)) {
    const mall = process.env.CAFE24_MALL_ID || "partnersc88";
    return `https://${mall}.cafe24.com/product/detail.html?product_no=${listingRef}`;
  }
  return undefined;
}

export function listPurchaseInbox(s: HqState) {
  const soByPr = new Map(s.sourcingOrders.map((o) => [o.purchaseRequestId, o]));
  const stBySo = new Map(s.settlements.map((x) => [x.sourcingOrderId, x]));
  const chById = new Map(s.channels.map((c) => [c.id, c]));

  const rows: PurchaseInboxRow[] = s.purchaseRequests.map((pr) => {
    const channel = chById.get(pr.channelId);
    const so = soByPr.get(pr.id);
    const st = so ? stBySo.get(so.id) : undefined;
    const linked = listingTitle(s, pr.channelListingId);
    const matched = Boolean(pr.channelListingId);
    const canSource = Boolean(linked.listing && linked.sp) && (pr.status === "vetted" || pr.status === "received" || pr.status === "matched");
    const supplier = so ? s.suppliers.find((x) => x.id === so.supplierId) : undefined;
    const stage = inboxStageOf(pr, so?.status, st?.status);
    return {
      id: pr.id,
      externalOrderRef: pr.externalOrderRef,
      status: pr.status,
      stage,
      qty: pr.qty,
      paidAmount: pr.channelPaidAmount,
      currency: pr.channelCurrency,
      optionLabel: pr.optionLabel || rawStr(pr.rawRow, ["option", "option_value", "variant_title", "options"]) || nestedOption(pr.rawRow as Record<string, unknown> | undefined) || "기본",
      paymentMethod: pr.paymentMethod || rawStr(pr.rawRow, ["payment_method", "payment_method_name", "gateway"]) || nestedPayment(pr.rawRow as Record<string, unknown> | undefined) || (pr.channelCurrency === "KRW" ? "카드" : "Card"),
      buyerName: pr.buyerName,
      buyerEmail: pr.buyerEmail || pr.shippingAddress?.email,
      buyerPhone: pr.buyerPhone || pr.shippingAddress?.phone,
      buyerCountry: pr.buyerCountry,
      shippingAddress: pr.shippingAddress,
      createdAt: pr.createdAt,
      matched,
      canSource,
      channel: {
        id: pr.channelId,
        code: channel?.code ?? "unknown",
        name: channel?.name ?? `#${pr.channelId}`,
      },
      product: {
        title: pr.productTitle || linked.title || pr.externalListingRef || "상품 미매칭",
        thumbUrl: pr.productThumb || linked.thumbUrl,
        listingRef: pr.externalListingRef || linked.listingRef,
        pageUrl: productPageUrl(channel?.code ?? "unknown", pr.externalListingRef || linked.listingRef, linked.listing?.productSlug, pr.productUrl),
        description: stripHtml(linked.draft?.descriptionHtml || linked.draft?.renderedHtml),
        html: linked.draft?.renderedHtml,
      },
      sourcingOrder: so
        ? {
            id: so.id,
            status: so.status,
            trackingNo: so.trackingNo,
            trackUrl: trackTokenOf(so) ? publicTrackUrl(trackTokenOf(so)!) : undefined,
            supplierName: supplier?.name,
            nextTo: so && !isCjUnpaid(so.cjStatus) && canShipFromCj(so.cjStatus) ? SO_NEXT[so.status] : undefined,
            cjStatus: so.cjStatus,
            cjOrderCode: so.cjOrderCode,
            orderKind: so.orderKind,
            costUsd: so.costUsd,
            shippingUsd: so.shippingUsd,
            disputeId: so.disputeId,
            openDispute: so.openDispute,
            payUrl: so.payUrl,
            makeupOpen: so.makeupOpen,
            undelivered: so.undelivered,
            logisticName: so.logisticName,
            supplierOrderRef: so.supplierOrderRef,
            cjConfirmError: so.cjConfirmError,
            disputeDraft: so.orderPayload?.disputeDraft as Record<string, unknown> | undefined,
          }
        : undefined,
      settlement: st
        ? { id: st.id, status: st.status, marginUsd: st.marginUsd }
        : undefined,
    };
  });

  const byChannel: Record<string, number> = {};
  const byStage: Record<InboxStage, number> = {
    inspect: 0, source: 0, fulfill: 0, settle: 0, done: 0, exception: 0,
  };
  for (const r of rows) {
    byChannel[r.channel.code] = (byChannel[r.channel.code] ?? 0) + 1;
    byStage[r.stage] += 1;
  }

  const matchOptions: Record<string, InboxMatchOption[]> = {};
  for (const cl of s.channelListings.filter((c) => c.publishState === "live" || c.publishState === "pushed")) {
    const ch = chById.get(cl.channelId);
    if (!ch) continue;
    const t = listingTitle(s, cl.id);
    (matchOptions[ch.code] ??= []).push({
      id: cl.id,
      title: t.title || cl.externalRef || `listing #${cl.id}`,
      externalRef: cl.externalRef,
    });
  }

  return {
    rows,
    channels: s.channels.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      pullOrders: Boolean(getChannelAdapter(c.code)?.pullOrders),
    })),
    counts: { all: rows.length, byChannel, byStage },
    matchOptions,
  };
}
