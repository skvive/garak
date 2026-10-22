import { coupangFullyConfigured, coupangVendorId } from "./constants";
import { coupangRequest } from "./client";
import { getCatalogByIds, searchCatalog } from "@/lib/catalog/index-store";
import { getState } from "@/lib/hq/store";

export type CoupangListingRow = {
  sellerProductId: string;
  vendorItemId: string;
  name: string;
  salePrice?: number;
  quantity?: number;
  status?: string;
  mock?: boolean;
};

export type CoupangInquiryRow = {
  inquiryId: string;
  content: string;
  answered: boolean;
  createdAt?: string;
  mock?: boolean;
};

export type CoupangReturnRow = {
  receiptId: string;
  orderId: string;
  status: string;
  reason?: string;
  createdAt?: string;
  mock?: boolean;
};

export type CoupangWingSettlement = {
  mock: boolean;
  from: string;
  to: string;
  rows: { date?: string; amount?: number; fee?: number; note?: string }[];
  note: string;
};

function yyyymmdd(d: Date) {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

export async function listCoupangSellerProducts(): Promise<CoupangListingRow[]> {
  if (!coupangFullyConfigured()) {
    return [
      { sellerProductId: "CP-MOCK-1", vendorItemId: "VI-MOCK-1", name: "LEXI serum (mock)", salePrice: 25900, quantity: 5, status: "ONSALE", mock: true },
    ];
  }
  const vendorId = coupangVendorId();
  const data = await coupangRequest(
    "GET",
    "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products",
    `vendorId=${encodeURIComponent(vendorId)}&maxPerPage=50`,
  );
  const list = (Array.isArray(data) ? data : (data as { data?: unknown[] })?.data ?? []) as Record<string, unknown>[];
  const out: CoupangListingRow[] = [];
  for (const p of list.slice(0, 50)) {
    const sellerProductId = String(p.sellerProductId ?? p.id ?? "");
    if (!sellerProductId) continue;
    let vendorItemId = String((p.items as { vendorItemId?: string }[] | undefined)?.[0]?.vendorItemId ?? "");
    let quantity = Number((p.items as { amount?: number }[] | undefined)?.[0]?.amount ?? 0);
    let salePrice = Number((p.items as { salePrice?: number }[] | undefined)?.[0]?.salePrice ?? 0);
    if (!vendorItemId) {
      try {
        const detail = (await coupangRequest(
          "GET",
          `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${sellerProductId}`,
        )) as { items?: { vendorItemId?: number; amount?: number; salePrice?: number }[]; sellerProductName?: string };
        vendorItemId = String(detail.items?.[0]?.vendorItemId ?? "");
        quantity = Number(detail.items?.[0]?.amount ?? quantity);
        salePrice = Number(detail.items?.[0]?.salePrice ?? salePrice);
      } catch {
        /* list-only */
      }
    }
    out.push({
      sellerProductId,
      vendorItemId,
      name: String(p.sellerProductName ?? p.displayProductName ?? sellerProductId),
      salePrice,
      quantity,
      status: String(p.statusName ?? p.status ?? ""),
    });
  }
  return out;
}

export async function setCoupangVendorItemQty(vendorItemId: string, quantity: number) {
  if (!coupangFullyConfigured()) return { ok: true, mock: true, vendorItemId, quantity };
  await coupangRequest("PUT", `/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/${vendorItemId}/quantities`, "", {
    quantity: Math.max(0, quantity),
  });
  return { ok: true, vendorItemId, quantity };
}

export async function stopCoupangVendorItem(vendorItemId: string) {
  if (!coupangFullyConfigured()) return { ok: true, mock: true, vendorItemId, stopped: true };
  await coupangRequest("PUT", `/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/${vendorItemId}/sales/stop`);
  return { ok: true, vendorItemId, stopped: true };
}

export async function resumeCoupangVendorItem(vendorItemId: string) {
  if (!coupangFullyConfigured()) return { ok: true, mock: true, vendorItemId, resumed: true };
  await coupangRequest("PUT", `/v2/providers/seller_api/apis/api/v1/marketplace/vendor-items/${vendorItemId}/sales/resume`);
  return { ok: true, vendorItemId, resumed: true };
}

/** C4 — HQ 리스팅/카탈로그 stock → vendor-item qty */
export async function syncCoupangStockFromHq() {
  const listings = await listCoupangSellerProducts();
  const s = await getState();
  const coupang = s.channels.find((c) => c.code === "coupang");
  const cls = coupang ? s.channelListings.filter((l) => l.channelId === coupang.id && l.externalRef) : [];

  let ok = 0;
  const errors: { ref: string; error: string }[] = [];
  for (const row of listings.slice(0, 40)) {
    if (!row.vendorItemId || row.mock) {
      if (row.mock) ok++;
      continue;
    }
    try {
      const cl = cls.find((x) => x.externalRef === row.sellerProductId);
      const listing = cl ? s.listings.find((l) => l.id === cl.listingId) : undefined;
      let stock = 0;
      const skuHit = /LEXI-(\d+)/.exec(row.name);
      if (skuHit) {
        const cat = (await getCatalogByIds([Number(skuHit[1])]))[0];
        stock = cat?.stock ?? 0;
      } else if (listing) {
        const cats = await searchCatalog({ q: listing.productSlug, importState: "imported", limit: 5 });
        stock = cats.items[0]?.stock ?? 0;
      } else {
        const cats = await searchCatalog({ q: row.name.slice(0, 40), importState: "imported", limit: 3 });
        stock = cats.items[0]?.stock ?? 0;
      }
      await setCoupangVendorItemQty(row.vendorItemId, stock);
      if (stock === 0) {
        try {
          await stopCoupangVendorItem(row.vendorItemId);
        } catch {
          /* qty 0 may already unlist */
        }
      }
      ok++;
    } catch (e) {
      errors.push({ ref: row.sellerProductId, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { ok, total: listings.length, errors: errors.slice(0, 20) };
}

export async function fetchCoupangWingSettlement(): Promise<CoupangWingSettlement> {
  const to = new Date();
  const from = new Date(Date.now() - 30 * 86400_000);
  if (!coupangFullyConfigured()) {
    return {
      mock: true,
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      rows: [{ date: to.toISOString().slice(0, 10), amount: 0, fee: 0, note: "키 없음 · 목업" }],
      note: "Wing 정산 API 미연결 · HQ 내부 마진 원장만 사용",
    };
  }
  const vendorId = coupangVendorId();
  try {
    const data = await coupangRequest(
      "GET",
      "/v2/providers/openapi/apis/api/v1/revenue-history",
      `vendorId=${encodeURIComponent(vendorId)}&recognitionDateFrom=${yyyymmdd(from)}&recognitionDateTo=${yyyymmdd(to)}`,
    );
    const rowsRaw = (Array.isArray(data) ? data : (data as { revenueHistory?: unknown[] }).revenueHistory ?? []) as Record<string, unknown>[];
    const rows = rowsRaw.slice(0, 31).map((r) => ({
      date: String(r.recognitionDate ?? r.date ?? ""),
      amount: Number(r.settlementAmount ?? r.amount ?? 0),
      fee: Number(r.fee ?? r.commission ?? 0),
      note: String(r.saleType ?? r.note ?? ""),
    }));
    return { mock: false, from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), rows, note: "Wing revenue-history 30일" };
  } catch (e) {
    return {
      mock: false,
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      rows: [],
      note: e instanceof Error ? e.message : "정산 조회 실패",
    };
  }
}

export async function listCoupangInquiries(): Promise<CoupangInquiryRow[]> {
  if (!coupangFullyConfigured()) {
    return [{ inquiryId: "INQ-MOCK-1", content: "배송은 얼마나 걸리나요?", answered: false, createdAt: new Date().toISOString(), mock: true }];
  }
  const vendorId = coupangVendorId();
  const to = new Date();
  const from = new Date(Date.now() - 14 * 86400_000);
  const data = await coupangRequest(
    "GET",
    `/v2/providers/openapi/apis/api/v2/vendors/${vendorId}/onlineInquiries`,
    `inquiryStartAt=${from.toISOString().slice(0, 19)}&inquiryEndAt=${to.toISOString().slice(0, 19)}&answeredType=ALL`,
  );
  const list = (Array.isArray(data) ? data : (data as { data?: unknown[] }).data ?? []) as Record<string, unknown>[];
  return list.slice(0, 40).map((r) => ({
    inquiryId: String(r.inquiryId ?? r.id ?? ""),
    content: String(r.content ?? r.inquiryContent ?? ""),
    answered: Boolean(r.answered ?? r.answerStatus === "ANSWERED"),
    createdAt: String(r.inquiryAt ?? r.createdAt ?? ""),
  }));
}

const FAQ_REPLY =
  "안녕하세요. LEXI입니다. 배송·반품은 주문일 기준 안내드리며, 청약철회는 수령 후 7일 이내 가능합니다. 추가 문의는 이 스레드에 남겨 주세요.";

export async function replyCoupangInquiry(inquiryId: string, content?: string) {
  const body = (content ?? FAQ_REPLY).slice(0, 1000);
  if (!coupangFullyConfigured()) return { ok: true, mock: true, inquiryId };
  const vendorId = coupangVendorId();
  await coupangRequest("POST", `/v2/providers/openapi/apis/api/v2/vendors/${vendorId}/onlineInquiries/${inquiryId}/replies`, "", {
    vendorId,
    content: body,
  });
  return { ok: true, inquiryId };
}

export async function listCoupangReturns(): Promise<CoupangReturnRow[]> {
  if (!coupangFullyConfigured()) {
    return [{ receiptId: "RT-MOCK-1", orderId: "CPORD-1", status: "RETURNS", reason: "단순변심 (목업)", createdAt: new Date().toISOString(), mock: true }];
  }
  const vendorId = coupangVendorId();
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 14 * 86400_000).toISOString().slice(0, 10);
  const data = await coupangRequest(
    "GET",
    `/v2/providers/openapi/apis/api/v2/vendors/${vendorId}/returnRequests`,
    `createdAtFrom=${from}&createdAtTo=${to}`,
  );
  const list = (Array.isArray(data) ? data : (data as { data?: unknown[] }).data ?? []) as Record<string, unknown>[];
  return list.slice(0, 40).map((r) => ({
    receiptId: String(r.receiptId ?? r.returnId ?? r.id ?? ""),
    orderId: String(r.orderId ?? ""),
    status: String(r.returnStatus ?? r.status ?? ""),
    reason: String(r.reasonCode ?? r.reason ?? ""),
    createdAt: String(r.createdAt ?? r.receiptTime ?? ""),
  }));
}
