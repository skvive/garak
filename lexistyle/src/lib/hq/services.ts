/**
 * HQ 서비스 레이어 — 상태 전이의 유일한 통로. 스펙 §2 P3~P6, §6 상태머신
 */
import { audit, getState, iso, mutate, nextId } from "./store";
import type { HqState } from "./store";
import type { MarginPolicy, PurchaseRequest } from "./types";
import { computeSellPrice, toUsd } from "./types";
import { getChannelAdapter } from "@/lib/channels/registry";
import type { PulledOrder } from "@/lib/channels/types";
import { getConnector } from "@/lib/sourcing/registry";
import { payoutConfig, resolvePayoutEntity, splitConsignment } from "@/lib/payout/routing";
import { pushChannelInvoices } from "./channel-invoice";
import { canConfirmLexiSettlement, canOpenDispute, canShipFromCj, cjPayPageUrl, isCjUnpaid } from "./cj-order";
import type { ListingOption, SourcingOrder } from "./types";
import { pickSupplyOption } from "./option-match";
import { stableCjOrderNumber } from "@/lib/sourcing/connectors/cjdropshipping";
import { syncCoupangCjSampleMirrors } from "./cj-sample-mirror";

/** 이번 달(UTC) 파트너스 귀속 누적 매출 (KRW) — 월 상한 가드 판정용.
 *  단일 환율(USD_KRW_RATE)로 환산해 트랙 B(KRW)·C(USD) 단위를 통일한다. */
function partnersMtdKrw(s: HqState): number {
  const ym = iso().slice(0, 7); // YYYY-MM
  const rate = Number(process.env.USD_KRW_RATE || 1350);
  return s.settlements
    .filter((x) => x.payoutEntity === "partners-coop" && (x.createdAt ?? "").slice(0, 7) === ym)
    .reduce((sum, x) => sum + x.revenueUsd * rate, 0);
}

/* ---------- P3: 승인 게이트 → 리스팅 생성 ---------- */
export async function reviewDraft(
  draftId: number,
  decision: "approved" | "rejected",
  actor: string,
  marginPolicy?: MarginPolicy,
) {
  return mutate((s) => {
    const draft = s.drafts.find((d) => d.id === draftId);
    if (!draft) throw new Error("draft not found");
    if (draft.status !== "review" && draft.status !== "draft") throw new Error(`invalid state: ${draft.status}`);
    const from = draft.status;
    draft.status = decision;
    draft.reviewedBy = actor;
    draft.reviewedAt = iso();
    audit(s, "listing_draft", draft.id, decision, actor, from);
    if (decision === "rejected") return { draft };

    const sp = s.supplierProducts.find((p) => p.id === draft.supplierProductId);
    if (!sp) throw new Error("supplier product missing");
    const policy: MarginPolicy = marginPolicy ?? { type: "rate", value: 0.3, minMarginUsd: 20 };
    const costUsd = toUsd(sp.priceOriginal, sp.currency, s.fx);
    const listing = {
      id: nextId(s),
      draftId: draft.id,
      productSlug: "",
      marginPolicy: policy,
      supplierCostUsd: costUsd,
      sellPriceUsd: computeSellPrice(costUsd),
      status: "ready" as const,
      createdAt: iso(),
    };
    s.listings.unshift(listing);
    audit(s, "listing", listing.id, "ready", actor, undefined, { costUsd, sellPriceUsd: listing.sellPriceUsd });
    return { draft, listing };
  });
}

/* ---------- P4: 채널 게시 ---------- */
export async function queuePublish(listingId: number, channelCodes: string[], actor: string) {
  return mutate((s) => {
    const listing = s.listings.find((l) => l.id === listingId);
    if (!listing) throw new Error("listing not found");
    const queued: number[] = [];
    for (const code of channelCodes) {
      const channel = s.channels.find((c) => c.code === code);
      if (!channel) continue;
      let cl = s.channelListings.find((x) => x.listingId === listingId && x.channelId === channel.id);
      if (!cl) {
        cl = { id: nextId(s), listingId, channelId: channel.id, publishState: "queued", retryCount: 0 };
        s.channelListings.unshift(cl);
      } else if (cl.publishState === "failed" || cl.publishState === "delisted") {
        cl.publishState = "queued";
      }
      queued.push(cl.id);
      audit(s, "channel_listing", cl.id, "queued", actor, undefined, { channel: code });
    }
    return { queued };
  });
}

export async function processPublishQueue(limit = 10) {
  return mutate(async (s) => {
    const queue = s.channelListings.filter((c) => c.publishState === "queued").slice(0, limit);
    const results: { id: number; state: string; error?: string }[] = [];
    for (const cl of queue) {
      const listing = s.listings.find((l) => l.id === cl.listingId);
      const draft = listing && s.drafts.find((d) => d.id === listing.draftId);
      const channel = s.channels.find((c) => c.id === cl.channelId);
      if (!listing || !draft || !channel) {
        cl.publishState = "failed";
        cl.lastError = "broken reference";
        continue;
      }
      const adapter = getChannelAdapter(channel.code);
      try {
        if (!adapter) throw new Error(`no adapter: ${channel.code} (업로드 패키지 export 사용)`);
        const { externalRef } = await adapter.publish({ channel, listing, draft });
        cl.externalRef = externalRef;
        cl.publishState = "live";
        cl.lastPushedAt = iso();
        cl.lastError = undefined;
        if (channel.code === "lexi" && externalRef.startsWith("lexi:")) {
          listing.productSlug = externalRef.slice(5);
        }
        if (listing.status === "ready") listing.status = "published";
        audit(s, "channel_listing", cl.id, "live", "system", "queued", { externalRef });
        results.push({ id: cl.id, state: "live" });
      } catch (e) {
        cl.retryCount += 1;
        cl.publishState = cl.retryCount >= 3 ? "failed" : "queued";
        cl.lastError = e instanceof Error ? e.message : String(e);
        audit(s, "channel_listing", cl.id, cl.publishState, "system", "queued", { error: cl.lastError });
        results.push({ id: cl.id, state: cl.publishState, error: cl.lastError });
      }
    }
    return { processed: results.length, results };
  });
}

/* ---------- P5: 구매요청 인입 ---------- */
const DEFAULT_HEADERS = [
  "order_ref", "listing_ref", "qty", "paid_amount", "currency",
  "buyer_name", "country", "addr1", "addr2", "zip", "phone",
];

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const split = (l: string) =>
    (l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) ?? [])
      .map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"'))
      .slice(0, -0 || undefined);
  const headers = split(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = split(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });
}

function intakeRow(
  s: HqState,
  channelId: number,
  batchId: number | undefined,
  o: PulledOrder,
): PurchaseRequest | string {
  if (!o.externalOrderRef) return "missing order_ref";
  if (s.purchaseRequests.some((p) => p.channelId === channelId && p.externalOrderRef === o.externalOrderRef)) {
    return "duplicate order_ref";
  }
  const cl = o.externalListingRef
    ? s.channelListings.find((c) => c.channelId === channelId && c.externalRef === o.externalListingRef)
    : undefined;
  const pr: PurchaseRequest = {
    id: nextId(s),
    channelId,
    importBatchId: batchId,
    externalOrderRef: o.externalOrderRef,
    channelListingId: cl?.id,
    externalListingRef: o.externalListingRef,
    productTitle: o.productTitle,
    productThumb: o.productThumb,
    rawRow: o.raw as Record<string, string> | undefined,
    buyerName: o.buyerName,
    buyerEmail: o.buyerEmail || o.shippingAddress?.email,
    buyerPhone: o.buyerPhone || o.shippingAddress?.phone,
    buyerCountry: o.buyerCountry,
    shippingAddress: o.shippingAddress,
    qty: o.qty || 1,
    channelPaidAmount: o.paidAmount,
    channelCurrency: o.currency || "USD",
    optionLabel: o.optionLabel,
    paymentMethod: o.paymentMethod,
    productUrl: o.productUrl,
    status: cl ? "matched" : "received",
    createdAt: iso(),
  };
  s.purchaseRequests.unshift(pr);
  audit(s, "purchase_request", pr.id, pr.status, "system", undefined, { ref: pr.externalOrderRef });
  return pr;
}

export async function importPurchaseCsv(channelCode: string, filename: string, csv: string, actor: string) {
  return mutate((s) => {
    const channel = s.channels.find((c) => c.code === channelCode);
    if (!channel) throw new Error("unknown channel");
    const headerMap = channel.config.headerMap ?? {};
    const rows = parseCsv(csv);
    const batch = {
      id: nextId(s), channelId: channel.id, filename,
      rowCount: rows.length, okCount: 0,
      errorRows: [] as { line: number; error: string }[],
      importedBy: actor, importedAt: iso(),
    };
    rows.forEach((raw, i) => {
      const get = (key: string) => raw[headerMap[key] ?? key] ?? "";
      const result = intakeRow(s, channel.id, batch.id, {
        externalOrderRef: get("order_ref"),
        externalListingRef: get("listing_ref") || undefined,
        productTitle: get("title") || get("product_title") || undefined,
        buyerName: get("buyer_name"),
        buyerEmail: get("buyer_email") || undefined,
        buyerPhone: get("phone") || undefined,
        buyerCountry: (get("country") || "US").toUpperCase().slice(0, 2),
        shippingAddress: {
          name: get("buyer_name"), country: get("country"),
          state: get("state"), city: get("city"),
          addr1: get("addr1"), addr2: get("addr2"), zip: get("zip"), phone: get("phone"),
        },
        qty: parseInt(get("qty") || "1", 10) || 1,
        paidAmount: parseFloat(get("paid_amount") || "0") || 0,
        currency: (get("currency") || "USD").toUpperCase(),
        optionLabel: get("option") || undefined,
        raw,
      });
      if (typeof result === "string") batch.errorRows.push({ line: i + 2, error: result });
      else batch.okCount++;
    });
    s.importBatches.unshift(batch);
    return { batchId: batch.id, rowCount: batch.rowCount, okCount: batch.okCount, errors: batch.errorRows, expectedHeaders: DEFAULT_HEADERS };
  });
}

export async function pullChannelOrders(channelCode: string, opts?: { externalOrderId?: string; autoSource?: boolean }) {
  if (channelCode === "coupang") {
    const [{ coupangKeysConfigured }, { cjConfigured }, { hasDb }] = await Promise.all([
      import("@/lib/channels/coupang/constants"),
      import("@/lib/sourcing/connectors/cjdropshipping"),
      import("@/db"),
    ]);
    if (coupangKeysConfigured() && !hasDb()) {
      throw new Error("DATABASE_URL required: 쿠팡 실주문 중복 방지를 위한 영속 저장소가 필요합니다");
    }
    if (opts?.autoSource !== false && coupangKeysConfigured() && !cjConfigured()) {
      throw new Error("CJ_API_EMAIL/CJ_API_KEY required: 실주문에서 CJ 목업 발주를 사용할 수 없습니다");
    }
  }
  const r = await mutate(async (s) => {
    const channel = s.channels.find((c) => c.code === channelCode);
    if (!channel) throw new Error("unknown channel");
    if (s.salesChannelMeta?.[channelCode]?.paused) throw new Error("channel paused");
    const adapter = getChannelAdapter(channel.code);
    if (!adapter?.pullOrders) throw new Error("pullOrders unsupported — 엑셀 인입 사용");
    const liveListings = s.channelListings.filter((c) => c.channelId === channel.id && c.publishState === "live");
    const pulled = await adapter.pullOrders(channel, { liveListings });
    const orders = opts?.externalOrderId
      ? pulled.filter((o) => {
          const rawOrderId = o.raw?.orderId != null ? String(o.raw.orderId) : "";
          return rawOrderId === opts.externalOrderId || o.externalOrderRef.split(":")[0] === opts.externalOrderId;
        })
      : pulled;
    if (opts?.externalOrderId && !orders.length) {
      throw new Error(`쿠팡 주문번호 ${opts.externalOrderId}를 최근 조회 범위에서 찾지 못했습니다`);
    }
    const orderRefs = new Set(orders.map((o) => o.externalOrderRef));
    const matchedIds: number[] = [];
    let ok = 0;
    for (const o of orders) {
      const pr = intakeRow(s, channel.id, undefined, o);
      if (typeof pr === "string") continue;
      ok++;
      if (pr.status === "matched") matchedIds.push(pr.id);
    }
    // 이전 실행에서 CJ 호출이 일시 실패한 주문도 다음 폴링에서 다시 발주한다.
    for (const pr of s.purchaseRequests) {
      if (
        pr.channelId === channel.id &&
        orderRefs.has(pr.externalOrderRef) &&
        pr.channelListingId &&
        (pr.status === "matched" || pr.status === "vetted") &&
        !s.sourcingOrders.some((so) => so.purchaseRequestId === pr.id)
      ) {
        matchedIds.push(pr.id);
      }
    }
    return { pulled: orders.length, created: ok, matchedIds: [...new Set(matchedIds)], orderRefs: [...orderRefs] };
  });
  // 리스팅 매칭된 신규 주문 → CJ 자동 발주(createOrderV2 payType 3 = 결제 전 단계까지). 결제는 별도 수동
  const autoSourced: { prId: number; ok: boolean; supplierOrderRef?: string; error?: string }[] = [];
  if (opts?.autoSource !== false && process.env.AUTO_SOURCE_ORDERS !== "0") {
    for (const prId of r.matchedIds) {
      try {
        const so = await createSourcingOrder(prId, "auto:pull-orders", { autoVet: true });
        autoSourced.push({ prId, ok: true, supplierOrderRef: so.supplierOrderRef });
      } catch (e) {
        autoSourced.push({ prId, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }
  }
  const acknowledged: { prId: number; ok: boolean; error?: string }[] = [];
  if (channelCode === "coupang") {
    const snapshot = await getState();
    const channel = snapshot.channels.find((c) => c.code === channelCode);
    const adapter = channel ? getChannelAdapter(channel.code) : null;
    const plans = snapshot.purchaseRequests
      .filter((pr) => channel && pr.channelId === channel.id && r.orderRefs.includes(pr.externalOrderRef))
      .map((pr) => ({ pr, so: snapshot.sourcingOrders.find((so) => so.purchaseRequestId === pr.id) }))
      .filter(({ so }) => Boolean(so?.supplierOrderRef) && !so?.orderPayload?.channelAcknowledgedAt);
    for (const { pr, so } of plans) {
      try {
        await adapter?.ackOrder?.(channel!, pr, {});
        await mutate((s) => {
          const row = s.sourcingOrders.find((x) => x.id === so!.id);
          if (!row) return;
          row.orderPayload = {
            ...(row.orderPayload ?? {}),
            channelAcknowledgedAt: iso(),
            channelAcknowledgementError: "",
          };
          audit(s, "sourcing_order", row.id, "channel_acknowledged", "auto:pull-orders", row.status, { channel: channelCode });
        });
        acknowledged.push({ prId: pr.id, ok: true });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        await mutate((s) => {
          const row = s.sourcingOrders.find((x) => x.id === so!.id);
          if (!row) return;
          row.orderPayload = { ...(row.orderPayload ?? {}), channelAcknowledgementError: error };
        });
        acknowledged.push({ prId: pr.id, ok: false, error });
      }
    }
  }
  let returnDisputes: Awaited<ReturnType<typeof pullChannelReturns>> | { error: string } | undefined;
  if (channelCode === "coupang" && process.env.AUTO_RETURN_DISPUTE !== "0") {
    returnDisputes = await pullChannelReturns(channelCode).catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));
  }
  const sampleMirrors = channelCode === "coupang" && opts?.autoSource !== false
    ? await syncCoupangCjSampleMirrors("auto:pull-orders")
    : undefined;
  return { pulled: r.pulled, created: r.created, autoSourced, acknowledged, returnDisputes, sampleMirrors };
}

/** 저장된 채널 주문 중 매칭 완료·미발주 신건만 CJ로 보낸다. */
export async function sourcePendingChannelOrders(channelCode: string, actor: string) {
  const [{ hasDb }, { cjConfigured }] = await Promise.all([
    import("@/db"),
    import("@/lib/sourcing/connectors/cjdropshipping"),
  ]);
  if (!hasDb()) throw new Error("DATABASE_URL required: 중복 발주 방지를 위한 영속 저장소가 필요합니다");
  if (!cjConfigured()) throw new Error("CJ_API_EMAIL/CJ_API_KEY required");

  const snapshot = await getState();
  const channel = snapshot.channels.find((c) => c.code === channelCode);
  if (!channel) throw new Error("unknown channel");
  const pendingIds = snapshot.purchaseRequests
    .filter((pr) =>
      pr.channelId === channel.id &&
      Boolean(pr.channelListingId) &&
      (pr.status === "matched" || pr.status === "vetted") &&
      !snapshot.sourcingOrders.some((so) => so.purchaseRequestId === pr.id),
    )
    .map((pr) => pr.id);

  const results: { prId: number; ok: boolean; supplierOrderRef?: string; warning?: string; error?: string }[] = [];
  for (const prId of pendingIds) {
    try {
      const so = await createSourcingOrder(prId, actor, { autoVet: true });
      let warning: string | undefined;
      if (channelCode === "coupang" && so.supplierOrderRef) {
        const current = await getState();
        const pr = current.purchaseRequests.find((row) => row.id === prId);
        const adapter = getChannelAdapter(channel.code);
        if (pr && adapter?.ackOrder) {
          try {
            await adapter.ackOrder(channel, pr, {});
          } catch (error) {
            warning = error instanceof Error ? error.message : String(error);
          }
          await mutate((s) => {
            const row = s.sourcingOrders.find((item) => item.id === so.id);
            if (!row) return;
            row.orderPayload = {
              ...(row.orderPayload ?? {}),
              channelAcknowledgedAt: warning ? undefined : iso(),
              channelAcknowledgementError: warning ?? "",
            };
            audit(
              s,
              "sourcing_order",
              row.id,
              warning ? "channel_acknowledgement_failed" : "channel_acknowledged",
              actor,
              row.status,
              { channel: channelCode, warning },
            );
          });
        }
      }
      results.push({ prId, ok: true, supplierOrderRef: so.supplierOrderRef, warning });
    } catch (e) {
      results.push({ prId, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  const sampleMirrors = channelCode === "coupang"
    ? await syncCoupangCjSampleMirrors(actor)
    : undefined;
  return {
    queued: pendingIds.length,
    sent: results.filter((row) => row.ok).length,
    failed: results.filter((row) => !row.ok).length,
    results,
    sampleMirrors,
  };
}

export async function listChannelOrderQueue(channelCode: string) {
  const state = await getState();
  const channel = state.channels.find((row) => row.code === channelCode);
  if (!channel) return [];
  return state.purchaseRequests
    .filter((pr) => pr.channelId === channel.id)
    .map((pr) => {
      const sourcing = state.sourcingOrders.find((so) => so.purchaseRequestId === pr.id);
      return {
        id: pr.id,
        orderRef: pr.externalOrderRef,
        productTitle: pr.productTitle ?? "상품명 미확인",
        optionLabel: pr.optionLabel ?? "옵션 미확인",
        qty: pr.qty,
        orderStatus: pr.status,
        cjStatus: sourcing?.cjStatus ?? (sourcing ? sourcing.status : "대기"),
        cjOrderRef: sourcing?.supplierOrderRef ?? null,
        canSend: Boolean(pr.channelListingId) &&
          (pr.status === "matched" || pr.status === "vetted") &&
          !sourcing,
        createdAt: pr.createdAt,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);
}

/**
 * 렉시 몰 결제완료 주문 → 품목별 구매요청(rawRow.externalVendorSku = CJ vid) → CJ 자동 발주(미결제 단계).
 * 몰 상품(lexi-pdp-<doc>)은 catalog_index.document_id 로 Export 리스팅에 연결하고, 렉시 채널 리스팅이 없으면 만든다.
 */
export async function intakeLexiStoreOrder(orderId: number) {
  const { db } = await import("@/db");
  const { orders, orderItems, products, catalogIndex, users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const [o] = await db().select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) throw new Error("order not found");
  const rows = await db()
    .select({
      id: orderItems.id,
      qty: orderItems.qty,
      unit: orderItems.unitPriceUsd,
      sku: orderItems.variantSku,
      label: orderItems.variantLabel,
      slug: products.slug,
      name: products.name,
      documentId: catalogIndex.documentId,
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .leftJoin(catalogIndex, eq(catalogIndex.productId, products.id))
    .where(eq(orderItems.orderId, orderId));
  const items = [...new Map(rows.map((r) => [r.id, r])).values()];
  let email = o.guestEmail ?? undefined;
  if (!email && o.userId) {
    const [u] = await db().select({ email: users.email }).from(users).where(eq(users.id, o.userId)).limit(1);
    email = u?.email ?? undefined;
  }
  const addr = (o.shippingAddress ?? {}) as Record<string, string | null>;
  const shippingAddress: Record<string, string> = {
    name: addr.name ?? "",
    country: (addr.country ?? o.country ?? "KR").slice(0, 2),
    addr1: addr.address1 ?? "",
    city: addr.city ?? "",
    zip: addr.postal ?? "",
    phone: addr.phone ?? "",
    pccc: addr.customsCode ?? "",
    email: email ?? "",
  };

  const r = await mutate(async (s) => {
    const channel = s.channels.find((c) => c.code === "lexi");
    if (!channel) throw new Error("lexi channel 미등록");
    const matchedIds: number[] = [];
    const errors: string[] = [];
    for (const it of items) {
      const externalListingRef = `lexi:${it.slug}`;
      const hasCl = s.channelListings.some((c) => c.channelId === channel.id && c.externalRef === externalListingRef);
      if (!hasCl && it.documentId && s.listings.some((l) => l.id === it.documentId)) {
        s.channelListings.push({
          id: nextId(s),
          listingId: it.documentId,
          channelId: channel.id,
          externalRef: externalListingRef,
          publishState: "live",
          retryCount: 0,
        });
      }
      const pr = intakeRow(s, channel.id, undefined, {
        externalOrderRef: `LXO-${o.id}:${it.id}`,
        externalListingRef,
        productTitle: it.name,
        buyerName: shippingAddress.name,
        buyerEmail: email,
        buyerPhone: shippingAddress.phone,
        buyerCountry: shippingAddress.country,
        shippingAddress,
        qty: it.qty,
        paidAmount: +(Number(it.unit) * it.qty).toFixed(2),
        currency: "USD",
        optionLabel: it.label ?? undefined,
        paymentMethod: o.paymentProvider ?? undefined,
        raw: {
          lexiOrderId: String(o.id),
          vendorItemId: String(it.id),
          externalVendorSku: it.sku ?? "",
          orderedAt: (o.createdAt ?? new Date()).toISOString(),
        },
      });
      if (typeof pr === "string") errors.push(`${it.slug}: ${pr}`);
      else if (pr.status === "matched") matchedIds.push(pr.id);
      else errors.push(`${it.slug}: 리스팅 미매칭 — HQ 구매요청에서 수동 매칭 필요`);
    }
    return { matchedIds, errors };
  });

  const autoSourced: { prId: number; ok: boolean; supplierOrderRef?: string; error?: string }[] = [];
  if (process.env.AUTO_SOURCE_ORDERS !== "0") {
    for (const prId of r.matchedIds) {
      try {
        const so = await createSourcingOrder(prId, "auto:lexi-checkout", { autoVet: true });
        autoSourced.push({ prId, ok: true, supplierOrderRef: so.supplierOrderRef });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        autoSourced.push({ prId, ok: false, error });
        r.errors.push(`PR#${prId}: ${error}`);
      }
    }
  }
  return { created: items.length, matched: r.matchedIds.length, autoSourced, errors: r.errors };
}

/** HQ 목록용 CJ 분쟁 준비안 — SourcingOrder.orderPayload.disputeDraft (submitted 항상 false) */
export type DisputeDraftRecord = {
  receiptId: string;
  channelCode: string;
  channelStatus?: string;
  channelReason?: string;
  state: "ready" | "blocked";
  note?: string;
  cjOrderId?: string;
  products?: { lineItemId: string; quantity: number; price: number; canChoose: boolean }[];
  maxAmount?: number;
  expectOptions?: string[];
  reasons?: { disputeReasonId: number; reasonName: string }[];
  submitted: false;
  preparedAt: string;
};

/** 채널 환불/반품 요청 → 매칭 SO → CJ 분쟁 준비(disputeProducts+disputeConfirmInfo)까지. 공장 전송(/disputes/create)은 하지 않음 */
export async function pullChannelReturns(channelCode: string) {
  if (channelCode !== "coupang") throw new Error("pullReturns unsupported");
  const { listCoupangReturns } = await import("@/lib/channels/coupang/ops");
  const { getCjOrder, prepareCjDisputeDraft } = await import("@/lib/sourcing/connectors/cjdropshipping");
  const returns = (await listCoupangReturns()).filter((r) => r.orderId && !r.mock);

  const targets = await mutate((s) => {
    const channel = s.channels.find((c) => c.code === channelCode);
    if (!channel) return [];
    const out: { soId: number; ref?: string; cjStatus?: string; ret: (typeof returns)[number] }[] = [];
    for (const ret of returns) {
      const pr = s.purchaseRequests.find((p) => p.channelId === channel.id && p.externalOrderRef === ret.orderId);
      if (!pr) continue;
      for (const so of s.sourcingOrders.filter((o) => o.purchaseRequestId === pr.id)) {
        const prev = so.orderPayload?.disputeDraft as DisputeDraftRecord | undefined;
        if (prev?.receiptId === ret.receiptId && prev.state === "ready") continue;
        if (so.disputeId) continue;
        out.push({ soId: so.id, ref: so.supplierOrderRef, cjStatus: so.cjStatus, ret });
      }
    }
    return out;
  });

  const results: { soId: number; receiptId: string; state: DisputeDraftRecord["state"]; note?: string }[] = [];
  for (const t of targets) {
    const base = {
      receiptId: t.ret.receiptId,
      channelCode,
      channelStatus: t.ret.status,
      channelReason: t.ret.reason,
      submitted: false as const,
      preparedAt: iso(),
    };
    let draft: DisputeDraftRecord;
    if (!t.ref) {
      draft = { ...base, state: "blocked", note: "CJ 발주 전 — 채널 환불만 처리" };
    } else if (!canOpenDispute(t.cjStatus)) {
      draft = {
        ...base,
        state: "blocked",
        note: isCjUnpaid(t.cjStatus) ? "CJ 미결제 — 분쟁 대신 CJ 주문 취소 대상" : "CJ 마감/취소 — 분쟁 불가",
      };
    } else {
      try {
        const remote = await getCjOrder(t.ref);
        const d = await prepareCjDisputeDraft(remote?.orderId || t.ref);
        draft = {
          ...base,
          state: d.products.some((p) => p.canChoose) ? "ready" : "blocked",
          note: d.products.some((p) => p.canChoose) ? undefined : "CJ 분쟁 가능 상품 없음",
          cjOrderId: d.cjOrderId,
          products: d.products,
          maxAmount: d.maxAmount,
          expectOptions: d.expectOptions,
          reasons: d.reasons,
        };
      } catch (e) {
        draft = { ...base, state: "blocked", note: `CJ 분쟁 준비 실패: ${e instanceof Error ? e.message : e}` };
      }
    }
    await mutate((s) => {
      const so = s.sourcingOrders.find((o) => o.id === t.soId);
      if (!so) return;
      so.orderPayload = { ...(so.orderPayload ?? {}), disputeDraft: draft };
      audit(s, "sourcing_order", so.id, "dispute_draft", "auto:pull-returns", so.status, {
        receiptId: draft.receiptId, state: draft.state, note: draft.note, maxAmount: draft.maxAmount,
      });
    });
    results.push({ soId: t.soId, receiptId: draft.receiptId, state: draft.state, note: draft.note });
  }
  return { returns: returns.length, drafted: results };
}

/* ---------- P5: 검수 ---------- */
export async function vetPurchaseRequest(
  prId: number,
  decision: "vetted" | "rejected" | "refund_delegated",
  actor: string,
  reason?: string,
) {
  return mutate((s) => {
    const pr = s.purchaseRequests.find((p) => p.id === prId);
    if (!pr) throw new Error("purchase request not found");
    const from = pr.status;
    if (decision === "vetted" && !(from === "received" || from === "matched")) throw new Error(`invalid transition ${from}→vetted`);
    pr.status = decision;
    pr.vettedBy = actor;
    pr.vettedAt = iso();
    if (reason) pr.rejectReason = reason;
    audit(s, "purchase_request", pr.id, decision, actor, from, reason ? { reason } : undefined);

    // 검수 경고 계산(참고용 반환)
    const warnings: string[] = [];
    const cl = pr.channelListingId ? s.channelListings.find((c) => c.id === pr.channelListingId) : undefined;
    const listing = cl && s.listings.find((l) => l.id === cl.listingId);
    if (listing) {
      const revenueUsd = toUsd(pr.channelPaidAmount, pr.channelCurrency, s.fx);
      const marginUsd = revenueUsd - listing.supplierCostUsd * pr.qty;
      if (marginUsd < listing.marginPolicy.minMarginUsd) warnings.push(`마진 미달: $${marginUsd.toFixed(2)}`);
    } else {
      warnings.push("리스팅 미매칭 — 수동 매칭 필요");
    }
    return { pr, warnings };
  });
}

export async function matchPurchaseRequest(prId: number, channelListingId: number, actor: string) {
  return mutate((s) => {
    const pr = s.purchaseRequests.find((p) => p.id === prId);
    const cl = s.channelListings.find((c) => c.id === channelListingId);
    if (!pr || !cl) throw new Error("not found");
    pr.channelListingId = cl.id;
    if (pr.status === "received") pr.status = "matched";
    audit(s, "purchase_request", pr.id, "matched", actor);
    return pr;
  });
}

/* ---------- P5→P6: 발주 ---------- */
/** Export 리스팅(documentId) → 진열큐 옵션(sku=CJ vid) + 카탈로그(pid). 다옵션인데 주문 옵션이 안 맞으면 오발주 방지로 실패 */
export async function resolveExportedSupply(documentId: number, optionLabel?: string, variantSku?: string) {
  const { getShelfByDocument } = await import("@/lib/export/shelf");
  const { getCatalogById } = await import("@/lib/catalog/index-store");
  const shelf = await getShelfByDocument(documentId);
  if (!shelf?.catalogId) return null;
  const cat = await getCatalogById(shelf.catalogId);
  if (!cat) return null;
  let options: { sku?: string; name: string; key?: string; costUsd?: number }[] = (shelf.options ?? []).filter((o) => o.sku);
  // 채널 SKU(쿠팡 externalVendorSku 등)가 진열큐에 없으면 CJ 전체 variant에서 찾는다 — 진열큐 단일옵션으로 사이즈가 뭉개지지 않게
  const skuMissing = variantSku && !options.some((o) => o.sku === variantSku);
  if ((!options.length || skuMissing) && cat.supplierCode === "cjdropshipping") {
    const { listCjVariants } = await import("@/lib/sourcing/connectors/cjdropshipping");
    const variants = (await listCjVariants(cat.externalId)).map((v) => ({ sku: v.vid, name: v.name, key: v.key, costUsd: v.costUsd }));
    if (variants.length) options = variants;
  }
  const opt = pickSupplyOption(options, optionLabel, variantSku);
  if (!opt?.sku) {
    throw new Error(`옵션→CJ variant 매핑 실패 (주문옵션: ${optionLabel ?? "없음"}, 후보 ${options.length}개)`);
  }
  const cost = opt.costUsd ?? Number(cat.minPrice ?? 0);
  return {
    supplierCode: cat.supplierCode,
    pid: cat.externalId,
    vid: opt.sku,
    optionName: opt.name,
    costUsd: Number.isFinite(cost) ? cost : 0,
  };
}

export async function createSourcingOrder(prId: number, actor: string, opts?: { autoVet?: boolean; orderKind?: SourcingOrder["orderKind"] }) {
  return mutate(async (s) => {
    const pr = s.purchaseRequests.find((p) => p.id === prId);
    if (!pr) throw new Error("purchase request not found");
    if (opts?.autoVet && (pr.status === "received" || pr.status === "matched")) {
      const from = pr.status;
      pr.status = "vetted";
      pr.vettedBy = actor;
      pr.vettedAt = iso();
      audit(s, "purchase_request", pr.id, "vetted", actor, from);
    }
    if (pr.status !== "vetted") throw new Error(`검수(vetted) 상태에서만 발주 가능 (현재: ${pr.status})`);
    if (s.sourcingOrders.some((o) => o.purchaseRequestId === pr.id)) throw new Error("이미 발주됨");

    const cl = pr.channelListingId ? s.channelListings.find((c) => c.id === pr.channelListingId) : undefined;
    const listing = cl && s.listings.find((l) => l.id === cl.listingId);
    const draft = listing && s.drafts.find((d) => d.id === listing.draftId);
    const sp = draft && s.supplierProducts.find((p) => p.id === draft.supplierProductId);
    if (!listing) throw new Error("리스팅→공급처상품 역추적 실패 — 수동 매칭 확인");
    // Export 파이프라인 리스팅(listing.id = PDP documentId)은 HQ draft/supplierProduct가 없다 → 진열큐·카탈로그로 역추적
    const exported = sp ? null : await resolveExportedSupply(listing.id, pr.optionLabel, pr.rawRow?.externalVendorSku || undefined);
    if (!sp && !exported) throw new Error("리스팅→공급처상품 역추적 실패 — 수동 매칭 확인");
    const supplier = sp
      ? s.suppliers.find((x) => x.id === sp.supplierId)!
      : s.suppliers.find((x) => x.code === exported!.supplierCode);
    if (!supplier) throw new Error(`공급처 미등록: ${exported?.supplierCode}`);
    const orderExternalId = sp ? sp.externalId : exported!.vid;
    const unitCostUsd = sp ? listing.supplierCostUsd : exported!.costUsd;

    const variantId = pickListingVariantId(
      draft && typeof draft === "object" ? draft.options : undefined,
      pr.optionLabel,
      sp?.externalId,
      pr.rawRow?.externalVendorSku || undefined,
    ) || exported?.vid;
    const connector = getConnector(supplier.code);
    let supplierOrderRef: string | undefined;
    let placed: { shipmentOrderId?: string; orderCode?: string; status?: string } | undefined;
    if (connector?.placeOrder) {
      const r = await connector.placeOrder({
        externalId: orderExternalId,
        variantId,
        variantHint: pr.optionLabel,
        qty: pr.qty,
        shippingAddress: pr.shippingAddress ?? {},
        note: `LEXI PR#${pr.id} / ${s.channels.find((c) => c.id === pr.channelId)?.code ?? "channel"} ${pr.externalOrderRef}`,
        store: {
          orderNumber: stableCjOrderNumber(
            s.channels.find((c) => c.id === pr.channelId)?.code ?? "channel",
            pr.externalOrderRef,
          ),
          orderedAt: pr.rawRow?.orderedAt || pr.createdAt,
          lineItemId: pr.rawRow?.vendorItemId || pr.externalOrderRef,
          productName: pr.productTitle,
          sku: pr.rawRow?.externalVendorSku || pr.externalListingRef,
          option: pr.optionLabel,
        },
      });
      placed = r;
      supplierOrderRef = r.supplierOrderRef || undefined;
    }
    let cart: { shipmentsId?: string; error?: string } = {};
    if (supplier.code === "cjdropshipping" && placed?.shipmentOrderId && placed.status === "CREATED") {
      const { confirmCjCart } = await import("@/lib/sourcing/connectors/cjdropshipping");
      cart = await confirmCjCart(placed.shipmentOrderId)
        .then((c) => (c.intercepted.length ? { error: `CJ 확정 차단: ${c.intercepted.join(", ")}` } : { shipmentsId: c.shipmentsId }))
        .catch((e: unknown) => ({ error: e instanceof Error ? e.message : String(e) }));
      if (!cart.error) placed.status = "UNPAID";
    }

    const so: SourcingOrder = {
      id: nextId(s),
      purchaseRequestId: pr.id,
      supplierId: supplier.id,
      supplierProductId: sp?.id ?? 0,
      orderPayload: {
        externalId: orderExternalId,
        variantId,
        qty: pr.qty,
        ...(exported ? { pid: exported.pid, option: exported.optionName, documentId: listing.id } : {}),
      },
      supplierOrderRef,
      costUsd: +(unitCostUsd * pr.qty).toFixed(2),
      shippingUsd: 3 * pr.qty,
      status: supplierOrderRef ? "confirmed" : "requested",
      orderKind: opts?.orderKind ?? "wholesale",
      cjStatus: supplierOrderRef ? placed?.status ?? "UNPAID" : undefined,
      cjOrderCode: placed?.orderCode,
      cjShipmentOrderId: placed?.shipmentOrderId,
      cjPayShipmentId: cart.shipmentsId,
      cjConfirmError: cart.error,
      payUrl: supplierOrderRef ? cjPayPageUrl(supplierOrderRef) : undefined,
      createdAt: iso(),
    };
    s.sourcingOrders.unshift(so);
    pr.status = "sourcing";
    audit(s, "sourcing_order", so.id, so.status, actor, undefined, { supplierOrderRef });
    return so;
  });
}

/* ---------- P6: 전이 + 정산 ---------- */
const SO_FLOW: Record<string, string[]> = {
  requested: ["confirmed", "failed", "cancelled"],
  confirmed: ["shipped", "cancelled", "as_delegated"],
  shipped: ["delivered", "as_delegated"],
  delivered: ["settled", "as_delegated"],
};

export async function advanceSourcingOrder(
  soId: number,
  to: string,
  actor: string,
  extra?: { trackingNo?: string; carrier?: string; supplierOrderRef?: string; asTicketRef?: string },
) {
  const so = await mutate((s) => {
    const sourcingOrder = s.sourcingOrders.find((o) => o.id === soId);
    if (!sourcingOrder) throw new Error("sourcing order not found");
    if ((to === "shipped" || to === "delivered") && !canShipFromCj(sourcingOrder.cjStatus)) {
      throw new Error("CJ 결제대기 — 출고/완료 불가");
    }
    if (to === "as_delegated" && !canOpenDispute(sourcingOrder.cjStatus)) {
      throw new Error("CJ 마감/취소 건은 분쟁 불가");
    }
    const allowed = SO_FLOW[sourcingOrder.status] ?? [];
    if (!allowed.includes(to)) throw new Error(`invalid transition ${sourcingOrder.status}→${to}`);
    const from = sourcingOrder.status;
    sourcingOrder.status = to as typeof sourcingOrder.status;
    if (extra?.trackingNo) sourcingOrder.trackingNo = extra.trackingNo;
    if (extra?.carrier) sourcingOrder.carrier = extra.carrier;
    if (extra?.supplierOrderRef) sourcingOrder.supplierOrderRef = extra.supplierOrderRef;
    if (extra?.asTicketRef) sourcingOrder.asTicketRef = extra.asTicketRef;
    audit(s, "sourcing_order", sourcingOrder.id, to, actor, from, extra as Record<string, unknown>);

    const pr = s.purchaseRequests.find((p) => p.id === sourcingOrder.purchaseRequestId);
    if (pr) {
      if (to === "delivered") pr.status = "fulfilled";
      if (to === "as_delegated") pr.status = "refund_delegated";
      if (to === "settled") pr.status = "closed";
    }

    if (to === "delivered") ensureSettlementForDelivered(s, sourcingOrder, "system");
    return sourcingOrder;
  });

  if (to === "shipped" && extra?.trackingNo) await pushChannelInvoices();
  return so;
}

/** CJ delivered 동기화와 수동 배송완료가 같은 마진 원장을 만든다. 월렛 잔액은 넣지 않는다. */
export function ensureSettlementForDelivered(s: HqState, so: SourcingOrder, actor: string) {
  const pr = s.purchaseRequests.find((p) => p.id === so.purchaseRequestId);
  if (!pr || s.settlements.some((x) => x.sourcingOrderId === so.id)) return;
  const channel = s.channels.find((c) => c.id === pr.channelId);
  const fxRate = s.fx[pr.channelCurrency?.toUpperCase() ?? "USD"] ?? 1;
  const revenueUsd = so.orderKind === "sample" ? 0 : +(pr.channelPaidAmount * fxRate).toFixed(2);
  const channelFeeUsd = +(revenueUsd * (channel?.config.feeRate ?? 0.1)).toFixed(2);
  const pgFeeUsd = +(revenueUsd * 0.028).toFixed(2);
  const marginUsd = +(revenueUsd - so.costUsd - so.shippingUsd - channelFeeUsd - pgFeeUsd).toFixed(2);
  const cfg = payoutConfig();
  const decision = resolvePayoutEntity(
    { country: pr.buyerCountry ?? "", amountUsd: revenueUsd, partnersMtdKrw: partnersMtdKrw(s) },
    cfg,
  );
  const { consignmentCommissionUsd, remitToPrincipalUsd } = splitConsignment(decision, revenueUsd, cfg);
  const st = {
    id: nextId(s), sourcingOrderId: so.id,
    channelId: channel?.id,
    channelCode: channel?.code,
    revenueUsd, costUsd: so.costUsd, shippingUsd: so.shippingUsd,
    channelFeeUsd, pgFeeUsd, marginUsd, fxRate,
    payoutEntity: decision.entity,
    payoutTrack: decision.track,
    consignmentCommissionUsd,
    remitToPrincipalUsd,
    orderDate: pr.createdAt,
    status: "pending" as const, createdAt: iso(),
  };
  s.settlements.unshift(st);
  audit(s, "settlement", st.id, "pending", actor, undefined, {
    marginUsd, payoutEntity: decision.entity, track: decision.track, reason: decision.reason,
  });
  if (decision.capExceededAlert) {
    audit(s, "settlement", st.id, "cap_alert", actor, undefined, { reason: decision.reason });
  }
}

export async function confirmSettlement(id: number, actor: string) {
  return mutate((s) => {
    const st = s.settlements.find((x) => x.id === id);
    if (!st) throw new Error("settlement not found");
    const soLock = s.sourcingOrders.find((o) => o.id === st.sourcingOrderId);
    if (!canConfirmLexiSettlement({ cjStatus: soLock?.cjStatus, makeupOpen: soLock?.makeupOpen })) {
      throw new Error(soLock?.makeupOpen ? "CJ 차액 미결제 — 마진 확정 불가" : "CJ 결제대기 — 마진 확정 불가");
    }
    st.status = "confirmed";
    st.settledAt = iso();
    const so = s.sourcingOrders.find((o) => o.id === st.sourcingOrderId);
    if (so && so.status === "delivered") {
      so.status = "settled";
      const pr = s.purchaseRequests.find((p) => p.id === so.purchaseRequestId);
      if (pr) pr.status = "closed";
    }
    audit(s, "settlement", st.id, "confirmed", actor, "pending");
    return st;
  });
}

/* ---------- 트래킹 폴링 (cron) ---------- */
export async function pollTracking() {
  const tracking = await mutate(async (s) => {
    const active = s.sourcingOrders.filter((o) => (o.status === "confirmed" || o.status === "shipped") && !isCjUnpaid(o.cjStatus));
    let updated = 0;
    for (const so of active) {
      const supplier = s.suppliers.find((x) => x.id === so.supplierId);
      const connector = supplier && getConnector(supplier.code);
      if (!connector?.getTracking || !so.supplierOrderRef) continue;
      const t = await connector.getTracking(so.supplierOrderRef).catch(() => null);
      if (!t) continue;
      if (t.trackingNo && !so.trackingNo) {
        so.trackingNo = t.trackingNo;
        so.carrier = t.carrier;
        if (so.status === "confirmed") {
          so.status = "shipped";
          audit(s, "sourcing_order", so.id, "shipped", "cron", "confirmed", { trackingNo: t.trackingNo });
        }
        updated++;
      }
    }
    return { checked: active.length, updated };
  });
  const invoices = await pushChannelInvoices();
  return { ...tracking, invoices };
}

function pickListingVariantId(
  options: ListingOption[] | undefined,
  hint?: string,
  pid?: string,
  variantSku?: string,
): string | undefined {
  if (!options?.length) return undefined;
  return pickSupplyOption(options.filter((o) => o.sku && o.sku !== pid), hint, variantSku)?.sku;
}
