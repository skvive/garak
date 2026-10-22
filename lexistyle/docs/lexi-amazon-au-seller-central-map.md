# Amazon AU — 판매처 Export · HQ 일괄운영 기획

> 상태: 기획.  
> 목적 확정: Amazon AU는 **공급처가 아니다. 드롭십 파이프라인의 마지막 Export 대상(판매채널)** 이다.  
> SP-API를 붙이는 이유: **이미 HQ에서 생성·송출한 SKU를 Seller Central 없이 HQ에서 일괄 관리**하기 위함이다.  
> 관련: `docs/lexi-linkrcode-pdp-syndication.md`, `docs/adr-catalog-pdp-export.md`, `src/lib/channels/adapters/amazon-au.ts`

## 목적 (정본)

```
CJ 소싱 → catalog → Import → PDP 공장 → export_jobs
                                              │
                    lexi / coupang / cafe24 / shopify / amazon_au
                                              ▲
                                    Amazon AU는 여기만
```

| 역할 | 무엇인가 | 무엇인가가 아닌가 |
|------|----------|-------------------|
| Amazon AU | 호주 **판매처**. 쿠팡·Shopify와 같은 ChannelAdapter | 카탈로그 소싱, 제품 연구, Seller Central UI 대체 복제 |
| HQ | 드롭십 **운영 원장**. 리스팅 생성·가격·재고투영·주문인입·송장·정산을 한곳에서 일괄 | Amazon 광고·브랜드 레지스트리·ungating 창구 |
| Seller Central | 계정 개설, 앱 승인, 정책/카테고리 게이트. 일상 운영의 정본이 아님 | HQ가 막히면 사람이 들어가는 **예외 콘솔** |

성공 기준: 운영자가 **제품 추가·제품 관리·주문 관리·송장**을 `sellercentral.amazon.com.au`에 들어가지 않고 `/hq/pipeline/export`, `/hq/products`, `/hq/purchase-requests`에서 처리한다.

Seller Central 「제품 추가」화면을 HQ에 이식하지 않는다. 그 화면은 Amazon이 카탈로그를 고르는 UX다. 우리는 이미 CJ에서 고른 SKU를 **마지막에만** Amazon 스키마로 투영한다.

---

## 파이프라인에서의 위치

1. 소싱·재고 원장 = CJ (`/hq/pipeline/catalog`, `/hq/cj-inventory`)
2. 콘텐츠 원장 = PDP (`/hq/pipeline/pdp`, ConceptSpec 잠금)
3. **마지막 = Export** (`/hq/pipeline/export` 채널 멀티셀렉트에 `amazon_au`)

Amazon용 카피는 공장에서 `locale=en` 투영일 뿐, Amazon에서 상품을 다시 만들지 않는다. 웹 URL·이미지 검색으로 Amazon 카탈로그를 시드하는 경로는 **금지**(공급사 URL 유출·이중 원장).

일괄: 잠긴 ConceptSpec × 선택 N건 factory → 문서 N건 → export_jobs N×채널. Amazon만 따로 콘솔에서 올리지 않는다.

---

## HQ에서 일괄 관리할 것 (Seller Central 대체)

Export된 뒤에 HQ가 소유하는 운영 루프:

| 작업 | HQ | SP-API | Seller Central |
|------|-----|--------|----------------|
| 신규 게시 | Export `amazon_au` | Listings PUT | 쓰지 않음 |
| N건 재게시·가격 갱신 | Export 재실행 / 채널 패치 | Listings PATCH | 쓰지 않음 |
| 리스팅 상태(억제·품절) | `/hq/products` amazon_au 필터 | PATCH discoverable / qty | 조회용 폴백만 |
| 재고 | CJ stock → MFN qty 투영 | Inventory / listings qty | FBA 화면 안 씀 |
| 주문 인입 | `/hq/purchase-requests` 채널 Amazon AU | Orders GET | 쓰지 않음 |
| 발주·송장 | 기존 드롭십 ack → Amazon confirmShipment | ackOrder | 쓰지 않음 |
| 정산 요약 | `/hq/settlements` Amazon AU 그룹 | Reports/Finance P2 | 월마감 예외만 |

건강도: `AMAZON_AU_SELLER_ID`만으로 live 금지. **최근 Export 또는 Listings/Orders 호출이 실응답**일 때만 live. 그 외 mock/ready.

---

## Seller Central 메뉴는 참고 IA일 뿐

좌측 제품·공급망·주문은 Amazon 콘솔 지도다. HQ 화면 설계의 원본이 아니다. 매핑은 **어느 API를 Export/운영 루프에 붙일지**용이다.

### 제품 — Export 이후 관리

| Amazon 콘솔 이름 | HQ 일괄 | 비고 |
|------------------|---------|------|
| 제품 추가 | **Export만**. 파이프라인 마지막 스텝 | 5아이콘(검색/이미지/GTIN/URL/빈) HQ에 안 만듦. 빈 리스팅 PUT만 |
| 제품 관리 | `/hq/products` + export_jobs | 정본 목록은 HQ. Amazon GET는 상태 동기화 |
| 가격 관리 | 송출 직전 AUD 마진 | PDP에 AUD 고정 저장 금지 |
| 제품 보고서 | P2 주간 싱크 | HQ 목록과 드리프트 검증 |
| 리뷰·연구·글로벌 | 비범위 | 판매처 운영 루프 아님 |

### 공급망

드롭십 MFN. FBA Send to Amazon / 글로벌 스토어는 비범위. CJ 재고만 Amazon qty로 투영.

### 주문

구매요청 인입·송장이 목적. Seller Central 주문 화면을 복제하지 않음. 채널 필터는 `channelId`(기존 OrderInbox `channelCode` 버그 같이 고침).

---

## 하지 않는다

- Amazon을 소싱/카탈로그 인덱스로 쓰기
- 파이프라인 **앞단**(crawl, Import, PDP 시드)에 Amazon 검색을 넣기
- Seller Central 한글 UI·제품 추가 위저드를 HQ에 복제
- CJ/자사몰 URL로 Amazon 「웹 URL 등록」
- 가짜 리뷰, FBA를 기본 출고로
- 광고·메시지·Brand Analytics를 1차에 넣기

사람이 Seller Central에 남는 일(앱 승인, ungating, GTIN exemption, 계정 정책): **예외**. 일상 리스팅·주문은 HQ.

---

## 페이즈 (Export·HQ 운영 기준)

완료 기준은 「Seller Central에서 보인다」가 아니라 **HQ만으로 해당 작업이 끝난다**. Seller Central은 스모크 검증용.

| ID | 산출 | HQ에서 끝나는 일 |
|----|------|------------------|
| **A0** | 목적·marketplaceId 계약. 채널 health 수정 | `/hq/channels`에 amazon_au = Export 대상, mock/ready/live |
| **A1** | SigV4 + AU 참여 확인 | 연결 실패가 HQ에 에러로 보임 |
| **A2** | Product Type 체크리스트를 **Export 패널**에 | 송출 전 blocked/ready. PDP 화면이 아님 |
| **A3** | VALIDATION_PREVIEW 1건을 export_jobs로 | HQ 잡 상세에 검증 결과. 콘솔 확인은 선택 |
| **A4** | live PUT 일괄(공장 N건 → export N) | `/hq/pipeline/export`에서 MOCK 아닌 ref. `/hq/products`에 채널 행 |
| **B1** | Orders → purchase_requests | Amazon AU 그룹으로 일괄 검수. 콘솔 주문 안 염 |
| **B2** | CJ 트래킹 → confirmShipment | HQ ack로 Amazon 배송완료 |
| **C** | CJ stock 일괄 투영 + 정산 그룹 | 품절 N건 HQ에서 discoverable off |

A2 전에 Amazon 공장을 열지 않는다. A4가 「일괄」의 최소 단위다.

### 구현 상태 (2026-08-20)

| ID | 상태 | 코드 위치 |
|----|------|-----------|
| A0 | ✅ | `constants.ts`, `health-state.ts`, `sales-channels.ts` |
| A1 | ✅ | `health.ts`, `sp-api.ts`, `GET /api/hq/channels/amazon_au?probe=1` |
| A2 | ✅ | `channel-projection.ts` → Export 체크리스트 |
| A3 | ✅ | `listings.ts` VALIDATION_PREVIEW, `jobs.ts` `preview_ok` |
| A4 | ✅ | `amazon-au.ts` adapter `publish`, export_jobs |
| B1 | ✅ | `amazon-au.ts` `pullOrders` |
| B2 | ✅ | `services.ts` shipped → `ackOrder` → `confirmShipment` |
| C | ✅ | `sync-stock` API, `AmazonAuPanel`, `patchAmazonStock` |

**안정성:** `health.ts` ↔ `sp-api.ts` 순환 import가 webpack/빌드 OOM·다운 원인 → `health-state.ts` 분리로 해소.

---

## HQ 화면 (신규 페이지 최소화)

Amazon 전용 앱을 만들지 않는다. **기존 Export·상품·구매요청·정산**에 채널 슬롯만 채운다.

| HQ | 역할 |
|----|------|
| `/hq/pipeline/export` | 마지막 송출. amazon_au 체크 + 필수필드. N건 큐 |
| `/hq/products?channel=amazon_au` | Export된 리스팅 일괄(상태·가격·품절) |
| `/hq/purchase-requests` Amazon AU | 판매주문 일괄 |
| `/hq/settlements` Amazon AU | 채널 정산 |
| `/hq/channels` | 연결 상태만. 상품 등록 UI 없음 |
| `/hq/pipeline/catalog` `/pdp` | Amazon 진입점 아님 |

---

## 환경

```
AMAZON_AU_MARKETPLACE_ID=A39IBJ37TRP1C6
AMAZON_AU_SELLER_ID=
AMAZON_AU_CLIENT_ID=
AMAZON_AU_CLIENT_SECRET=
AMAZON_AU_REFRESH_TOKEN=
AMAZON_AU_AWS_ACCESS_KEY=
AMAZON_AU_AWS_SECRET_KEY=
AMAZON_AU_AWS_REGION=us-west-2
```

엔드포인트 `https://sellingpartnerapi-fe.amazon.com`, SigV4 region `us-west-2`.  
키는 Vercel / Neon. Git·채팅 금지.
