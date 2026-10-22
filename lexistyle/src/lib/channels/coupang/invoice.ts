/** 쿠팡 송장 업로드/업데이트 요청 조립·응답 판정 (순수 함수). 규칙은 쿠팡 개발자센터 송장업로드·송장업데이트 문서 기준 */

export class CoupangInvoiceError extends Error {
  constructor(message: string, readonly codes: string[]) {
    super(message);
    this.name = "CoupangInvoiceError";
  }
}

/** DIRECT(업체직송)는 임의의 숫자만 허용하고 트래킹을 지원하지 않는다. 그 외 택배사는 송장번호 그대로 */
export function coupangInvoiceNumber(deliveryCompanyCode: string, trackingNo: string): string {
  const raw = trackingNo.trim();
  if (deliveryCompanyCode.toUpperCase() !== "DIRECT") return raw;
  const digits = raw.replace(/\D/g, "");
  if (!digits) throw new CoupangInvoiceError("업체직송 송장번호에 사용할 숫자가 없습니다", ["INVALID_INVOICE_NUMBER"]);
  return digits;
}

/** 상품(vendorItemId)마다 한 건. 상자 안 전 품목이 같은 송장·전체배송 */
export function buildInvoiceDtos(opts: {
  orderId: string;
  shipmentBoxId: string;
  deliveryCompanyCode: string;
  invoiceNumber: string;
  vendorItemIds: string[];
}) {
  const ids = [...new Set(opts.vendorItemIds.map((v) => v.trim()).filter(Boolean))];
  if (!ids.length) throw new CoupangInvoiceError("vendorItemId 없음 — 구매요청 rawRow를 확인하세요", ["NOT_FOUND_VENDOR_ITEM"]);
  return ids.map((vendorItemId) => ({
    shipmentBoxId: Number(opts.shipmentBoxId) || opts.shipmentBoxId,
    orderId: Number(opts.orderId) || opts.orderId,
    vendorItemId: Number(vendorItemId) || vendorItemId,
    deliveryCompanyCode: opts.deliveryCompanyCode,
    invoiceNumber: opts.invoiceNumber,
    splitShipping: false,
    preSplitShipped: false,
    estimatedShippingDate: "",
  }));
}

type InvoiceResponse = {
  responseCode?: number | string;
  responseMessage?: string;
  responseList?: { vendorItemId?: number | string; succeed?: boolean; resultCode?: string; resultMessage?: string }[];
};

/** responseCode 0만 성공. 부분 실패(1)·실패(99)·항목 succeed=false는 오류코드와 함께 던진다 */
export function assertInvoiceResponse(data: unknown): void {
  const r = (data && typeof data === "object" ? data : {}) as InvoiceResponse;
  const failed = (r.responseList ?? []).filter((x) => x.succeed === false);
  const code = r.responseCode === undefined ? 0 : Number(r.responseCode);
  if (code === 0 && !failed.length) return;
  const codes = failed.map((x) => String(x.resultCode ?? "UNDEFINED_ERROR_OCCUR"));
  const label = codes.includes("DUPLICATE_INVOICE_NUMBER") ? " (송장 중복·이미 등록)" : "";
  const detail = failed.map((x) => `${x.vendorItemId ?? "-"}:${x.resultCode ?? "?"}`).join(", ");
  throw new CoupangInvoiceError(`쿠팡 송장 실패${label} — ${detail || r.responseMessage || `responseCode ${code}`}`, codes);
}
