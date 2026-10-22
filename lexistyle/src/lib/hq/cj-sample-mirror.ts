import { createCjSampleMirror, stableCjSampleOrderNumber } from "@/lib/sourcing/connectors/cjdropshipping";
import { audit, getState, iso, mutate } from "./store";

const DEFAULT_START_AT = "2026-10-21T00:00:00.000Z";
const MAX_PER_RUN = 20;
const text = (value: unknown) => typeof value === "string" && value ? value : undefined;

export function needsCjSampleMirror(input: {
  supplierId: number;
  expectedSupplierId: number;
  channelId?: number;
  expectedChannelId: number;
  sourcingCreatedAt: string;
  startAt: number;
  existingRef?: unknown;
}) {
  return input.supplierId === input.expectedSupplierId &&
    input.channelId === input.expectedChannelId &&
    Number.isFinite(input.startAt) &&
    Date.parse(input.sourcingCreatedAt) >= input.startAt &&
    !text(input.existingRef);
}

/** 쿠팡 신건의 두 번째 CJ 미결제 주문. 원발주의 결제·송장 파이프라인과 완전히 분리한다. */
export async function syncCoupangCjSampleMirrors(actor: string) {
  if (process.env.CJ_COUPANG_SAMPLE_MIRROR === "0") {
    return { queued: 0, created: 0, failed: 0, results: [] as { sourcingOrderId: number; ok: boolean; error?: string }[] };
  }
  const snapshot = await getState();
  const channel = snapshot.channels.find((row) => row.code === "coupang");
  const supplier = snapshot.suppliers.find((row) => row.code === "cjdropshipping");
  if (!channel || !supplier) return { queued: 0, created: 0, failed: 0, results: [] };
  const startAt = Date.parse(process.env.CJ_SAMPLE_MIRROR_START_AT || DEFAULT_START_AT);
  const targets = snapshot.sourcingOrders
    .map((order) => ({ order, pr: snapshot.purchaseRequests.find((row) => row.id === order.purchaseRequestId) }))
    .filter(({ order, pr }) => needsCjSampleMirror({
      supplierId: order.supplierId,
      expectedSupplierId: supplier.id,
      channelId: pr?.channelId,
      expectedChannelId: channel.id,
      sourcingCreatedAt: order.createdAt,
      startAt,
      existingRef: order.orderPayload?.cjSampleMirrorOrderRef,
    }))
    .slice(0, MAX_PER_RUN);

  const results: { sourcingOrderId: number; ok: boolean; orderRef?: string; error?: string }[] = [];
  for (const { order, pr } of targets) {
    if (!pr) continue;
    try {
      const externalId = text(order.orderPayload?.externalId);
      if (!externalId) throw new Error("샘플 미러 상품 ID 없음");
      const placed = await createCjSampleMirror({
        externalId,
        variantId: text(order.orderPayload?.variantId),
        variantHint: pr.optionLabel,
        qty: pr.qty,
        shippingAddress: pr.shippingAddress ?? {},
        note: `LEXI SAMPLE PR#${pr.id} / coupang ${pr.externalOrderRef}`,
        store: {
          orderedAt: pr.rawRow?.orderedAt || pr.createdAt,
          lineItemId: pr.rawRow?.vendorItemId || pr.externalOrderRef,
          productName: pr.productTitle,
          sku: pr.rawRow?.externalVendorSku || pr.externalListingRef,
          option: pr.optionLabel,
        },
      }, stableCjSampleOrderNumber(pr.externalOrderRef));
      if (!placed.supplierOrderRef) throw new Error("CJ 샘플 미러 주문번호 없음");
      await mutate((state) => {
        const current = state.sourcingOrders.find((row) => row.id === order.id);
        if (!current) return;
        current.orderPayload = {
          ...(current.orderPayload ?? {}),
          cjSampleMirrorOrderRef: placed.supplierOrderRef,
          cjSampleMirrorShipmentId: placed.shipmentOrderId,
          cjSampleMirrorOrderCode: placed.orderCode,
          cjSampleMirrorStatus: placed.status ?? "CREATED",
          cjSampleMirrorCreatedAt: iso(),
          cjSampleMirrorError: "",
        };
        audit(state, "sourcing_order", current.id, "cj_sample_mirror_created", actor, current.status, {
          orderRef: placed.supplierOrderRef,
          payment: "disabled",
        });
      });
      results.push({ sourcingOrderId: order.id, ok: true, orderRef: placed.supplierOrderRef });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await mutate((state) => {
        const current = state.sourcingOrders.find((row) => row.id === order.id);
        if (!current) return;
        current.orderPayload = {
          ...(current.orderPayload ?? {}),
          cjSampleMirrorAttemptedAt: iso(),
          cjSampleMirrorError: message,
        };
        audit(state, "sourcing_order", current.id, "cj_sample_mirror_failed", actor, current.status, { error: message });
      });
      results.push({ sourcingOrderId: order.id, ok: false, error: message });
    }
  }
  return {
    queued: targets.length,
    created: results.filter((row) => row.ok).length,
    failed: results.filter((row) => !row.ok).length,
    results,
  };
}
