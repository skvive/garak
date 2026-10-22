import { test } from "node:test";
import assert from "node:assert/strict";
import { findSourcingOrderForCj, linkCjIds, type CjRemoteOrder } from "./cj-order";
import { cjCreateOrderResult, cjStoreLineFields, cjStoreOrderFields, stableCjOrderNumber, stableCjSampleOrderNumber } from "@/lib/sourcing/connectors/cjdropshipping";
import { kstIso } from "@/lib/channels/adapters/coupang";

test("쿠팡 주문 시각(KST)과 상품을 CJ 스토어주문 필드로", () => {
  const orderedAt = kstIso("2026-10-01T16:20:31");
  assert.equal(orderedAt, "2026-10-01T16:20:31+09:00");
  assert.equal(kstIso("2026-10-01T07:20:31Z"), "2026-10-01T07:20:31Z");
  const req = {
    externalId: "p",
    qty: 1,
    shippingAddress: {},
    store: { orderedAt, lineItemId: "v1", productName: "티셔츠", sku: "SKU1", option: "Black 2XL" },
  };
  assert.equal(cjStoreOrderFields(req, Date.parse("2026-10-02T00:00:00Z")).storeOrderTime, Date.parse("2026-10-01T07:20:31Z") / 1000);
  assert.equal(cjStoreOrderFields(req, Date.parse("2026-10-01T00:00:00Z")).storeOrderTime, Date.parse("2026-10-01T00:00:00Z") / 1000);
  assert.deepEqual(cjStoreLineFields(req), {
    storeLineItemId: "v1",
    storeProductName: "티셔츠",
    storeSku: "SKU1",
    variantOptions: "Black 2XL",
  });
});

const remote: CjRemoteOrder = {
  orderId: "2610010721310640200",
  orderCode: "LEXI-1790839287388",
  shipmentOrderId: "SD2610010721290646500",
  remark: "LEXI PR#1249 / 12103318381854",
  status: "CREATED",
};

test("SD shipmentOrderId로 저장된 발주를 CJ 주문 행과 매칭하고 orderId로 정규화", () => {
  const so = { id: 1254, purchaseRequestId: 1249, supplierOrderRef: "SD2610010721290646500" };
  const hit = findSourcingOrderForCj([so], remote);
  assert.equal(hit, so);
  linkCjIds(so, remote);
  assert.equal(so.supplierOrderRef, "2610010721310640200");
  assert.equal((so as { cjShipmentOrderId?: string }).cjShipmentOrderId, "SD2610010721290646500");
  assert.equal(findSourcingOrderForCj([so], remote), so);
});

test("orderNum, remark PR# 순으로 폴백 매칭", () => {
  const byCode = { purchaseRequestId: 1, supplierOrderRef: "X", cjOrderCode: "LEXI-1790839287388" };
  assert.equal(findSourcingOrderForCj([byCode], remote), byCode);
  const byRemark = { purchaseRequestId: 1249, supplierOrderRef: "OTHER" };
  assert.equal(findSourcingOrderForCj([byRemark], remote), byRemark);
  const other = { purchaseRequestId: 1249, supplierOrderRef: "OTHER", cjShipmentOrderId: "SD999" };
  assert.equal(findSourcingOrderForCj([other], remote), undefined);
});

test("createOrderV2 응답에서 orderId와 shipmentOrderId 분리", () => {
  assert.deepEqual(
    cjCreateOrderResult({ orderId: "261001", shipmentOrderId: "SD261001", orderNumber: "LEXI-1", orderStatus: "CREATED" }),
    { supplierOrderRef: "261001", shipmentOrderId: "SD261001", orderCode: "LEXI-1", status: "CREATED" },
  );
  assert.deepEqual(cjCreateOrderResult({ orderId: "SD261001" }, "LEXI-2"), {
    supplierOrderRef: "SD261001",
    shipmentOrderId: "SD261001",
    orderCode: "LEXI-2",
    status: "CREATED",
  });
});

test("CJ orderNumber is stable per channel line and bounded", () => {
  assert.equal(stableCjOrderNumber("coupang", "3103601680449"), "LEXI-COUPANG-3103601680449");
  const long = "3103601680449:" + "9".repeat(90);
  assert.equal(stableCjOrderNumber("coupang", long), stableCjOrderNumber("coupang", long));
  assert.ok(stableCjOrderNumber("coupang", long).length <= 50);
  assert.notEqual(stableCjOrderNumber("coupang", `${long}x`), stableCjOrderNumber("coupang", long));
});

test("쿠팡 샘플 미러 주문번호는 원발주와 다르고 재시도에도 안정적", () => {
  const ref = "3103601680449:96155574163";
  assert.notEqual(stableCjSampleOrderNumber(ref), stableCjOrderNumber("coupang", ref));
  assert.equal(stableCjSampleOrderNumber(ref), stableCjSampleOrderNumber(ref));
  assert.ok(stableCjSampleOrderNumber(ref).length <= 50);
});
