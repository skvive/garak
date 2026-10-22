# HQ ← CJ 주문·정산 패리티 기획

기준: [CJ My Purchase Wholesale](https://cjdropshipping.com/mine/purchase/purchaseList?orderType=3) 좌측 주문 내비 + [Shopping API 2.0](https://developers.cjdropshipping.cn/en/api/api2/api/shopping.html).  
원칙: **CJ 화면을 복제하지 않는다.** 판매 원장과 공급 원장을 나누고, 공급 쪽만 CJ 상태·금액·주문번호를 SSOT로 쓴다.

## 왜 통일해야 하는가

LEXI는 고객에게 Shopify/쿠팡 등으로 팔고, 이행은 CJ에 발주한다. 상태가 어긋나면 이중발주, 미결제 출고 대기, 송장 미연동, 마진 오계산이 난다.

지금 갭:

| 층 | 지금 HQ | CJ (화면/API) |
|----|---------|----------------|
| 판매 주문 | 구매요청 (`received`…`closed`) | Store Orders (스토어 동기화) |
| 공급 발주 | 소싱발주 `requested/confirmed/shipped/delivered` | Wholesale/Sample/Inventory + `UNPAID`…`DELIVERED` |
| 돈 | 정산 = 매출−원가−배송−수수료 | 월렛 잔액 결제, 차액(makeup), 분쟁 환불 |

`placeOrder`는 `createOrderV2`만 호출한다. **주문 목록 동기화·잔액결제·차액청구는 없다.**

## 원장 2층 (섞지 말 것)

```
판매채널 주문  →  구매요청  →  소싱발주(CJ orderId)  →  배송완료  →  LEXI 정산(마진)
                      ↑                    ↑
                 pull Shopify/Coupang    listOrder / getTrackInfo / payBalance
```

- **구매요청** = 고객이 낸 돈. 채널 주문번호가 SSOT.
- **소싱발주** = 우리가 CJ에 낸 돈. `supplierOrderRef` = CJ `orderId`/`orderCode`가 SSOT.
- **LEXI 정산** = 마진 원장. CJ 월렛과 합치지 않는다.
- **CJ 월렛** = 공급 대금. HQ는 잔액·미결제만 보여주고, 실제 출금은 CJ API 또는 CJ 결제 URL.

`/hq/orders`는 Cafe24/몰 원장. CJ 이행 보드가 아니다.

## CJ 좌측 내비 → HQ에 둘 위치

화면 URL `purchaseList?orderType=3` = 도매 발주 목록. 드랍십 목록은 `dropshipping/orderList` 계열.

| CJ 내비 | HQ에 둘 곳 | 이식 |
|---------|------------|------|
| Store Orders | 구매요청 채널 칩 (Shopify 등) | 이미 있음. CJ 메뉴를 복제하지 않음 |
| Sample Orders | 소싱발주 `orderKind=sample` | P1. 검수용 1개 발주 |
| Wholesale Orders | 소싱발주 기본 보드 | **P0.** 운영 본체 |
| Inventory Orders | 보류 (프라이빗 재고 쓸 때만) | P2. API `orderType=9` 결제와 웹 `orderType=2` 필터가 다름 |
| Order Fulfillment | 소싱발주 탭 + 송장/라벨 | P1. 트래킹·라벨 |
| Undelivered | 소싱발주 필터 `undelivered` | P1. 고객 미수령 ≠ CJ `CANCELLED` |
| Disputes | 소싱발주 `as_delegated` + 분쟁 ID | **P0.** 이미 `asCenterUrl`만 있음 |
| Wallet | 정산 페이지 상단 위젯 | **P0.** 잔액·미결제 건수 (출금 UI 복제 금지) |

## 상태 탭 — UI 라벨은 CJ, 저장은 API 코드

[CJ 드랍십 6상태](https://cjdropshipping.com/article-details/170)와 Wholesale 탭은 같은 생애주기. **DB에는 API enum을 저장**하고, 화면만 한국어 탭으로 보여 준다.

| HQ 탭 (CJ와 동일) | API `status` | 지금 소싱발주 | 비고 |
|-------------------|--------------|---------------|------|
| 전체 | — | 목록 | |
| 결제대기 | `UNPAID` | 없음 | 재고 락 ~24h. 미결제면 출고 없음 |
| 대기(Pending) | `PENDING` (UNSHIPPED 하위) | `confirmed`에 뭉개짐 | 결제됨, 송장 전 |
| 출고대기 | `PROCESSING` / `UNSHIPPED` | 없음 | 화면 Awaiting Dispatch |
| 출고됨 | `SHIPPED` | `shipped` | 송장 필수 |
| 완료 | `DELIVERED` | `delivered` | 여기부터 LEXI 정산 생성 |
| 마감 | `CLOSED`(문서) | 없음 | 배송 후 ~7일, 분쟁 창 닫힘 |
| 취소 | `CANCELLED` | `cancelled` | |

생성 직후 `CREATED`/`IN_CART`는 탭에 넣지 않고 ‘미확정’ 예외로만 둔다.

전이: **CJ `listOrder`가 권위.** HQ 버튼은 CJ 호출 성공 후에만 바꾼다. 로컬만 `delivered`로 올리면 정산 원가가 거짓이 된다.

## 반드시 넣을 기능 (화면에서 본 것)

### P0 — 안 넣으면 운영 에러

1. **CJ 주문 동기화**  
   `GET /shopping/order/list` → `supplierOrderRef` 매칭. 필드: `orderId`, `orderCode`, CJ status, 금액, 물류, `shopId`.  
   지금: create만 하고 list 없음.

2. **결제대기 큐**  
   `UNPAID` 건수 + 결제 딥링크 또는 `payBalanceV2`(payType=2). 미결제면 소싱발주를 `shipped`로 올리지 않음.

3. **상태 탭 + 건수**  
   Wholesale과 같은 탭. 건수는 CJ list 집계.

4. **검색**  
   주문번호 / 거래번호 / SKU / 상품명. CJ `orderIds` + HQ `externalOrderRef`.

5. **원가 컬럼**  
   공급가·배송비 = 정산 `costUsd`/`shippingUsd`의 입력. 판매가와 한 칸에 섞지 않음.

6. **월렛 위젯**  
   사용가능 잔액, 미결제 발주 합, 차액(makeup) 미수. 법인 정산(테라브릿지/파트너스)과 별 카드.

7. **차액(postage difference)**  
   makeup list. `orderType` 예: 1 드랍십, 3 프라이빗, 5 분쟁환불. 미결제 차액이 있으면 마진 확정 잠금.

8. **분쟁**  
   `disputeId`, `openDispute`. HQ는 티켓 목록 + CJ 분쟁 URL. 환불은 `settlements.refunded`와 CJ 환불을 같은 `supplierOrderRef`로 묶음.

### P1 — 같은 주 운영에 필요

9. **물류 필터 / 물류조회** — 화면 체크박스. `getTrackInfo` 이미 있음 → 목록에 상태 표시.
10. **기간 필터** — API 결제일 범위 최대 90일.
11. **샘플 vs 도매** — 샘플은 정산 마진 0, 비용만.
12. **미배송** — 채널은 delivered인데 고객 미수령. 분쟁 전 단계.
13. **출고 라벨** — Processing 이후 라벨 URL (CJ 문서: 라벨은 분쟁 증빙).

### P2 — 쓰지 않으면 숨김

14. 프라이빗 재고. 결제 API `orderType=9` ≠ 웹 목록 `orderType=2`.
15. 스토어 주문 메뉴 복제. 구매요청이 담당.

## 정산 — 두 장부를 같은 화면에서 대조

`/hq/settlements`를 두 블록으로:

| 블록 | 내용 | 소스 |
|------|------|------|
| A. CJ 대금 | 잔액, 결제대기, 차액, 분쟁환불 | CJ pay/makeup/dispute |
| B. LEXI 마진 | 채널 매출 − (A에서 확정된 원가·배송) − 채널/PG 수수료 | 기존 `settlements` |

규칙:

- B의 `costUsd`/`shippingUsd`는 A의 결제·차액 반영 후 숫자.
- `delivered`여도 A에 UNPAID/makeup이 있으면 B `confirm` 금지.
- `CLOSED` 이후 분쟁 불가(CJ). HQ도 그때 `as_delegated` 신규 금지.
- 채널 수수료·법인 라우팅은 LEXI만. CJ에 없음.

## 소싱발주 화면 IA (권장)

경로 유지: `/hq/sourcing-orders`.

```
[샘플] [도매] [재고]     ← CJ 주문 종류 (기본 도매)
[전체] [결제대기] [대기] [출고대기] [출고됨] [완료] [마감] [취소]
검색: 주문번호 / SKU / 상품명     물류 ▾     기간
행: 공급처 | CJ주문번호 | 채널주문 | SKU | 원가 | CJ상태 | 송장 | 액션
하단: 월렛 잔액 · 미결제 n · 차액 n · 분쟁 n
```

액션: CJ에서 열기, 잔액결제(또는 결제 URL), 송장동기, 분쟁열기. 상태 수동 패치는 관리자+감사 로그만.

## API 추가 (구현 시)

커넥터 `cjdropshipping.ts`에만 모은다. 새 공급처 추상화 금지.

| 메서드 | CJ | HQ |
|--------|-----|-----|
| `listOrders({ status, ids })` | `GET /shopping/order/list` | 소싱발주 동기화 |
| `getOrder(id)` | 단건 | 행 상세 |
| `payBalance(shipmentOrderId, payId?, orderType?)` | `POST /shopping/pay/payBalanceV2` | 결제대기 |
| `listMakeup` | `/shopping/makeup/*` | 차액 배지 |
| 기존 `getTracking` | `/logistic/getTrackInfo` | 출고됨 탭 |

`createOrderV2`의 `payType`: 1=결제페이지, 2=잔액, 3=생성만. 지금은 미지정 → 대부분 `UNPAID`로 남을 수 있다. 발주 직후 결제 전략을 명시할 것.

## 하지 말 것

- CJ 좌측 메뉴를 HQ 사이드바에 1:1 복제 (Store Orders ≠ 구매요청 이름만 다름).
- CJ 상태 문자열을 버리고 HQ 상태만 저장.
- 월렛 잔액을 LEXI 마진에 더하기.
- 카탈로그 574건을 주문 보드에 넣기.

## 구현 순서

1. `listOrders` + `cjStatus` 컬럼 + 탭 건수. 쓰기 없이 읽기 동기화.
2. `UNPAID` 큐 + 결제 링크/잔액결제. 미결제면 출고·정산 잠금.
3. 월렛·차액 위젯, 정산 확정 가드.
4. 분쟁 ID 목록.
5. 샘플/미배송/라벨.

## 구현 상태 (2026-08-19)

Phase A: `listCjOrders` / `getCjOrder` / `payCjBalance` / `getBalance` / makeup list. `POST /api/hq/sourcing-orders/sync`. `cjStatus` 탭.
Phase B: UNPAID 잔액결제·CJ 결제 링크. 미결제 출고/마진 확정 잠금. `payType=3` 발주.
Phase C: `/api/hq/cj/money` 월렛 위젯. 차액 `makeupOpen`. 정산 확정 가드.
Phase D: 분쟁 목록 + CJ disputes URL. `CLOSED` 분쟁 금지.
Phase E: 도매/샘플/재고 종류, 검색, 기간, 물류, 미배송 플래그.

관련: `docs/hq-purchase-requests.md`, `docs/lexi-dropship-integration-spec.md`.
