# Coupang Wing — 판매처 Export · HQ 일괄운영 기획

> 상태: 기획 (2026-08-20, Wing 스크린샷 + Open API + HQ 코드 대조)  
> 목적: **wing.coupang.com에 매일 들어가지 않고** LEXI HQ에서 쿠팡 1호 판매처를 운영한다.  
> 관련: `docs/lexi-dropship-integration-spec.md` §9.2–9.5, `src/lib/channels/adapters/coupang.ts`, `docs/lexi-linkrcode-pdp-syndication.md`

## 목적 (정본)

```
CJ 소싱 → catalog → Import → PDP 공장 → export_jobs
                                              │
                         lexi / coupang / cafe24 / shopify / amazon_au
                                              ▲
                                    Coupang = 국내 1호 Export
```

| 역할 | 무엇인가 | 무엇인가가 아닌가 |
|------|----------|-------------------|
| Coupang Wing | **국내 판매처**. 구매대행(해외소싱→국내판매) 채널 | 카탈로그 소싱, CJ 대체, Wing UI 전체 복제 |
| HQ | 드롭십 **운영 원장**. 등록·가격·재고·주문·송장·정산·CS 1차 응대 | 쿠팡 광고·로켓배송 입점·브랜드관 운영 |
| Wing 콘솔 | API 키·IP 허용·정책 게이트·**예외 처리** | 일상 등록/주문/송장의 정본 |

성공 기준: 운영자가 **상품 등록·조회/수정·주문/송장·정산 확인·문의 1차 처리**를 Wing 없이 `/hq/pipeline/export`, `/hq/products`, `/hq/purchase-requests`, `/hq/settlements`에서 끝낸다.

---

## Wing 좌측 메뉴 ↔ HQ 매핑 (스크린샷 2026-08-20 기준)

스크린샷에서 확인된 1차 메뉴: **상품관리 · 브랜드관리 · 판매성장 · 가격관리 · 로켓그로스 · 주문/배송 · 정산 · 셀러월렛 빠른정산 · 문의/리뷰**

### 1. 상품관리

| Wing 하위 메뉴 | Wing에서 하는 일 | HQ 이식 | Open API | 우선순위 |
|----------------|------------------|---------|----------|----------|
| **상품 등록** | 단건 등록 폼 | **Export `coupang` 1건** — PDP→`seller-products` POST | Product API create | **P0 ✅** |
| **상품 일괄등록** | 엑셀 대량 | **export_jobs N건 큐** — 공장 배치 | 동일 POST 반복 | **P0 ✅** |
| **통합솔루션으로 상품등록** | ERP/솔루션 연동 | **LEXI가 이 역할** (ChannelAdapter) | HMAC + relay | **P0 ✅** |
| **상품 조회/수정** | 승인/판매중/품절·가격·옵션 수정 | **`/hq/products?channel=coupang`** — 상태·가격·품절 일괄 | GET/PUT seller-products, 가격·재고 PATCH | **P0 🔶** |
| **카탈로그 매칭관리** | 쿠팡 카탈로그 매칭·옵션 정합 | Export 전 **체크리스트** + `categoryOverride` jsonb | `categorization/predict`, category-related-metas | **P0 🔶** |
| **로켓그로스 배지관리** | RG 입점 SKU 배지 | **비범위** (아래 로켓그로스 참고) | 별도 RG API | — |
| **상품 알림** | 품절·정책 위반 알림 | HQ **알림 큐** — export 실패·검수 blocked·재고 0 | 상품 상태 폴링 | **P2** |

**현재 코드:** `coupang.ts` `publish` + 카테고리 predict/고시 자동 ✅. 상품 조회/수정·재고 투영 ❌.

**HQ 화면:** Amazon AU와 동일 패턴 — Wing 복제 금지, `/hq/products` 채널 필터 + Export 재실행.

---

### 2. 브랜드 관리

| Wing | HQ | API | 우선순위 |
|------|-----|-----|----------|
| 브랜드 등록·승인·노출 | PDP `vendor: LEXI` 고정, Wing 미등록 브랜드명 전송 시 거부됨(실계정 검증) | 2026 Brand API (신규) | **P3** |

구매대행·무브랜드 소싱이면 **브랜드 필드 생략**이 기본. KC·브랜드관은 별도 사업.

---

### 3. 판매 성장

| Wing | HQ | 우선순위 |
|------|-----|----------|
| 광고·기획전·쿠폰·트래픽 | **비범위** — `docs/lexi-ai-marketing-feed-upgrade.md` Hook Lab이 카피만 공급 | — |

Wing 광고 UI 이식하지 않음. 필요 시 광고 타이틀만 마케팅 피드에서 생성.

---

### 4. 가격관리

| Wing | HQ | API | 우선순위 |
|------|-----|-----|----------|
| 경쟁가·최저가·자동 조정 | Export 시 **KRW 마진 계산** (`USD→KRW`, feeRate 10.8%) | salePrice PATCH | **P1** |
| 일괄 가격 변경 | `/hq/products` 선택 N건 → 가격 패치 잡 | bulk price API | **P1** |

가격 정본: listing.sellPriceUsd → publish 시 `usdToKrw`. Wing 「가격관리」자동 경쟁 알고리즘은 이식 안 함.

---

### 5. 로켓그로스 (Rocket Growth)

| Wing | HQ | 판단 |
|------|-----|------|
| 쿠팡 풀필먼트 입고·재고·출고 | **현재 비범위** | LEXI는 **구매대행 + CJ 직배(MFN)** 모델 |
| RG 배지·입고 신청 | Wing 예외 콘솔만 | SKU를 RG로 돌리면 파이프라인 전제가 바뀜 |

**이유:** `channels.config.tradeModel: purchase-agency`, `overseasPurchased`, CJ 발주·트래킹 루프와 RG 재고 원장이 충돌.  
**후속:** RG 전환 SKU를 따로 두면 Phase RG0(입고 API) 검토 — **드롭십 1호 목표와 분리**.

---

### 6. 주문/배송

| Wing | HQ | API | 우선숩 |
|------|-----|-----|--------|
| 신규 주문함 | **`pullOrders` → purchase_requests** (쿠팡 AU 그룹) | GET ordersheets (일/분 단위) | **P0 ✅** |
| 발주 확인 | 검수 후 sourcing_order | PUT acknowledgement | **P0 🔶** |
| 송장 등록 | CJ 트래킹 → 채널 회신 | **POST updateInvoices** | **P0 ❌ 필수** |
| 배송중/배송완료 | `advanceSourcingOrder` 상태 | shipment status API | **P1** |
| 취소/출고중지 | Wing 수동 | cancel / release stop API | **P2** |
| 반품 접수·회수 | Wing 반품함 | Return API | **P2** |

**현재 코드:** `pullOrders` ✅, `ackOrder` ✅(경로 재검증 필요). **송장 upload(`updateInvoices`) 미구현** → Wing 안 들어가도 **배송 처리가 막히는 1순위 갭**.

**HQ 흐름 (목표):**

```
pullOrders → purchase_requests (channel=coupang)
  → 검수 → CJ placeOrder → shipped + trackingNo
  → adapter.ackOrder + updateInvoices  ← 여기 완성 필요
```

Amazon AU `ackOrder→confirmShipment`와 동일 슬롯 (`services.ts` shipped 전이).

---

### 7. 정산

| Wing | HQ | API | 우선순위 |
|------|-----|-----|----------|
| 정산 예정/확정/보류 | **`/hq/settlements?channel=coupang`** | Settlement Detail Query | **P1** |
| 기간별 엑셀 | HQ CSV 다운로드 (§9.5 이미 일부) | settlement list | **P1** |
| 수수료·유보금 | `settlements.status=pending` + feeRate 10.8% | 정산 상세 필드 매핑 | **P1** |

**현재:** `delivered → ensureSettlementForDelivered` 로 **내부 마진 원장**만 생성. Wing 정산 API와 **대사(reconciliation)** 없음.

**필요:** 주 1회 Wing 정산 pull → `settlements.externalRef`·`paidAt`·`withheldAmount` 동기화.

---

### 8. 셀러월렛 빠른정산

| Wing | HQ | 우선순위 |
|------|-----|----------|
| 조기 정산 신청·잔액 | **읽기 전용 위젯** — 「유보 vs 빠른정산 가능액」 | **P3** |
| 신청/약정 UI | Wing 유지 (금융 상품) | — |

현금흐름 대시보드에 **정산 API 잔액**만 보여주고, 빠른정산 **신청**은 Wing 링크(예외).

---

### 9. 문의/리뷰

| Wing | HQ | API | 우선순위 |
|------|-----|-----|----------|
| 상품 문의(Q&A) | **`/hq/purchase-requests` 옆 CS 탭** 또는 티켓 큐 | Customer Inquiry API | **P2** |
| 리뷰 | 요약 카운트만 HQ | Review query (제한적) | **P3** |
| 1차 템플릿 답변 | `firstLineSupport: true` — 배송/반품 FAQ 매크로 | reply API | **P2** |

법무: 구매대행도 **청약철회 7일·1차 응대**는 판매자 의무 (`channels.config.firstLineSupport`).

---

## HQ 화면 (신규 페이지 최소화)

Amazon AU 기획과 동일 — **전용 Wing 앱 만들지 않음**.

| HQ 경로 | Coupang 역할 |
|---------|--------------|
| `/hq/pipeline/export` | 마지막 송출 · coupang 체크 · 고시/카테고리 체크리스트 |
| `/hq/products?channel=coupang` | Export된 리스팅 · 가격 · 품절 · 재등록 |
| `/hq/purchase-requests?channel=coupang` | 주문 일괄 검수 · CJ 발주 |
| `/hq/sourcing-orders` | CJ 트래킹 · shipped → **쿠팡 송장** |
| `/hq/settlements?channel=coupang` | 정산 · 유보금 · Wing 대사 |
| `/hq/channels` | 연결 상태 · relay · probe ( **`CoupangPanel` 추가** ) |
| `/hq/pipeline/catalog` `/pdp` | Coupang 진입점 **아님** |

---

## 구현 상태 (2026-08-20)

| ID | 상태 | 코드 |
|----|------|------|
| C0 | ✅ | `constants.ts`, `health-state.ts`, `health.ts`, `CoupangPanel`, `GET /api/hq/channels/coupang?probe=1` |
| C2 | ✅ | listings GET · 품절/판매중지/재개 |
| C4 | ✅ | `sync-stock` CJ/카탈로그 qty → vendor-item |
| B1 | ✅ | `pullOrders` + shipmentBoxId raw |
| B2 | ✅ | shipped → ack + **updateInvoices** |
| B3 | ✅ | returnRequests 큐 (승인 자동화 없음) |
| S1 | ✅ | revenue-history 30일 + `/hq/settlements?channel=coupang` |
| Q1 | ✅ | onlineInquiries + FAQ 템플릿 답변 |
| C1/C3/S2 | 대기 | 카테고리 override dry-run · 월렛 |

ACCESS_KEY만으로 live 금지. 최근 ordersheets 실응답일 때만 live.

---

## 현재 구현 vs 갭 (코드 감사)

| 기능 | 상태 | 파일 |
|------|------|------|
| 상품 등록 POST | ✅ | `coupang.ts` publish |
| 카테고리 predict + 고시 | ✅ | predictCategory, buildNotices |
| export_jobs 연동 | ✅ | `jobs.ts`, `channel-projection.ts` |
| 주문 pull | ✅ | pullOrders + shipmentBoxId |
| 발주 확인 ack | ✅ | acknowledgeOrdersheet |
| **송장 updateInvoices** | ✅ | `updateCoupangInvoices` ← shipped ackOrder |
| 상품 GET/수정/품절 | ✅ | C2 `ops.ts` + CoupangPanel |
| 재고 CJ→쿠팡 | ✅ | C4 sync-stock |
| 정산 API sync | ✅ | S1 revenue-history (대사 표시, HQ 원장과 합산 금지) |
| 반품/취소 | ✅ | B3 목록 큐 |
| 문의/리뷰 | ✅ | Q1 문의 + FAQ 답변. 리뷰는 비범위 |
| `/hq/channels` CoupangPanel | ✅ | `CoupangPanel.tsx` |
| IP relay (Vercel) | ✅ | `coupang-relay.js` |
| health mock/ready/live | ✅ | 키만으로 live 금지 · probe 필수 |

---

## 페이즈 (Export·HQ 운영 기준)

완료 기준 = **Wing에서 해당 업무를 열지 않아도 HQ에서 끝남**. Wing은 키·정책·로켓그로스·빠른정산 신청만.

| ID | 산출 | HQ에서 끝나는 일 |
|----|------|------------------|
| **C0** | 목적·구매대행 계약·relay·health | `/hq/channels` coupang = Export, mock/ready/live |
| **C1** | SigV4 probe + 카테고리 체크리스트 | Export blocked/ready, predict 실패 시 수동 categoryOverride |
| **C2** | 상품 조회/수정 + 가격·품절 PATCH | `/hq/products?channel=coupang` |
| **C3** | VALIDATION dry-run 1건 (선택) | export_jobs `preview_ok` — 쿠팡은 POST 전 predict로 대체 가능 |
| **C4** | live POST 일괄 + 재고 투영 | export N건 + CJ stock → saleable qty |
| **B1** | Orders → purchase_requests | 쿠팡 그룹 필터 (channelId) |
| **B2** | CJ 트래킹 → **updateInvoices** | shipped 시 송장 — **최우선** |
| **B3** | 취소·반품 큐 | P2 — Wing 예외 감소 |
| **S1** | 정산 pull + settlements 대사 | `/hq/settlements` coupang |
| **S2** | 셀러월렛 잔액 read-only | P3 |
| **Q1** | 문의 티켓 + 템플릿 답변 | P2 |

C2·B2 전에 「Wing 상품 조회/수정」「주문/배송」을 매일 열게 되는 **운영 빚**이 남는다.

---

## Open API ↔ Wing 메뉴 요약

```
상품관리     → Product API (create/update/query/stock/price)
주문/배송     → Shipments & Orders (ordersheets, ack, updateInvoices, cancel)
정산         → Settlement API
문의/리뷰     → CS API (inquiry/reply)
로켓그로스    → 별도 RG — 드롭십 1호 비범위
판매성장/광고  → 비범위
셀러월렛      → 정산/지갑 API 일부 — read-only
```

인증: `COUPANG_VENDOR_ID` + Access/Secret, CEA HMAC-SHA256.  
인프라: Vercel 가변 IP → **`COUPANG_RELAY_URL`** (고정 IP 릴레이 필수 가능).

---

## 환경 변수 (정본)

```
COUPANG_VENDOR_ID=
COUPANG_ACCESS_KEY=
COUPANG_SECRET_KEY=
COUPANG_RETURN_CENTER_CODE=
COUPANG_RETURN_CHARGE_NAME=
COUPANG_RETURN_ZIP_CODE=
COUPANG_RETURN_ADDRESS=
COUPANG_RETURN_ADDRESS_DETAIL=
COUPANG_OUTBOUND_SHIPPING_PLACE_CODE=
COUPANG_DELIVERY_COMPANY_CODE=    # 출고지 연결 택배사 (예: HANJIN)
COUPANG_COMPANY_CONTACT_NUMBER=
COUPANG_VENDOR_USER_ID=
COUPANG_DELIVERY_CHARGE=24000
COUPANG_RETURN_SHIPPING_FEE=24000
# 단순변심 반품 공제액 = 해외배송 24,000 + 반품 24,000 = 48,000원
COUPANG_AGENT_DOCUMENT_URL=       # 해외구매대행 구비서류 URL (선택)
COUPANG_RELAY_URL=                # IP 허용목록 우회
COUPANG_RELAY_SECRET=
USD_KRW_RATE=                     # 또는 fx_rates 테이블
```

---

## 법무·운영 제약 (구현 시 강제)

1. **구매대행:** `overseasPurchased`, `pccNeeded`, 구비서류 URL — `AGENT_BUY` 거부 계정은 `SEQUENCIAL` + 해외발송 SLA(출고일 7일)로 운영 (실계정 2026-08 주석).
2. **1차 응대:** 반품·문의 소비자 응대는 HQ — `refund_delegated`는 공급처 AS 원가 회수용만.
3. **KC/식품/유아:** 큐레이션 단계 차단 — Wing 등록 전 `validatePdpForChannel('coupang')`.
4. **정산 유보:** 쿠팡 주/월 정산 → cashflow 리포트 pending 기간 반영.

---

## Wing vs HQ — 매일 안 열려면 이 순서

| 순위 | 갭 | 이유 |
|------|-----|------|
| 1 | **B2 송장 updateInvoices** | 주문은 들어와도 배송 처리 불가 |
| 2 | **C2 상품 조회/품절/가격** | 품절·가격 변경마다 Wing |
| 3 | **C0 CoupangPanel + health probe** | 연결 끊김 조기 발견 |
| 4 | **S1 정산 sync** | 마진·유보 확인 |
| 5 | **Q1 문의** | CS Wing 의존 |
| — | 로켓그로스·광고·빠른정산 신청 | Wing 예외 유지 |

---

## 다음 액션 (구현 착수 시)

1. `src/lib/channels/coupang/` 모듈 분리 (Amazon `amazon/` 패턴) — orders.ts, products.ts, settlements.ts, health-state.ts
2. `coupang.ts`에 `updateInvoices` + `services.ts` shipped 훅 (Amazon ackOrder와 병렬)
3. `CoupangPanel.tsx` + `GET/POST /api/hq/channels/coupang`
4. `/hq/products` coupang 필터 + listing sync job
5. Settlement pull cron → `SettlementDashboard` coupang 그룹

---

## 참고

- Wing 스크린샷: 상품관리 하위 7항목, 로켓그로스 공지 팝업 (회송 지연) — HQ에는 **공지 RSS/웹훅** P3
- Open API 포털: https://developers.coupangcorp.com/
- 기존 어댑터: `src/lib/channels/adapters/coupang.ts`
- Amazon AU 동형 기획: `docs/lexi-amazon-au-seller-central-map.md`
