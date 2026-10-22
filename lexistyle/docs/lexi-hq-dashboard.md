# LEXI HQ 대시보드 IA

> 관리자 전용 커맨드 센터. 고객 My LEXI(`/account`)와 면을 분리한다.

## 진입·권한

| 항목 | 값 |
|------|-----|
| URL | `/hq` |
| 가드 | `requireAdmin` / `ADMIN_EMAILS` (미설정 시 로그인 유저 허용·로컬 개발) |
| My LEXI | 관리자만 「LEXI HQ」 링크 |
| 미인증 | `/auth/sign-in?next=/hq` |
| 구경로 | `/admin/*` → `/hq/*` 리다이렉트 |

## 사이드바

| 섹션 | 경로 |
|------|------|
| 홈 | `/hq` |
| 카탈로그 인덱스 | `/hq/pipeline/catalog` |
| Import | `/hq/pipeline/import` |
| PDP | `/hq/pipeline/pdp` |
| Export | `/hq/pipeline/export` |
| 공급처 | `/hq/suppliers` |
| 내 재고 | `/hq/cj-inventory` |
| 소싱요청 | `/hq/cj-sourcing` |
| 컬렉션 | `/hq/collections` |
| 판매채널 | `/hq/channels` |
| 구매요청 | `/hq/purchase-requests` |
| 소싱발주 | `/hq/sourcing-orders` |
| 정산 | `/hq/settlements` |
| 상품 | `/hq/products` |
| 주문 | `/hq/orders` |
| 배너 | `/hq/banners` |
| 분산원장 | `/hq/ledger` |
| Studio | `/studio` (외부 링크) |
| 시스템 | `/hq/system` |

구매요청 허브 계약: `docs/hq-purchase-requests.md`. 정산은 `?channel=` 로 채널 진입.  
CJ 주문·월렛과 HQ 상태 통일: `docs/hq-cj-order-parity.md`.  
CJ 인벤토리·소싱 리스트(미발견 상품): `docs/hq-cj-inventory-sourcing.md`.
분산원장: `docs/hq-commerce-ledger.md`.
PDP 러버블형 컨셉→병렬공장: `docs/hq-lovable-pdp-factory.md`.
판매채널: `docs/hq-sales-channels.md`.
홈: `docs/hq-home.md`.

## 홈 KPI

오늘 손댈 일(검수·발주·PDP 리뷰·원장 경보·송출 실패·채널 이상) + 액션 큐 + 판매채널 + 파이프라인/주문 요약.  
데이터: `GET /api/hq/overview`. 구성: `docs/hq-home.md`.

## SSOT

lexistyle Commerce DB + `/api/hq/*`. loyadbeta DB 복제 금지.
