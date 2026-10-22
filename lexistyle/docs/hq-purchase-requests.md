# HQ 구매요청 (판매채널 주문 허브)

각 **판매 플랫폼 상품페이지에서 들어온 실제 주문**을 채널별로 보고, 같은 화면에서 **검수 → 소싱발주 → 정산**한다.

원장: 판매 주문은 쿠팡·Amazon AU·Shopify·Cafe24·LEXI. 공급 발주·마진 정산은 HQ.

## 파이프라인

| 단계 | PR status | 화면 액션 |
|------|-----------|-----------|
| 검수대기 | received / matched | 검수 / 거절. 미매칭이면 채널 리스팅 연결 |
| 발주대기 | vetted | 소싱발주 (공급처 placeOrder) |
| 배송중 | sourcing | 발주확인 → 출고 → 배송완료 |
| 정산대기 | fulfilled | 배송완료 시 정산 원장 자동 생성 → 확정 |
| 완료 | closed | `/hq/settlements?channel=` |
| 예외 | rejected / refund_delegated | 재처리 없음 |

## 화면 계약 (`/hq/purchase-requests`)

- 채널 칩: 상태의 `channels` (하드코드 금지). 칩별 건수.
- KPI: 검수대기 / 발주대기 / 배송중 / 정산대기 / 완료.
- 행 = 채널 주문 1건. 판매 상품명·썸네일·주문번호·구매자·결제액.
- 주문번호 클릭 → 상품페이지 팝업. 구매자 이름 클릭 → 연락처·옵션·수량·가격·결제방법 팝업.
- 목록/그리드. 기본 목록.
- 일괄: 검수, 소싱발주.
- 소싱발주 페이지는 발주 이후 배송 전이. 정산 페이지는 채널 필터.

## API

- `GET /api/hq/purchase-requests` — 조인된 인박스 행 + 채널 KPI.
- `POST /api/hq/purchase-requests/pull-all` — 채널별 실주문(또는 목업) pull.
- `PATCH /api/hq/purchase-requests/:id` — vet / reject / match.
- `POST /api/hq/sourcing-orders` `{ purchaseRequestId, autoVet }` — 검수 후 발주.
- `PATCH /api/hq/sourcing-orders/:id` `{ to }` — 배송 전이. `delivered` → 정산 생성.
- `PATCH /api/hq/settlements/:id` `{ action: confirm }`.
