# Shopee SEA — 판매처 Export · HQ 일괄운영 기획

> 상태: 기획 + 구현 (2026-08-20). Seller Center 스크린샷 `seller.shopee.kr` (CNSC, shop `1922643383`, 광고 마켓 **싱가포르 / lexid.sg**) + Open Platform v2 + HQ 코드 대조.  
> 목적: **seller.shopee.kr에 매일 들어가지 않고** LEXI HQ에서 동남아 1호 판매처를 운영한다.  
> 관련: `docs/lexi-amazon-au-seller-central-map.md`, `docs/lexi-coupang-wing-hq-map.md`, `src/lib/channels/adapters/shopee.ts`

## 목적 (정본)

```
CJ 소싱 → catalog → Import → PDP 공장 → export_jobs
                                              │
              lexi / coupang / cafe24 / shopify / amazon_au / shopee
                                              ▲
                         Shopee = SEA Export (1호 SG)
```

| 역할 | 무엇인가 | 무엇인가가 아닌가 |
|------|----------|-------------------|
| Shopee | 동남아 **판매처**. Shopify·Amazon AU와 같은 ChannelAdapter | 카탈로그 소싱, CJ 대체, Seller Center UI 복제 |
| HQ | 드롭십 **운영 원장**. 상품 SKU·주문·송장·재고 투영 | 쇼피 광고·라이브·FBS 입고 |
| seller.shopee.kr | CNSC 로그인 허브. 앱 인가·정책·예외 | 일상 등록/주문/송장의 정본 |

성공 기준: **내 주문(배송처리) · 상품 SKU(목록/품절) · 새 제품 추가**를 Seller Center 없이 `/hq/pipeline/export`, `/hq/products`, `/hq/purchase-requests`에서 끝낸다.

---

## 포털 vs 샵 (스크린샷)

| 관측 | 의미 |
|------|------|
| URL `seller.shopee.kr/?cnsc_shop_id=1922643383` | 한국 CNSC 포털. 샵 ID는 env `SHOPEE_SHOP_ID` |
| 헤더 「파트너스크:메인 / 렉시드.kr」 | 크로스보더 셀러 계정 |
| 광고 위젯 「싱가포르 / lexid.sg」 | **운영 마켓 1호 = SG**. 통화 SGD |
| To-Do: 미지급·배송처리·처리된배송·취소대기·반품/환불 | HQ 구매요청 단계 카운터와 매핑 |
| 수취인 계좌 미설정 경고 | 정산/월렛은 Wing처럼 **예외 콘솔** (P3) |
| 광고 크레딧 소진 | **비범위** |

Open API 호스트는 포털이 아니라 `https://partner.shopeemobile.com` ([Shopee Open Platform](https://open.shopee.com/documents/v2/v2.product.add_item)).

---

## 사이드바 ↔ HQ (꼭 필요한 것만)

### 주문하다

| Seller Center | HQ | API | 우선 |
|---------------|-----|-----|------|
| **내 주문** | `pullOrders` → purchase_requests `channel=shopee` | `order/get_order_list` + `get_order_detail` | **P0** |
| To-Do 배송 처리 | 인박스 `inspect` / sourcing shipped | `READY_TO_SHIP` 필터 | **P0** |
| **대량 운송** | HQ 일괄 shipped + tracking | `logistics/ship_order` | **P0** |
| 반품/환불/취소 | CS 큐 | return/cancel API | P2 |
| 배송 설정 | env `SHOPEE_LOGISTIC_ID` + probe 시 활성 채널 | `logistics/get_channel_list` | **P0** |
| Logistics+ 해외 반송 | **비범위** (CJ 회수와 별도) | — | — |

### 제품

| Seller Center | HQ | API | 우선 |
|---------------|-----|-----|------|
| **새 제품 추가** | Export `shopee` 1건 | `media_space/upload_image` → `product/add_item` | **P0** |
| **상품 SKU** | `/hq/products?channel=shopee` | `product/get_item_list` | **P0** |
| **글로벌 SKU** | HQ catalogId = 원장. 샵 item_id는 투영 | Global Product는 CNSC 전용 — 1호는 샵 로컬 add_item | P1 |
| 제품 설정(일괄) | Export 재실행 · 재고 패치 | `product/update_stock` | **P0** |
| 제품 기회 / 표준상품 | **비범위** (쇼피 카탈로그 연구) | — | — |

Seller Center 「새 제품」폼을 HQ에 이식하지 않는다. CJ에서 고른 SKU를 **마지막에만** Shopee 스키마로 투영한다.

### FBS (쇼피에서 배송)

**비범위.** LEXI는 CJ 직배(MFN). FBS는 재고 원장이 갈라진다. Amazon FBA·쿠팡 RG와 동일 결정.

---

## HQ 화면 (신규 페이지 최소화)

| HQ | 역할 |
|----|------|
| `/hq/pipeline/export` | 마지막 송출. shopee 체크 + 카테고리/물류/이미지 |
| `/hq/products?channel=shopee` | Export된 item_id · 품절 |
| `/hq/purchase-requests?channel=shopee` | READY_TO_SHIP 일괄 |
| `/hq/sourcing-orders` | CJ 트래킹 → ship_order |
| `/hq/settlements?channel=shopee` | 내부 마진. escrow API는 P2 |
| `/hq/channels` | `ShopeePanel` probe · 재고 투영 |
| `/hq/pipeline/catalog` `/pdp` | Shopee 진입점 **아님** |

---

## 페이즈

완료 기준 = Seller Center에서 해당 업무를 열지 않아도 HQ에서 끝남.

| ID | 산출 | HQ에서 끝나는 일 |
|----|------|------------------|
| **S0** | shop_id 계약. health mock/ready/live. 채널 시드 | `/hq/channels`에 Shopee 카드 |
| **S1** | HMAC + `get_shop_info` + 물류 채널 probe | 연결 실패가 HQ에 보임 |
| **S2** | Export 체크리스트 (title≤120, 이미지, category_id, logistic_id) | 송출 전 blocked/ready |
| **S3** | `SHOPEE_LISTING_MODE=preview` 기본 — add_item 생략 | export_jobs `preview_ok` |
| **S4** | live add_item + 이미지 업로드 | MOCK 아닌 item_id |
| **O1** | Orders → purchase_requests | 쇼피 그룹 검수 |
| **O2** | CJ tracking → ship_order | HQ ack로 배송처리 |
| **C** | CJ stock → update_stock | 품절 HQ에서 |

---

## 환경

```
SHOPEE_PARTNER_ID=
SHOPEE_PARTNER_KEY=
SHOPEE_SHOP_ID=            # CNSC shop, 예: 1922643383
SHOPEE_ACCESS_TOKEN=
SHOPEE_REFRESH_TOKEN=      # 만료 시 메모리 갱신
SHOPEE_REGION=live         # sandbox | live
SHOPEE_CURRENCY=SGD
SHOPEE_LISTING_MODE=preview|live
SHOPEE_CATEGORY_ID=        # 1호 카테고리. 0이면 live 차단
SHOPEE_LOGISTIC_ID=        # 없으면 probe 시 활성 채널 첫 값
```

토큰·키는 문서에 적지 않는다. shop_id만 운영 계약.

---

## 구현 상태 (2026-08-20)

| ID | 상태 | 코드 |
|----|------|------|
| S0 | ✅ | `constants.ts`, `health-state.ts`, `store.ts` 채널 시드, `sales-channels.ts` |
| S1 | ✅ | `GET /api/hq/channels/shopee?probe=1`, `ShopeePanel` |
| S2 | ✅ | `projectForShopee` + Export 체크리스트 |
| S3 | ✅ | `SHOPEE_LISTING_MODE=preview` → `SHOPEE-PREVIEW-*` |
| S4 | ✅ | `listings.ts` 이미지 업로드 + add_item |
| O1 | ✅ | `get_order_list` + `get_order_detail` |
| O2 | ✅ | shipped → `ship_order` |
| C | ✅ | `POST sync-stock` SKU `LEXI-{catalogId}` |

**안정성:** `health.ts` ↔ `api.ts` 순환을 `health-state.ts`로 분리. 구 어댑터는 HMAC path에 쿼리를 붙여 서명이 깨졌다.

---

## 현재 갭 → 본 문서 구현으로 닫는 것

| 기능 | 이전 | 이후 |
|------|------|------|
| HMAC 쿼리 서명 | path에 쿼리 붙여 서명 깨짐 | `api.ts` extra 쿼리 |
| health-state | import만 있고 파일 없음 (다운 위험) | 분리 모듈 |
| preview/live | 없음 | Amazon과 동일 계약 |
| 이미지 | image_id 빈 배열 | media_space 업로드 |
| 주문 상세 | 목록만 | get_order_detail |
| 재고 | 고정 5 | CJ stock 투영 |
| HQ 카드 | 카탈로그에 없음 | SALES_CHANNEL_CATALOG + Panel |
