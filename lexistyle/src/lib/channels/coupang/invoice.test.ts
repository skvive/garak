import assert from "node:assert/strict";
import { test } from "node:test";
import { assertInvoiceResponse, buildInvoiceDtos, coupangInvoiceNumber, CoupangInvoiceError } from "./invoice";

test("DIRECT는 숫자만, 다른 택배사는 송장번호 그대로", () => {
  assert.equal(coupangInvoiceNumber("DIRECT", " LP425900258CN "), "425900258");
  assert.equal(coupangInvoiceNumber("CAINIAO", " LP425900258CN "), "LP425900258CN");
  assert.throws(() => coupangInvoiceNumber("DIRECT", "ABC"), CoupangInvoiceError);
});

test("상품(vendorItemId)마다 전체배송 한 건씩 만들고 중복·빈 값은 제거", () => {
  const dtos = buildInvoiceDtos({
    orderId: "3103601680449",
    shipmentBoxId: "742622217748508",
    deliveryCompanyCode: "DIRECT",
    invoiceNumber: "425900258",
    vendorItemIds: ["96155574163", "96155574164", "96155574163", " "],
  });
  assert.equal(dtos.length, 2);
  assert.deepEqual(dtos[0], {
    shipmentBoxId: 742622217748508,
    orderId: 3103601680449,
    vendorItemId: 96155574163,
    deliveryCompanyCode: "DIRECT",
    invoiceNumber: "425900258",
    splitShipping: false,
    preSplitShipped: false,
    estimatedShippingDate: "",
  });
  assert.throws(
    () => buildInvoiceDtos({ orderId: "1", shipmentBoxId: "2", deliveryCompanyCode: "DIRECT", invoiceNumber: "1", vendorItemIds: [] }),
    CoupangInvoiceError,
  );
});

test("응답 판정: 성공만 통과하고 부분 실패·중복은 코드와 함께 던진다", () => {
  assert.doesNotThrow(() => assertInvoiceResponse({ responseCode: 0, responseList: [{ vendorItemId: 1, succeed: true }] }));
  assert.doesNotThrow(() => assertInvoiceResponse(undefined));
  assert.throws(
    () => assertInvoiceResponse({ responseCode: 1, responseList: [{ vendorItemId: 1, succeed: true }, { vendorItemId: 2, succeed: false, resultCode: "INVALID_STATUS" }] }),
    (e: unknown) => e instanceof CoupangInvoiceError && e.codes.includes("INVALID_STATUS"),
  );
  assert.throws(
    () => assertInvoiceResponse({ responseCode: 99, responseList: [{ vendorItemId: 1, succeed: false, resultCode: "DUPLICATE_INVOICE_NUMBER" }] }),
    (e: unknown) => e instanceof Error && /중복/.test(e.message),
  );
});
