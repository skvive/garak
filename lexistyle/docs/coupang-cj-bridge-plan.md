# 쿠팡 ↔ CJ 이행 브리지

기준일: 2026-10-02. 코드와 `docs/lexi-coupang-wing-hq-map.md`, `docs/hq-cj-order-parity.md`를 대조했다.

판매는 쿠팡, 출고는 CJ다. 두 원장은 이미 나뉘어 있다. 끊긴 곳은 주문 한 건이 쿠팡에서 CJ로 갔다가 송장으로 돌아오는 구간이다.

## 발견한 단절

| 구간 | 증상 | 처리 |
|------|------|------|
| 주문 수집 | `ordersheets`가 당일 UTC만 조회. 하루를 놓치면 ACCEPT가 남아도 다음 날 수집되지 않음. 다음 페이지(`nextToken`)도 버림 | 반영. KST 최근 7일을 한 범위 요청(최대 31일), nextToken, 페이지·상태 사이 간격(일 단위 연속 호출은 429) |
| 복수 옵션 | `orderItems[0]`만 구매요청이 됨 | 반영. 2개 이상이면 `주문번호:vendorItemId`로 분리 |
| CJ 발주 SKU | `createOrderV2`의 `vid`에 상품 pid를 넣음. CJ는 variant id만 받음 | 반영. 옵션명 일치 vid, 없으면 첫 variant |
| 사이즈 옵션 | 쿠팡 옵션명은 한글(`블랙 2XL`), CJ는 영문(`Black 2XL`). 이름이 안 맞으면 첫 variant(다른 사이즈)로 발주됐고, 진열큐 옵션이 1개면 쿠팡 SKU를 무시 | 반영. 쿠팡 아이템 `externalVendorSku`=CJ vid를 최우선(`pickSupplyOption`), 진열큐에 없으면 CJ 전체 variant에서 찾음. 다옵션인데 못 찾으면 발주 실패(오발주 방지). 트렌치코트 16400332654: 색상 2 × 사이즈 5 = 10개 아이템 → CJ vid 10/10 일치 |
| 주소 | 쿠팡 수신지에 city가 없으면 CJ `shippingCity`가 빈 값 | 반영. city 없으면 주소 첫 줄을 사용 |
| 송장 회신 | 수동 `shipped`만 `ackOrder`. CJ sync·트래킹 크론은 송장만 저장하고 쿠팡에 안 올림 | 반영. sync·poll 직후 `pushChannelInvoices` |
| 택배사 코드 | CJ `CJPacket`을 쿠팡 `deliveryCompanyCode`로 전송. 쿠팡은 HANJIN·EPOST·DHL 같은 코드만 받음 | 반영. 공식 코드만 통과, 아니면 주문서 코드 → `COUPANG_DELIVERY_COMPANY_CODE` |
| 다품목 한 박스 | 아이템마다 CJ 발주가 생기고 송장은 같은 `shipmentBoxId`를 덮어씀 | 반영. 박스 내 전 품목 송장이 모이면 1회 업로드, 송장이 다르면 분할배송으로 표시하고 Wing 처리 |
| CJ 주문번호 | `createOrderV2`가 준 SD…(shipmentOrderId)를 주문번호로 저장. CJ 목록의 `orderId`와 달라 동기화·상태·송장이 영영 매칭되지 않음 | 반영. orderId·SD·orderNum·remark `LEXI PR#id` 순 매칭, `supplierOrderRef`=orderId, `cjShipmentOrderId`=SD |
| CJ 확정 | `payType=3` 주문은 `CREATED`(스토어주문 수입품 탭). CJ 화면 "주문 선택에 추가"가 오류를 내면 주문이 `IN_CART`로 넘어가 목록에서 사라진 것처럼 보임 | 반영. 발주 직후 `addCart`→`addCartConfirm`(SD 키)로 자동 확정 → `UNPAID`(결제대기 탭), 반환 `shipmentsId`(CJ…) 저장. 실패 시 CREATED 유지 + 사유 표시, HQ "CJ 주문확정" 버튼으로 재시도. 결제는 `saveGenerateParentOrder`→`payBalanceV2`(CJ… 키) |
| CJ 호출 한도 | 주문 API 2회/초. 상태별 연속 조회가 `1600200`으로 빈 목록 | 반영. 상태 조회 사이 600ms |
| CJ 매장주문 동기화 | CJ "매장 주문 동기화"는 CJ 인증 스토어(현재 Shopify 1개)만 가져옴. 쿠팡은 CJ 미지원 플랫폼, 쇼피는 미연결. 채널 주문 수집은 HQ 버튼 수동 실행뿐 | 반영. `/api/cron/order-sync`(KST 09:00·17:00) — 실계정 연결된 쿠팡·쇼피 주문 수집 → 자동 발주(API 스토어, 주문시각·상품명·SKU·옵션 표시) → CJ 동기화·송장 회신. HQ 일괄 pull도 CJ 동기화까지 실행. 쇼피를 CJ에서 직접 인증하면 같은 주문이 이중 발주되므로 인증하지 않는다 |
| 정산 대사 | Wing revenue-history와 LEXI 마진은 합치지 않음 | 유지. 별도 장부 |
| 로켓그로스 | CJ 직배와 재고 원장이 다름 | 비범위 |

## 목표 흐름

```
쿠팡 ACCEPT·INSTRUCT (기본 31일, `COUPANG_ORDER_LOOKBACK_DAYS`로 1~31일 조정)
  → 구매요청 (옵션별)
  → 검수
  → CJ createOrderV2 (vid) → CREATED
  → addCart → addCartConfirm (SD…) → UNPAID, shipmentsId(CJ…)
  → 결제 버튼: saveGenerateParentOrder → payBalanceV2(CJ…, payId)
  → CJ sync / 트래킹
  → 쿠팡 updateInvoices (공식 택배사 코드, 박스 단위)
  → 배송완료 시 LEXI 마진 원장
```

CJ 월렛 잔액은 마진에 더하지 않는다. 미결제(`CREATED`·`UNPAID`)는 출고·마진 확정을 막는다. 이 잠금은 기존 그대로다.

## 코드

- `src/lib/channels/coupang/client.ts` — 31일 범위 발주서, nextToken, 429 간격
- `src/lib/channels/coupang/carrier-map.ts` — 택배사 코드
- `src/lib/channels/adapters/coupang.ts` — 옵션 분리, 송장 코드
- `src/lib/hq/channel-invoice.ts` — 박스 단위 채널 송장 회신
- `src/lib/hq/cj-order.ts` — CJ 주문 ↔ 발주 매칭, ID 정규화
- `src/lib/hq/cj-order-sync.ts` — CJ 동기화, 확정·결제
- `src/lib/hq/services.ts` — 발주 시 variant·CJ 상태, 트래킹 후 회신
- `src/lib/sourcing/connectors/cjdropshipping.ts` — vid·도시, createOrderV2 응답 분리, confirmOrder
- `scripts/verify-coupang-cj-order.ts` — 읽기 전용 점검 (쿠팡 발주서 · HQ 스냅샷 · CJ 주문목록)

같은 송장번호는 `orderPayload.channelInvoiceTracking`으로 한 번만 올린다.

## 자동 주문 전송 운영 조건

`/ko/api/cron/order-sync`가 매일 한국시간 09:00·17:00(UTC 00:00·08:00)에 아래 순서로 실행된다.

1. 쿠팡 `ACCEPT`·`INSTRUCT` 주문을 조회한다.
2. `sellerProductId`로 HQ 채널 리스팅을 찾고, `externalVendorSku`를 CJ `vid`로 검증한다.
3. CJ `createOrderV2(payType=3)`로 미결제 주문을 만들고 장바구니 확정까지 진행한다.
4. 같은 쿠팡 신건을 안정적인 별도 주문번호로 CJ product order flow(`orderFlow=1`, `payType=3`)에 샘플 미러로 한 번 더 생성한다. 이 주문은 장바구니 확정·결제·송장 회신에서 제외한다. OpenAPI에는 Sample Orders 전용 타입이 없어 MyCJ 탭 분류는 보장하지 않는다.
5. CJ 원발주 생성 성공 뒤 쿠팡 발주확인을 올린다. 송장은 원발주 트래킹이 생긴 뒤 별도로 회신한다.
6. CJ 호출이 일시 실패한 `matched`·`vetted` 주문과 샘플 미러는 다음 크론에서 다시 시도한다.

실주문 자동화에는 `DATABASE_URL`, `CJ_API_EMAIL`, `CJ_API_KEY`,
`COUPANG_VENDOR_ID`, `COUPANG_ACCESS_KEY`, `COUPANG_SECRET_KEY`가 반드시 필요하다.
영속 DB나 CJ 인증이 없으면 크론은 503으로 중단해 목업 발주와 서버리스 중복 발주를 방지한다.
`AUTO_SOURCE_ORDERS=0`일 때만 자동 CJ 주문 생성을 끈다.
`CJ_COUPANG_SAMPLE_MIRROR=0`이면 두 번째 미결제 샘플 미러만 긴급 중단할 수 있다.
`CJ_SAMPLE_MIRROR_START_AT`은 미설정 시 2026-10-21 이후 생성된 쿠팡 신건만 대상으로 한다.

CJ `orderNumber`는 쿠팡 주문 품목별로 안정적으로 생성된다. 같은 주문을 재수집하면 기존 CJ 주문을
회수하며 새 주문을 만들지 않는다. 특정 누락 주문은 관리자 인증 후 다음처럼 단건 복구할 수 있다.

```http
POST /ko/api/hq/channels/coupang/pull-orders
Content-Type: application/json

{"orderId":"3103601680449"}
```

관리자는 `/ko/account/orders`에서 `주문정보조회`로 쿠팡 주문을 저장하고,
`CJ 보내기`로 상품·옵션 매칭이 끝났으며 아직 CJ 발주가 없는 신건만 수동 전송할 수 있다.
두 버튼은 관리자 계정에만 표시된다.

## 실주문 점검 (2026-10-02)

쿠팡 주문 1건(구매요청 PR#1249)은 운영·로컬 대시보드 구매요청 목록과 소싱발주 SO#1254에 들어와 있다. CJ 주문목록에도 remark `LEXI PR#1249`로 1건(CREATED, 상품 21.70 + 배송 5.71 USD, CJPacket Eub)이 있다.

단절은 주문번호였다. HQ는 SD 번호를 저장했고 CJ 목록은 다른 orderId를 쓴다. 그래서 동기화가 이 주문을 찾지 못했고 HQ 상태가 실제(CREATED)와 다른 UNPAID로 남았다. 수정 후 같은 데이터로 매칭을 돌리면 SO#1254가 CJ orderId로 연결된다. 배포 후 HQ의 CJ 동기화 한 번으로 기존 건도 고쳐진다.

쿠팡 옵션은 `FREE, FREE`로 보이고 CJ variant는 `Black 2XL`이다. 등록 시 옵션 속성이 기본값(FREE)으로 들어간 상품이다. 발주는 SKU에 묶인 vid로 나가므로 실물은 맞지만, 쿠팡 상품 페이지 옵션명은 Wing에서 고쳐야 한다.

## 다음에 할 일

1. SO#1254는 2026-10-02 API 확정으로 CJ `UNPAID`(결제대기 탭, shipmentsId `CJ26100256976763724620`). 배포 후 HQ CJ 동기화로 상태 반영, 결제는 CJ 결제대기 탭에서 진행(이 건은 HQ에 shipmentsId가 없어 HQ 잔액결제 불가).
2. CJ 송장이 나오면 쿠팡 송장 코드가 거부되지 않는지 확인한다. 거부되면 출고지에 연결된 코드만 env에 둔다.
3. 한 주문에 옵션이 둘이면 구매요청이 둘인지 확인한다.
4. 반품·취소는 Wing 예외로 남긴다. 자동 승인하지 않는다.
