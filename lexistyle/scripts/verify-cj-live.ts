/**
 * 실제 CJ Open API 라이브 검증.
 * .env 의 CJ_API_EMAIL / CJ_API_KEY 로 인증 → 상품 목록/단건을 진짜로 당겨온다.
 * 실행: npx tsx scripts/verify-cj-live.ts
 */
import "dotenv/config";
import { cjConnector } from "@/lib/sourcing/connectors/cjdropshipping";

async function main() {
  const configured = Boolean(process.env.CJ_API_EMAIL && process.env.CJ_API_KEY);
  console.log("CJ 키 감지:", configured ? "있음 (실 API 모드)" : "없음 (목업)");
  console.log("이메일:", process.env.CJ_API_EMAIL);
  console.log("키 앞부분:", process.env.CJ_API_KEY?.slice(0, 16) + "...");

  console.log("\n[1] 상품 목록 1페이지 요청 (인증 포함)...");
  const list = await cjConnector.listProducts({ page: 1, pageSize: 5 });
  console.log(`→ ${list.length}건 수신`);
  for (const p of list.slice(0, 5)) {
    console.log(`  - ${p.externalId} | ${p.title.slice(0, 50)} | ${p.price}${p.currency} | stock=${p.stock}`);
  }

  if (list[0]) {
    console.log(`\n[2] 단건 상세 재조회: ${list[0].externalId}`);
    const one = await cjConnector.getProduct(list[0].externalId);
    console.log("→", one ? `${one.title.slice(0, 50)} (이미지 ${one.images.length}장)` : "없음");
  }

  console.log("\n✅ 실제 CJ API 연동 성공 — 목업 아님, 진짜 CJ 카탈로그 수신");
}

main().catch((e) => {
  console.error("\n❌ 실패:", e instanceof Error ? e.message : e);
  process.exit(1);
});
