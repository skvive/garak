import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Cafe24 운영자 권한확인 URI (앱 → 쇼핑몰).
 * 개발자센터 [개발정보관리 > API 정보 > 운영자 권한확인 URI]에 이 URL을 등록하면,
 * 앱 설치 시 MENU_LIST / FUNCTION_LIST가 쇼핑몰로 전달되어
 * 대표 운영자가 부운영자·공급사 운영자에게 LEXI Studio 메뉴별 세부 권한을 부여할 수 있다.
 * 구조는 StudioShell 네비게이션과 1:1로 맞춘다.
 * 문서 형식: JSON(UTF-8), MENU_LIST/FUNCTION_LIST — code + 선택적 sub.
 */
const OPERATOR_PERMISSIONS = {
  MENU_LIST: {
    "LEXI Studio": {
      code: "lexi_studio",
      sub: {
        "개요": { code: "studio_overview" },
        "디자인": {
          code: "studio_design",
          sub: {
            "테마": { code: "design_themes" },
            "홈 섹션": { code: "design_home" },
          },
        },
        "크리에이터": {
          code: "studio_creator",
          sub: {
            "미디어": { code: "creator_library" },
            "생성 작업": { code: "creator_jobs" },
            "PDP 문서": { code: "creator_pdp" },
            "승인 큐": { code: "creator_review" },
            "게시·롤백": { code: "creator_publish" },
          },
        },
        "Cafe24 연결": { code: "studio_cafe24" },
        "결정 대기열": { code: "studio_decisions" },
      },
    },
  },
  FUNCTION_LIST: {
    "디자인 게시": {
      code: "design_publish",
      sub: {
        "테마 Publish": { code: "theme_publish" },
        "홈 섹션 Publish": { code: "section_publish" },
      },
    },
    "콘텐츠 생성": {
      code: "content_generate",
      sub: {
        "생성 작업 실행": { code: "job_run" },
        "미디어 등록": { code: "media_create" },
      },
    },
    "콘텐츠 검수": {
      code: "content_review",
      sub: {
        "승인": { code: "document_approve" },
        "반려": { code: "document_reject" },
      },
    },
    "Cafe24 게시": {
      code: "cafe24_publish",
      sub: {
        "상품 상세 게시": { code: "cafe24_publish_product" },
        "버전 롤백": { code: "cafe24_rollback" },
      },
    },
    "Cafe24 동기화": {
      code: "cafe24_sync",
      sub: {
        "상품 Projection Sync": { code: "cafe24_sync_products" },
      },
    },
  },
} as const;

/** GET /api/cafe24/operator-permissions — Cafe24가 앱 설치 시 호출. JSON(UTF-8) 반환 */
export function GET() {
  return new NextResponse(JSON.stringify(OPERATOR_PERMISSIONS), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
