/**
 * 스크립트로 직접 등록한 쿠팡 상품(CJYD2717187, sellerProductId 16406104949)을 HQ에 연결한다.
 * catalog_index + export_shelf + channel listing(live) 등록 → 이미 들어온 쿠팡 주문 구매요청 재매칭 → (선택) CJ 발주.
 * Usage: npx tsx scripts/link-coupang-cjyd2717187-hq.ts [--link] [--place]
 *   (플래그 없음 = 읽기 전용 점검) --link: 로컬 DB 등록·재매칭 / --place: CJ 발주(createOrderV2, 결제 전 단계)
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

import { readFile } from "node:fs/promises";
import path from "node:path";

const SELLER_PRODUCT_ID = "16406104949";
const DOCUMENT_ID = Number(SELLER_PRODUCT_ID);
const ORDER_ID = process.env.ORDER_ID || "3103601680449";
const args = new Set(process.argv.slice(2));

async function main() {
  const { db } = await import("../src/db");
  const { catalogIndex, exportShelf } = await import("../src/db/schema");
  const { and, eq, sql } = await import("drizzle-orm");
  const { upsertChannelListingFromExport } = await import("../src/lib/hq/listing-stats");
  const { getState, mutate } = await import("../src/lib/hq/store");
  const { createSourcingOrder } = await import("../src/lib/hq/services");

  const product = JSON.parse(await readFile(path.resolve("tmp/cj-trench-long-product.json"), "utf8")).data;
  const pid = String(product.pid);
  const variants = (product.variants as { vid: string | number; variantKey: string; variantSellPrice: number }[]).map((v) => ({
    sku: String(v.vid),
    name: String(v.variantKey),
    stock: 10,
    costUsd: Number(v.variantSellPrice),
  }));

  if (args.has("--link")) {
    // id 시퀀스가 실제 최대값보다 뒤처져 있고 GENERATED ALWAYS라, 이 행들만 max+1 + OVERRIDING SYSTEM VALUE로 넣는다(시퀀스 미변경)
    let [cat] = await db().select().from(catalogIndex).where(and(eq(catalogIndex.supplierCode, "cjdropshipping"), eq(catalogIndex.externalId, pid))).limit(1);
    if (!cat) {
      const title = String(product.productNameEn);
      const thumb = String(product.productImage ?? "").match(/https?:\/\/[^"\s,\]]+/)?.[0] ?? null;
      await db().execute(sql`
        insert into catalog_index (id, supplier_code, external_id, title, category_path, min_price, max_price, currency, stock,
                                   primary_thumb_url, seller_name, source_url, searchable_text, content_hash)
        overriding system value
        select coalesce(max(id), 0) + 1, 'cjdropshipping', ${pid}, ${title}, array['Women''s Clothing'], 15.75, 15.75, 'USD', 10,
               ${thumb}, 'LEXI 소싱', ${`https://cjdropshipping.com/product/-p-${pid}.html`}, ${title.toLowerCase()}, ${`script-${pid}`}
          from catalog_index`);
      [cat] = await db().select().from(catalogIndex).where(and(eq(catalogIndex.supplierCode, "cjdropshipping"), eq(catalogIndex.externalId, pid))).limit(1);
    }
    let [shelf] = await db().select().from(exportShelf).where(eq(exportShelf.documentId, DOCUMENT_ID)).limit(1);
    const shelfExisted = Boolean(shelf);
    if (!shelf) {
      await db().execute(sql`
        insert into export_shelf (id, document_id, catalog_id, stage, title, title_ko, stock_default, options, channels_desired, meta)
        overriding system value
        select coalesce(max(id), 0) + 1, ${DOCUMENT_ID}, ${cat.id}, 'shelf', 'LEXI Women''s Long Suede Trench Coat',
               'LEXI 여성 롱 스웨이드 트렌치코트', 10, ${JSON.stringify(variants)}::jsonb, array['coupang'],
               ${JSON.stringify({ source: "script-published", coupangSellerProductId: SELLER_PRODUCT_ID })}::jsonb
          from export_shelf`);
      [shelf] = await db().select().from(exportShelf).where(eq(exportShelf.documentId, DOCUMENT_ID)).limit(1);
    }
    await upsertChannelListingFromExport({ channelCode: "coupang", documentId: DOCUMENT_ID, publishState: "live", externalRef: SELLER_PRODUCT_ID });
    console.log("linked: catalog", cat.id, "shelf", shelf?.id, shelfExisted ? "(existed)" : "(created)");
  }

  const rematched: number[] = [];
  await mutate((s) => {
    const ch = s.channels.find((c) => c.code === "coupang");
    const cl = s.channelListings.find((c) => c.channelId === ch?.id && c.externalRef === SELLER_PRODUCT_ID);
    const prs = s.purchaseRequests.filter((p) => p.channelId === ch?.id && p.externalOrderRef.startsWith(`${ORDER_ID}`));
    console.log("coupang listing for", SELLER_PRODUCT_ID, "=>", cl ? { id: cl.id, state: cl.publishState } : "NONE");
    for (const p of prs) {
      const so = s.sourcingOrders.find((o) => o.purchaseRequestId === p.id);
      console.log("PR", p.id, p.externalOrderRef, "status", p.status, "listing", p.channelListingId ?? "-", "sourcing", so?.supplierOrderRef ?? "-");
      if (args.has("--link") && cl && !p.channelListingId && !so) {
        p.channelListingId = cl.id;
        p.status = "matched";
        rematched.push(p.id);
      }
    }
  });
  if (rematched.length) console.log("rematched PRs:", rematched.join(","));

  if (args.has("--place")) {
    const s = await getState();
    const ch = s.channels.find((c) => c.code === "coupang");
    const ids = s.purchaseRequests
      .filter((p) => p.channelId === ch?.id && p.externalOrderRef.startsWith(ORDER_ID) && p.status === "matched")
      .map((p) => p.id);
    for (const id of ids) {
      try {
        const so = await createSourcingOrder(id, "auto:coupang-link", { autoVet: true });
        console.log("CJ order placed for PR", id, "=>", so.supplierOrderRef, so.cjStatus, so.cjConfirmError ?? "");
      } catch (e) {
        console.log("CJ order FAILED for PR", id, "=>", e instanceof Error ? e.message : String(e));
      }
    }
    if (!ids.length) console.log("no matched PRs to place");
  }
  if (args.has("--confirm")) {
    const { syncCjSourcingOrders, confirmSourcingOrder } = await import("../src/lib/hq/cj-order-sync");
    console.log("CJ sync:", JSON.stringify(await syncCjSourcingOrders()));
    const s = await getState();
    const ch = s.channels.find((c) => c.code === "coupang");
    const prIds = new Set(s.purchaseRequests.filter((p) => p.channelId === ch?.id && p.externalOrderRef.startsWith(ORDER_ID)).map((p) => p.id));
    for (const so of s.sourcingOrders.filter((o) => prIds.has(o.purchaseRequestId))) {
      console.log("SO", so.id, "PR", so.purchaseRequestId, "ref", so.supplierOrderRef, "cj", so.cjStatus);
      if (so.cjStatus === "CREATED" || so.cjStatus === "IN_CART") {
        try {
          const r = await confirmSourcingOrder(so.id, "auto:coupang-link");
          console.log("confirmed SO", so.id, "=>", r.cjStatus, r.cjConfirmError ?? "");
        } catch (e) {
          console.log("confirm FAILED SO", so.id, "=>", e instanceof Error ? e.message : String(e));
        }
      }
    }
  }
  await new Promise((r) => setTimeout(r, 3000));
  process.exit(0);
}

main().catch((e) => {
  console.error("failed:", e instanceof Error ? e.message.slice(0, 80) : e);
  const cause = (e as { cause?: { message?: string; detail?: string; constraint?: string } })?.cause;
  if (cause) console.error("cause:", cause.message, cause.detail ?? "", cause.constraint ?? "");
  process.exit(1);
});
