/**
 * 알리바바 커넥터 end-to-end 파이프라인 검증 (DB 불필요, 메모리 상태).
 * 실행: npx tsx scripts/verify-alibaba.ts
 */
import { connectorCodes, getConnector } from "@/lib/sourcing/registry";
import { syncSupplier, importByUrl } from "@/lib/sourcing/sync";
import { getState } from "@/lib/hq/store";

async function main() {
  console.log("등록된 커넥터:", connectorCodes.join(", "));
  const c = getConnector("alibaba");
  console.log("alibaba 커넥터 로드:", c ? "OK" : "실패");

  // 1) 카탈로그 sync (목업 픽스처 인제스트)
  const stats = await syncSupplier("alibaba", { pages: 1 });
  console.log("\n[sync 결과]", stats);

  // 2) URL 단건 임포트
  const imp = await importByUrl("alibaba", "https://detail.1688.com/offer/987654321.html");
  console.log("[importByUrl 결과]", imp);

  // 3) 인제스트된 supplier_products 확인
  const s = await getState();
  const supplier = s.suppliers.find((x) => x.code === "alibaba");
  const rows = s.supplierProducts.filter((p) => p.supplierId === supplier?.id);
  console.log(`\n[supplier_products] alibaba 공급처(id=${supplier?.id}) 상품 ${rows.length}건:`);
  for (const r of rows.slice(0, 5)) {
    console.log(`  - ${r.externalId} | ${r.rawTitle} | ${r.priceOriginal}${r.currency} | stock=${r.stock} | ${r.syncStatus}`);
  }
  if (rows.length > 5) console.log(`  ... 외 ${rows.length - 5}건`);
  console.log("\n검증 완료.");
}

main().catch((e) => {
  console.error("검증 실패:", e);
  process.exit(1);
});
