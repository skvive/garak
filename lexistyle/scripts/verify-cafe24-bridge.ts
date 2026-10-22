/**
 * Cafe24 몰 → 소싱 파이프라인 브릿지 검증.
 * 실행: npx tsx scripts/verify-cafe24-bridge.ts
 * Cafe24 키가 .env에 있으면 실제 몰 상품을, 없으면 목업을 인제스트한다.
 */
import { connectorCodes } from "@/lib/sourcing/registry";
import { syncSupplier } from "@/lib/sourcing/sync";
import { getState } from "@/lib/hq/store";
import { cafe24Configured } from "@/lib/cafe24/config";

async function main() {
  console.log("등록된 커넥터:", connectorCodes.join(", "));
  console.log("Cafe24 연결 상태:", cafe24Configured() ? "실 API (내 몰)" : "미연결 → 목업 폴백");

  const stats = await syncSupplier("cafe24-mall", { pages: 1 });
  console.log("\n[sync 결과]", stats);

  const s = await getState();
  const supplier = s.suppliers.find((x) => x.code === "cafe24-mall");
  const rows = s.supplierProducts.filter((p) => p.supplierId === supplier?.id);
  console.log(`\n[supplier_products] cafe24-mall(id=${supplier?.id}) 상품 ${rows.length}건:`);
  for (const r of rows) {
    console.log(`  - ${r.externalId} | ${r.rawTitle} | ${r.priceOriginal}${r.currency} | ${r.syncStatus}`);
  }
  console.log("\n검증 완료. (Cafe24 키를 .env에 넣으면 위 목업이 실제 몰 상품으로 대체됨)");
}

main().catch((e) => {
  console.error("검증 실패:", e);
  process.exit(1);
});
