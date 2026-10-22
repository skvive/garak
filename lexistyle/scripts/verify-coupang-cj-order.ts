/**
 * 쿠팡 실주문 → HQ 구매요청/소싱발주 → CJ 주문목록 대조. 읽기 전용(어디에도 쓰지 않음).
 * npx tsx scripts/verify-coupang-cj-order.ts [--days 7]
 */
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const args = process.argv.slice(2);
const days = Number(args[args.indexOf("--days") + 1]) || 7;
const mask = (v: unknown) => {
  const s = String(v ?? "");
  return s ? `${s.slice(0, 1)}${"*".repeat(Math.max(1, s.length - 1))}` : "";
};

type Row = Record<string, any>;

async function coupangOrders(): Promise<Row[]> {
  const { listOrdersheetsByStatus } = await import("../src/lib/channels/coupang/client");
  const out: Row[] = [];
  for (const status of ["ACCEPT", "INSTRUCT", "DEPARTURE", "DELIVERING", "FINAL_DELIVERY", "NONE_TRACKING"]) {
    for (const o of (await listOrdersheetsByStatus(status, days)) as Row[]) out.push({ ...o, _status: status });
    await new Promise((r) => setTimeout(r, 1500));
  }
  return out;
}

async function snapshot(url: string | undefined) {
  if (!url) return null;
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const r = await client.query(
      `select value->'channels' as channels, value->'purchaseRequests' as prs, value->'sourcingOrders' as sos, updated_at
         from hq_state where key = 'snapshot'`,
    );
    return r.rows[0] as { channels: Row[]; prs: Row[]; sos: Row[]; updated_at: string } | undefined;
  } finally {
    await client.end();
  }
}

async function cjRecentOrders(): Promise<Row[]> {
  const BASE = "https://developers.cjdropshipping.com/api2.0/v1";
  const auth = await fetch(`${BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.CJ_API_EMAIL, password: process.env.CJ_API_KEY }),
  }).then((r) => r.json());
  const token = auth?.data?.accessToken;
  if (!token) throw new Error(`CJ auth failed: ${auth?.message}`);
  const res = await fetch(`${BASE}/shopping/order/list?pageNum=1&pageSize=50`, { headers: { "CJ-Access-Token": token } }).then((r) => r.json());
  if (res?.code && res.code !== 200) throw new Error(`CJ list: ${res.message}`);
  return (res?.data?.list ?? []) as Row[];
}

function report(label: string, snap: Awaited<ReturnType<typeof snapshot>>, orderIds: Set<string>) {
  if (!snap) return console.log(`\n[${label}] 스냅샷 없음`);
  const coupang = (snap.channels ?? []).find((c) => c.code === "coupang");
  const prs = (snap.prs ?? []).filter((p) => p.channelId === coupang?.id);
  console.log(`\n[${label}] 스냅샷 갱신 ${snap.updated_at} · 쿠팡 구매요청 ${prs.length}건`);
  for (const p of prs.slice(0, 20)) {
    const so = (snap.sos ?? []).find((o) => o.purchaseRequestId === p.id);
    const base = String(p.externalOrderRef).split(":")[0];
    console.log(JSON.stringify({
      pr: p.id, orderRef: p.externalOrderRef, inCoupang: orderIds.has(base), status: p.status,
      matched: Boolean(p.channelListingId), option: p.optionLabel, qty: p.qty, paid: p.channelPaidAmount,
      box: p.rawRow?.shipmentBoxId, sku: p.rawRow?.externalVendorSku, createdAt: p.createdAt,
      sourcing: so ? { id: so.id, status: so.status, cjOrder: so.supplierOrderRef, cjStatus: so.cjStatus, vid: so.orderPayload?.variantId ?? so.orderPayload?.externalId, tracking: so.trackingNo, invoice: so.orderPayload?.channelInvoiceTracking, invoiceError: so.orderPayload?.channelInvoiceError } : null,
    }));
  }
  return prs;
}

async function main() {
  console.log(`== 쿠팡 발주서 (최근 ${days}일, KST)`);
  const orders = await coupangOrders();
  const orderIds = new Set(orders.map((o) => String(o.orderId)));
  for (const o of orders) {
    for (const it of (o.orderItems ?? []) as Row[]) {
      console.log(JSON.stringify({
        status: o._status, orderId: o.orderId, box: o.shipmentBoxId, orderedAt: o.orderedAt, receiver: mask(o.receiver?.name),
        sellerProductId: it.sellerProductId, vendorItemId: it.vendorItemId, sku: it.externalVendorSkuCode,
        item: it.vendorItemName, qty: it.shippingCount, price: it.orderPrice, invoice: o.invoiceNumber || null,
      }));
    }
  }
  if (!orders.length) console.log("(없음)");

  const prod = await snapshot(process.env.NEON_DATABASE_URL).catch((e) => (console.log(`\n[운영 Neon] 조회 실패: ${e.message}`), null));
  const prodPrs = report("운영 Neon 대시보드", prod, orderIds) ?? [];
  const local = process.env.DATABASE_URL !== process.env.NEON_DATABASE_URL
    ? await snapshot(process.env.DATABASE_URL).catch((e) => (console.log(`\n[로컬] 조회 실패: ${e.message}`), null))
    : null;
  report("로컬 대시보드", local, orderIds);

  console.log("\n== CJ 주문목록 (최근 50건)");
  const cj = await cjRecentOrders();
  const refs = new Set(
    prodPrs
      .map((p) => (prod?.sos ?? []).find((o) => o.purchaseRequestId === p.id))
      .flatMap((o) => [o?.supplierOrderRef, o?.cjShipmentOrderId])
      .filter(Boolean),
  );
  for (const r of cj) {
    const remark = String(r.remark ?? "");
    console.log(JSON.stringify({
      orderId: r.orderId, orderNum: r.orderNum, status: r.orderStatus, created: r.createDate, amount: r.orderAmount,
      track: r.trackNumber || null, logistic: r.logisticName, linkedToHq: refs.has(String(r.orderId)) || refs.has(String(r.cjOrderId)),
      coupangInRemark: [...orderIds].some((id) => remark.includes(id)), remark: remark.slice(0, 60),
    }));
  }
  if (!cj.length) console.log("(없음)");
}

main().catch((e) => {
  console.error("verify failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
