import assert from "node:assert/strict";
import { test } from "node:test";
import { planInvoiceBox } from "./channel-invoice";
import type { PurchaseRequest, SourcingOrder } from "./types";

const pr = (id: number): PurchaseRequest => ({
  id, channelId: 1, externalOrderRef: `O:${id}`, qty: 1, channelPaidAmount: 1, channelCurrency: "KRW",
  status: "sourcing", createdAt: "", rawRow: { shipmentBoxId: "B1", orderId: "O" },
});
const so = (id: number, trackingNo?: string, status: SourcingOrder["status"] = "shipped"): SourcingOrder => ({
  id, purchaseRequestId: id, supplierId: 1, supplierProductId: 1, costUsd: 1, shippingUsd: 1, trackingNo, status, createdAt: "",
});

test("one box waits until every item has a waybill", () => {
  assert.equal(planInvoiceBox([{ so: so(1, "T1"), pr: pr(1) }, { so: so(2, undefined, "confirmed"), pr: pr(2) }]).kind, "wait");
});

test("one box with one waybill uploads once", () => {
  const plan = planInvoiceBox([{ so: so(1, "T1"), pr: pr(1) }, { so: so(2, "T1"), pr: pr(2) }]);
  assert.equal(plan.kind, "push");
  if (plan.kind === "push") assert.equal(plan.members.length, 2);
});

test("different waybills in one box are not overwritten", () => {
  assert.equal(planInvoiceBox([{ so: so(1, "T1"), pr: pr(1) }, { so: so(2, "T2"), pr: pr(2) }]).kind, "split");
});

test("cancelled items do not block the box", () => {
  assert.equal(planInvoiceBox([{ so: so(1, "T1"), pr: pr(1) }, { so: so(2, undefined, "cancelled"), pr: pr(2) }]).kind, "push");
});
