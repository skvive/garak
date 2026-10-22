import {
  cjConfigured,
  fetchCjTrackInfo,
  getCjOrder,
  type CjTrackInfo,
} from "@/lib/sourcing/connectors/cjdropshipping";
import { getState } from "./store";
import { customerCarrier, customerText, TRACK_STAGES, trackStage, type TrackRoute } from "./track-public";

export type PublicCjTrackingView = {
  lookupKind: "order" | "tracking";
  reference: string;
  trackingNo?: string;
  carrier: string;
  orderStatus?: string;
  stageIndex: number;
  stageLabel: string;
  routes: TrackRoute[];
  fetchedAt: string;
};

export const isValidCjLookupReference = (value: string) =>
  /^[A-Za-z0-9][A-Za-z0-9_-]{5,63}$/.test(value.trim());

const orderStatusKo = (status?: string) => {
  const value = (status ?? "").toUpperCase();
  if (["CREATED", "UNPAID"].includes(value)) return "주문 접수";
  if (["PENDING", "PROCESSING"].includes(value)) return "상품 준비";
  if (["DISPATCHED", "SHIPPED"].includes(value)) return "배송 중";
  if (["DELIVERED", "CLOSED"].includes(value)) return "배송 완료";
  if (["CANCELLED", "FAILED"].includes(value)) return "주문 종료";
  return value ? "처리 중" : undefined;
};

const sourcingStatus = (status?: string) => {
  const value = (status ?? "").toUpperCase();
  if (["DELIVERED", "CLOSED"].includes(value)) return "delivered";
  if (["DISPATCHED", "SHIPPED"].includes(value)) return "shipped";
  return "confirmed";
};

export function buildPublicCjTrackingView(input: {
  reference: string;
  lookupKind: "order" | "tracking";
  trackingNo?: string;
  carrier?: string;
  orderStatus?: string;
  tracking?: CjTrackInfo | null;
  now?: Date;
}): PublicCjTrackingView {
  const stage = trackStage(input.tracking?.status, sourcingStatus(input.orderStatus));
  return {
    lookupKind: input.lookupKind,
    reference: input.reference,
    trackingNo: input.trackingNo,
    carrier: customerCarrier(input.carrier),
    orderStatus: orderStatusKo(input.orderStatus),
    stageIndex: stage.index,
    stageLabel: TRACK_STAGES[stage.index],
    routes: (input.tracking?.routes ?? [])
      .slice(0, 50)
      .map((route) => ({ ...route, text: customerText(route.text) })),
    fetchedAt: (input.now ?? new Date()).toISOString(),
  };
}

/**
 * 서버의 CJ 계정으로 한 건만 조회한다. 고객 응답에는 배송 필드만 담고
 * CJ 주문 상세의 주소·연락처·금액·상품 정보는 반환하지 않는다.
 */
export async function lookupPublicCjTracking(rawReference: string): Promise<PublicCjTrackingView | null> {
  const reference = rawReference.trim();
  if (!isValidCjLookupReference(reference) || !cjConfigured()) return null;

  const state = await getState().catch(() => null);
  const local = state?.sourcingOrders.find((order) =>
    [order.supplierOrderRef, order.cjShipmentOrderId, order.trackingNo].some((value) => value === reference),
  );
  const knownTracking = local?.trackingNo === reference;
  const orderId = local?.supplierOrderRef ?? (knownTracking ? undefined : reference);
  const order = orderId ? await getCjOrder(orderId).catch(() => null) : null;
  const trackingNo = knownTracking ? reference : order?.trackingNo ?? local?.trackingNo;

  if (order || local) {
    const tracking = trackingNo ? await fetchCjTrackInfo(trackingNo).catch(() => null) : null;
    return buildPublicCjTrackingView({
      reference,
      lookupKind: knownTracking ? "tracking" : "order",
      trackingNo,
      carrier: order?.logisticName ?? local?.logisticName ?? local?.carrier,
      orderStatus: order?.status ?? local?.cjStatus,
      tracking,
    });
  }

  const tracking = await fetchCjTrackInfo(reference).catch(() => null);
  if (!tracking || (!tracking.status && tracking.routes.length === 0)) return null;
  return buildPublicCjTrackingView({ reference, lookupKind: "tracking", trackingNo: reference, tracking });
}
