/**
 * 실제 CJ 상품으로 소싱→AI리뉴얼→자사몰 게시 관통 (발주 제외 — 실주문 방지).
 * 실행: npx tsx scripts/verify-cj-live-sourcing.ts
 */
import "dotenv/config";
import { mutate, getState, iso, nextId } from "@/lib/hq/store";
import { syncSupplier } from "@/lib/sourcing/sync";
import { generateDraftsForCollection } from "@/lib/renewal/generate";
import { reviewDraft, queuePublish, processPublishQueue } from "@/lib/hq/services";

const A = "cj-live-sourcing";

async function main() {
  console.log("CJ 모드:", process.env.CJ_API_KEY ? "실 API" : "목업");

  // 1) 실제 CJ 소싱 (1페이지)
  const stats = await syncSupplier("cjdropshipping", { pages: 1 });
  console.log("\n[1] 실 CJ 소싱:", JSON.stringify(stats));

  // 유효 가격(>0) 상품 하나 선택
  const st0 = await getState();
  const sp = st0.supplierProducts.find((p) => p.supplierId === 1 && p.priceOriginal > 0)!;
  console.log(`   → 선택: ${sp.externalId}`);
  console.log(`   원본 제목(CJ): "${sp.rawTitle}"`);
  console.log(`   원가: ${sp.priceOriginal} ${sp.currency}`);

  // 2) 컬렉션 담기 + 승인
  await mutate((s) => {
    s.collectionItems.push({ id: nextId(s), collectionId: 1, supplierProductId: sp.id, decision: "approved", pinnedAt: iso() });
  });

  // 3) AI 리뉴얼 초안
  const gen = await generateDraftsForCollection(1, A);
  const draftId = (gen as { draftIds: number[] }).draftIds[0];
  const draft = (await getState()).drafts.find((d) => d.id === draftId)!;
  console.log(`\n[3] AI 리뉴얼 초안:`);
  console.log(`   가공 제목(LEXI): "${draft.title}"`);
  console.log(`   SEO 키워드: ${draft.seoKeywords.slice(0, 6).join(", ")}`);

  // 4) 승인 → 리스팅(가격정책 적용)
  const rev = await reviewDraft(draftId, "approved", A);
  const listing = (rev as { listing: { id: number; supplierCostUsd: number; sellPriceUsd: number } }).listing;
  console.log(`\n[4] 리스팅: 원가 $${listing.supplierCostUsd} → 판매가 $${listing.sellPriceUsd} (마진 정책 적용)`);

  // 5) 자사몰 게시
  await queuePublish(listing.id, ["lexi"], A);
  await processPublishQueue();
  const cl = (await getState()).channelListings.find((c) => c.listingId === listing.id)!;
  console.log(`\n[5] 자사몰 게시: ${cl.publishState} | ${cl.externalRef}`);

  console.log("\n========================================");
  console.log("✅ 실제 CJ 상품 → AI 가공 → 자사몰 게시 관통 성공");
  console.log("   (발주는 실주문 방지 위해 제외 — 승인 후 별도 진행)");
  console.log("========================================");
}

main().catch((e) => { console.error("실패:", e instanceof Error ? e.message : e); process.exit(1); });
