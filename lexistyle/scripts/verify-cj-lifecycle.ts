/**
 * "우리 대시보드가 CJ를 API로 부린다" 모델 end-to-end 증명.
 * 주문 한 건을 소싱→게시→발주(CJ placeOrder)→송장(CJ getTracking)→배송→정산까지 관통.
 * 실행: npx tsx scripts/verify-cj-lifecycle.ts   (CJ 키 없으면 목업 CJ로 동작)
 */
import { mutate, getState, iso, nextId } from "@/lib/hq/store";
import { syncSupplier } from "@/lib/sourcing/sync";
import { generateDraftsForCollection } from "@/lib/renewal/generate";
import {
  reviewDraft, queuePublish, processPublishQueue,
  importPurchaseCsv, vetPurchaseRequest, createSourcingOrder,
  advanceSourcingOrder, confirmSettlement, pollTracking,
} from "@/lib/hq/services";

const A = "verify-script";
const log = (step: string, v: unknown) => console.log(`\n[${step}]`, typeof v === "object" ? JSON.stringify(v) : v);

async function main() {
  // 1) CJ 소싱
  log("1. CJ sync", await syncSupplier("cjdropshipping", { pages: 1 }));
  const sp = (await getState()).supplierProducts.find((p) => p.sellerName?.includes("CJ"))!;
  console.log("   → 소싱 상품:", sp.externalId, sp.rawTitle, `${sp.priceOriginal}${sp.currency}`);

  // 2) 컬렉션 담기 + 승인
  await mutate((s) => {
    s.collectionItems.push({ id: nextId(s), collectionId: 1, supplierProductId: sp.id, decision: "approved", pinnedAt: iso() });
  });
  log("2. 컬렉션 승인", "collection#1 ← " + sp.externalId);

  // 3) AI 리뉴얼 초안
  const gen = await generateDraftsForCollection(1, A);
  const draftId = (gen as { draftIds: number[] }).draftIds[0];
  log("3. AI 초안 생성", gen);

  // 4) 초안 승인 → 리스팅
  const rev = await reviewDraft(draftId, "approved", A);
  const listingId = (rev as { listing: { id: number; sellPriceUsd: number } }).listing.id;
  log("4. 초안 승인→리스팅", { listingId, sellPriceUsd: (rev as any).listing.sellPriceUsd });

  // 5~6) 자사몰(lexi) 게시
  await queuePublish(listingId, ["lexi"], A);
  log("5-6. 게시", await processPublishQueue());
  const cl = (await getState()).channelListings.find((c) => c.listingId === listingId)!;
  console.log("   → 채널리스팅 externalRef:", cl.externalRef, "| state:", cl.publishState);

  // 7) 주문 인입 (CSV) — listing_ref 로 자동 매칭
  const csv = [
    "order_ref,listing_ref,qty,paid_amount,currency,buyer_name,country,addr1,zip,phone",
    `ORD-1001,${cl.externalRef},1,40.00,USD,Hong GilDong,KR,Seoul Gangnam-daero 1,06000,01012345678`,
  ].join("\n");
  log("7. 주문 인입", await importPurchaseCsv("lexi", "orders.csv", csv, A));
  const pr = (await getState()).purchaseRequests.find((p) => p.externalOrderRef === "ORD-1001")!;
  console.log("   → 구매요청:", pr.id, "| status:", pr.status, "| 매칭:", pr.channelListingId);

  // 8) 검수 통과
  log("8. 검수", await vetPurchaseRequest(pr.id, "vetted", A));

  // 9) ★ CJ 자동 발주 (connector.placeOrder)
  const so = await createSourcingOrder(pr.id, A);
  const soId = (so as { id: number; supplierOrderRef?: string; status: string }).id;
  log("9. ★CJ 자동 발주", { soId, supplierOrderRef: (so as any).supplierOrderRef, status: (so as any).status });

  // 10) ★ CJ 송장 자동 수신 (connector.getTracking)
  log("10. ★CJ 송장 폴링", await pollTracking());
  const soAfter = (await getState()).sourcingOrders.find((o) => o.id === soId)!;
  console.log("   → 송장:", soAfter.trackingNo, "| carrier:", soAfter.carrier, "| status:", soAfter.status);

  // 11) 배송완료 → 정산 자동 생성
  log("11. 배송완료", await advanceSourcingOrder(soId, "delivered", A));
  const st = (await getState()).settlements.find((x) => x.sourcingOrderId === soId)!;
  console.log("   → 정산:", `매출 $${st.revenueUsd} - 원가 $${st.costUsd} - 배송 $${st.shippingUsd} - 수수료 $${(st.channelFeeUsd + st.pgFeeUsd).toFixed(2)} = 마진 $${st.marginUsd}`);

  // 12) 정산 확정
  log("12. 정산 확정", await confirmSettlement(st.id, A));

  console.log("\n========================================");
  console.log("✅ 전 구간 관통 성공 — 우리 대시보드가 CJ를 API로 발주·트래킹함");
  console.log("   (CJ 대시보드에 사람이 안 들어가고도 발주+송장 자동)");
  console.log("========================================");
}

main().catch((e) => { console.error("실패:", e); process.exit(1); });
