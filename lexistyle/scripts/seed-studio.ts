import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const decisions = [
  ["D-001", "high", "Cafe24 실운영 mall ID와 shop_no는?", "환경변수 값 사용, 미설정 시 preview", "cafe24"],
  ["D-002", "high", "Cafe24 스킨 직접 수정 권한을 앱 scope에 포함할 것인가?", "상품 상세 게시만 활성화", "publish"],
  ["D-003", "high", "Vercel Blob 또는 별도 CDN 중 미디어 저장소는?", "외부 URL 등록 모드", "media"],
  ["D-004", "high", "기존 Toss/Stripe/Danal 정산 완료 시점과 제거일은?", "legacy 보존, Studio에서 숨김", "commerce"],
  ["D-005", "medium", "AI 이미지 생성 공급자는?", "provider-neutral job 계약", "generation"],
  ["D-006", "medium", "Remotion 렌더 워커 배포 위치는?", "services/remotion 계약 유지", "video"],
  ["D-007", "medium", "콘텐츠 최종 승인 권한자는?", "ADMIN_EMAILS 관리자", "review"],
  ["D-008", "medium", "다국어 PDP 우선 언어는?", "ko 원본 + en 준비", "localization"],
  ["D-009", "low", "Next 스토어 preview 종료일은?", "Cafe24 구매 회귀검증 완료 후", "storefront"],
  ["D-010", "low", "성과 데이터 원천은?", "수동 성과 기록 API", "analytics"],
] as const;

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const sql = neon(process.env.DATABASE_URL);
  for (const [code, priority, question, defaultDecision, impact] of decisions) {
    await sql`
      INSERT INTO decision_queue (code, priority, question, default_decision, impact)
      VALUES (${code}, ${priority}, ${question}, ${defaultDecision}, ${impact})
      ON CONFLICT (code) DO UPDATE
      SET priority = excluded.priority,
          question = excluded.question,
          default_decision = excluded.default_decision,
          impact = excluded.impact`;
  }
  console.log(`Studio decision queue seeded: ${decisions.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
