# LEXI 역직구 대리점 플랫폼 — 통합 개발명세서 v1.2

> **비즈니스 모델**: 글로벌 대리점(Agency/Dropship 중개). 공급처 상품을 소싱→AI 리뉴얼→판매채널에 게시→구매요청 검수 후 공급처 발주→차액(마진) 수취. 재고·물류·반품 의무 없음(반품은 공급처 A/S 위임).
>
> **대상 리포**: `loyadbeta`(본사 대시보드 기반) · `lexistyle`(자사몰 + Cafe24 헤드리스 어댑터 + 커머스 DB) · 판매처(외부 마켓플레이스)
>
> ⚠️ **사실 정정**: Cafe24 모듈은 lexihome이 아니라 **lexistyle** `src/lib/cafe24/`에 이미 이식되어 있음(client/config/catalog/orders/carts/admin-products/map-product + `/api/cafe24/sync|status`). lexihome은 사이트 템플릿 모노레포로 커머스 코드 없음. 본 명세는 실제 코드 기준.

---

## 0. 시스템 토폴로지 (누가 어디서 무엇을)

```
[1 공급처 N개]          [2 본사 대시보드 (loyadbeta)]                [3 판매채널 N개]
 해외 원본 커머스   ←──   SupplierHub (커넥터/파싱)                    자사몰(lexistyle/LEXI)
 (API·피드·크롤)          Catalog Studio (큐레이션+AI리뉴얼)     ──→   Cafe24 몰
                          Listing Publisher (채널 게시)          ──→   외부 셀러 마켓(워크스페이스 업로드)
                          Purchase Inbox (구매요청 엑셀/웹훅 인입)
                          Sourcing Orders (검수→공급처 발주)
                          Settlement (마진/정산)
                                   │
                          [Commerce DB = Neon Postgres]  ←— 단일 진실 원천(SSOT)
                          (lexistyle이 소유, HQ API로 노출)
```

**아키텍처 결정 (중요)**
- **D1. Commerce DB는 Neon 하나로 통일**하고 소유자는 lexistyle로 한다. lexistyle에 이미 products/orders/Drizzle 스키마·Cafe24 어댑터·결제가 있으므로 여기에 역직구 테이블을 **증설**한다. loyadbeta에 커머스 스키마를 복제하면 이중 원장이 되어 반드시 어긋난다.
- **D2. loyadbeta는 "운영 콘솔(Head)"**: 커머스 데이터를 직접 만지지 않고 lexistyle이 노출하는 **HQ API**(`/api/hq/*`, Bearer 토큰)를 호출한다. loyadbeta의 Supabase는 기존 용도(운영자 인증·SNS/홍보·AI 잡 큐)로 유지.
- **D3. AI 리뉴얼 실행기는 loyadbeta의 기존 생성 파이프라인 재사용** (`src/lib/generation/*`, `ai.functions.ts`, QueuePanel/JobNotificationsBell 큐 패턴). 결과물만 HQ API로 lexistyle DB에 저장.
- **D4. 공급처 수집은 어댑터 패턴**: 공급처마다 `SupplierConnector` 구현체 1개. **공식 API/오픈 피드 우선**, 크롤링은 해당 사이트 약관·robots 준수 범위에서만(§8 리스크).

---

## 1. 도메인 모델 & DB 스키마 (lexistyle `src/db/schema.ts` 증설)

기존 테이블(products, orders, order_items, cart_items, site_settings…)은 유지. 아래를 추가한다. 공통 컬럼 `is_dummy/deleted_at/created_at`(dummyCols) 규약 동일 적용.

```ts
/** 공급처 마스터 — 본사가 여러 곳 등록 */
suppliers {
  id, code text UNIQUE,            // 'aliexp', 'taobao-x', '1688-y' ...
  name, homepage,
  connectorKind text,              // 'api' | 'feed' | 'scrape'
  connectorConfig jsonb,           // 엔드포인트·인증키 참조(비밀은 env/secret store)
  currency char(3), leadTimeDays int,
  asCenterUrl text, asPolicy text, // 반품/AS 위임 근거(§6)
  status text default 'active',
  ...dummyCols
}

/** 원본 상품 스냅샷(파싱 결과, 불변 이력) */
supplier_products {
  id, supplierId FK, externalId text,        // 공급처 상품 고유키
  UNIQUE(supplier_id, external_id),
  url, rawTitle, rawDescriptionHtml,
  rawCategoryPath text[],                    // 공급처 카테고리 경로
  priceOriginal numeric, currency char(3),
  stock int, sellerName, sellerInfo jsonb,   // 판매자정보 전부
  images jsonb,                              // [{url, hash}] 원본 이미지 목록
  optionSchema jsonb,                        // 색상/사이즈 등 변형
  contentHash text,                          // 변경감지용
  fetchedAt timestamptz, syncStatus text     // ok|stale|gone
}

/** 큐레이션: 즐겨찾기 목록(=소싱 컬렉션) */
collections { id, slug UNIQUE, name, note, sort, ownerEmail, ...dummyCols }
collection_items {
  id, collectionId FK, supplierProductId FK,
  UNIQUE(collection_id, supplier_product_id),
  pinnedAt, decision text default 'candidate'   // candidate|approved|rejected
}

/** AI 리뉴얼 산출물 = 리스팅 초안 (상품별 정보파일) */
listing_drafts {
  id, supplierProductId FK, collectionId FK,
  version int,                                // 재생성 이력
  title, subtitle, descriptionHtml,           // AI 재작성 텍스트
  seoKeywords text[],
  designDoc jsonb,                            // 상세페이지 블록 구조(§3.3 DSL)
  renderedHtml text,                          // 게시용 최종 HTML
  assets jsonb,                               // [{kind:'hero|detail|thumb', blobUrl, source:'ai|edited'}]
  aiModel text, promptRef text, generationJobId text,   // loyadbeta 잡 추적
  costUsd numeric,                            // 생성비용 추적
  status text default 'draft',                // draft|review|approved|rejected
  reviewedBy, reviewedAt
}

/** 게시 확정본(내부 카탈로그와 연결) */
listings {
  id, draftId FK UNIQUE, productId FK -> products.id,   // 자사 products에 upsert
  marginPolicy jsonb,        // {type:'rate'|'fixed', value, minMarginUsd}
  supplierCostUsd numeric,   // 소싱 원가 스냅샷
  sellPriceUsd numeric,      // 판매가 = cost*(1+rate)+배송버퍼
  status text default 'ready'   // ready|published|paused|retired
}

/** 판매채널 & 채널별 게시 상태 */
channels {
  id, code UNIQUE,            // 'lexi'(자사몰) | 'cafe24' | 'seller:<marketplace>'
  kind text,                  // own|cafe24|marketplace
  config jsonb                // cafe24 mall_id, 셀러 워크스페이스 좌표 등
}
channel_listings {
  id, listingId FK, channelId FK, UNIQUE(listing_id, channel_id),
  externalRef text,           // cafe24 product_no / 마켓 상품ID / 업로드 파일키
  publishState text default 'queued',  // queued|pushed|live|failed|delisted
  lastPushedAt, lastError text
}

/** 판매채널에서 인입되는 구매요청 (엑셀/CSV/웹훅) */
purchase_requests {
  id, channelId FK,
  importBatchId FK,                       // 어느 엑셀에서 왔나
  externalOrderRef text, UNIQUE(channel_id, external_order_ref),
  channelListingId FK NULL,               // 매칭 성공 시
  rawRow jsonb,                           // 엑셀 원본 행 보존
  buyerName, buyerCountry char(2), shippingAddress jsonb,
  qty int, channelPaidAmount numeric, channelCurrency char(3),
  status text default 'received',
  // received → matched → vetted(검수통과) → sourcing(발주됨) → fulfilled → closed
  //          ↘ rejected(검수탈락)         ↘ refund_delegated(공급처AS 이관)
  vettedBy, vettedAt, rejectReason text
}
import_batches { id, channelId FK, filename, rowCount int, okCount int, errorRows jsonb, importedBy, importedAt }

/** 공급처 발주(소싱 주문) */
sourcing_orders {
  id, purchaseRequestId FK UNIQUE, supplierId FK, supplierProductId FK,
  orderPayload jsonb,                     // 커넥터에 보낸 요청
  supplierOrderRef text, trackingNo text, carrier text,
  costUsd numeric, shippingUsd numeric,
  status text default 'requested',
  // requested → confirmed → shipped → delivered → settled
  //           ↘ failed ↘ cancelled ↘ as_delegated(반품/AS 공급처 이관)
  asTicketRef text                        // 공급처 A/S 센터 티켓 번호
}

/** 정산(마진 원장) */
settlements {
  id, sourcingOrderId FK UNIQUE,
  revenueUsd numeric,     // 채널 수취액(환산)
  costUsd, shippingUsd, channelFeeUsd, pgFeeUsd,
  marginUsd numeric GENERATED,            // revenue - (cost+shipping+fees)
  fxRate numeric, settledAt, status text  // pending|confirmed
}
```

인덱스: `supplier_products(supplier_id, sync_status)`, `purchase_requests(status)`, `channel_listings(publish_state)`, 부분인덱스 `WHERE deleted_at IS NULL` 규약 유지. Dummy/Real 스위치의 PURGE_ORDER에 신규 테이블을 FK 역순으로 추가(`settlements → sourcing_orders → purchase_requests → import_batches → channel_listings → listings → listing_drafts → collection_items → collections → supplier_products → suppliers → channels`).

---

## 2. 파이프라인 명세 (P1–P6)

### P1. 공급처 수집 (Ingest)
- 인터페이스 (lexistyle `src/lib/sourcing/connector.ts`):
```ts
interface SupplierConnector {
  code: string;
  listCategories(): Promise<RemoteCategory[]>;
  listProducts(q: {category?: string; page: number}): Promise<RemoteProduct[]>;  // 목록 파싱
  getProduct(externalId: string): Promise<RemoteProductDetail>;                  // 상세(판매자정보·재고 포함)
  placeOrder?(req: SourcingOrderPayload): Promise<{supplierOrderRef: string}>;   // 발주 지원 시
}
```
- 구현체: `connectors/<code>.ts` 1파일 1공급처. API형(피드/오픈API) 우선, 스크레이프형은 서버측 fetch+파서(cheerio)로 하되 **rate limit(기본 1 req/2s)·robots·약관 준수, 이미지 원본은 URL 참조만 저장**(무단 복제 게시는 §8 리스크 — AI 리뉴얼로 대체하는 것이 본 모델의 존재 이유).
- 동기화 잡: Vercel Cron `/api/cron/supplier-sync` (일 1회 + 수동 트리거) → upsert `supplier_products`, `contentHash` 변경 시 연결된 listing에 `stale` 플래그.

### P2. 큐레이션 (Curate)
- 대시보드에서 supplier_products를 카테고리·가격·재고 필터로 브라우즈 → 체크 선택 → 컬렉션(즐겨찾기 목록)에 담기 → `decision=approved`만 P3 대상.

### P3. AI 상품페이지 리뉴얼 (Renewal)
- 실행: **loyadbeta 생성 파이프라인 재사용**. 잡 페이로드 `{supplierProductId, collectionId, template:'lexi-pdp-v1', tone, locale[]}` → 기존 Queue에 enqueue → 완료 시 HQ API `POST /api/hq/drafts`로 저장.
- 산출물 규격 (`designDoc` DSL): `{blocks:[{type:'hero',assetRef,headline},{type:'usp',items[3]},{type:'gallery'},{type:'spec-table',rows},{type:'faq'},{type:'cta'}]}` → 서버 렌더러가 `renderedHtml` 생성(자사몰 PDP·Cafe24 상세HTML 공용).
- 이미지: 원본 참조 금지. AI 생성/재촬영풍 이미지를 Vercel Blob에 저장 후 `assets[]`.
- 게이트: **사람 승인 필수** (`draft → review → approved`). 승인 시 `listings` 생성 + 마진정책 적용 판매가 산출: `sellPrice = ceil((cost + shipBuffer) * (1 + marginRate), 0.9)`.

### P4. 채널 게시 (Publish)
- `channel_listings` 큐 소비 워커 `/api/cron/publish-worker`:
  - **lexi(자사몰)**: `products`/`product_images` upsert (기존 catalog 흐름 그대로 노출).
  - **cafe24**: 기존 `src/lib/cafe24/admin-products.ts` 사용 → product_no를 `externalRef`에 기록, `products.cafe24ProductNo` 동기화.
  - **marketplace(셀러 입점형)**: 채널별 어댑터. 자동 API가 없으면 "업로드 패키지"(zip: renderedHtml + assets + meta.csv)를 생성해 워크스페이스 업로드용으로 다운로드 제공(반자동).
- 실패는 `publishState=failed + lastError`, 지수 백오프 3회 재시도.

### P5. 구매요청 인입 → 검수 → 발주
- 인입 2경로:
  1) **엑셀/CSV 업로드**: 대시보드 Purchase Inbox에서 파일 업로드 → `/api/hq/purchase-requests/import` → 헤더 매핑 프리셋(채널별 저장) → 행 단위 검증(필수: 주문번호/상품ref/수량/금액/배송지) → `import_batches` + `purchase_requests(received)` 생성, 오류행은 `errorRows`로 반환.
  2) **웹훅**(채널이 지원 시): `POST /api/hq/webhooks/channel/:code` (HMAC 검증).
- 매칭: `externalRef ↔ channel_listings` 자동 매칭 → `matched`. 실패분은 수동 매칭 UI.
- **검수(관리자)**: 마진 미달/재고 소진/배송 불가국 자동 경고 → 승인 시 `vetted`, 탈락 시 `rejected(사유)`.
- **발주**: `vetted` 건에 대해 `sourcing_orders` 생성 → 커넥터 `placeOrder()`(미지원 공급처는 수동 발주 후 `supplierOrderRef` 입력) → `sourcing`.

### P6. 이행·반품·정산
- 배송추적: cron이 커넥터/트래킹 API 폴링 → `shipped/delivered` 전이 → 채널 측 상태 회신(가능 채널만).
- **반품/AS**: 대리점은 수행 의무 없음. `refund_delegated` 전이 시 자동으로 (a) 구매자에게 공급처 A/S 센터 링크·티켓 안내 발송, (b) `sourcing_orders.asTicketRef` 기록, (c) 분쟁 로그 보존. 단, 채널 규정상 1차 응대 책임이 대리점에 있는 마켓은 채널 config에 `firstLineSupport:true`로 표시하고 체크리스트 노출(법적 리스크 §8).
- 정산: `delivered` 후 `settlements` 자동 생성(환율은 발주시점 고정) → 관리자 confirm → 대시보드 마진 리포트.

---

## 3. loyadbeta 이식 작업 명세 (본사 대시보드)

loyadbeta `/admin` NavKey 레지스트리에 **Commerce 섹션** 추가. 기존 패널 컨벤션(`src/components/XxxPanel.tsx` + `src/lib/xxx.functions.ts`) 그대로 따른다.

| NavKey | Panel 파일 | 기능 | 호출 API |
|---|---|---|---|
| `suppliers` | `SupplierHubPanel.tsx` | 공급처 CRUD, 커넥터 설정, 수동 sync 트리거, 파싱 미리보기 | `GET/POST /api/hq/suppliers`, `POST /api/hq/suppliers/:id/sync` |
| `sourcing` | `CatalogStudioPanel.tsx` | supplier_products 브라우즈(필터/검색), 컬렉션 담기, AI 리뉴얼 실행(기존 Queue 재사용), 초안 검토·승인 | `GET /api/hq/supplier-products`, `POST /api/hq/collections*`, `POST /api/hq/drafts/:id/approve` |
| `listings` | `ListingsPanel.tsx` | 승인 리스팅 목록, 마진정책 편집, 채널 선택 게시, 게시상태 모니터 | `GET/PATCH /api/hq/listings`, `POST /api/hq/listings/:id/publish` |
| `purchase-inbox` | `PurchaseInboxPanel.tsx` | 엑셀 업로드(매핑 프리셋), 인입 목록, 검수 승인/반려, 수동 매칭 | `POST /api/hq/purchase-requests/import`, `PATCH .../:id/vet` |
| `sourcing-orders` | `SourcingOrdersPanel.tsx` | 발주 실행/수동 등록, 트래킹, AS 이관 처리 | `POST /api/hq/sourcing-orders`, `PATCH .../:id` |
| `settlement` | `SettlementPanel.tsx` | 마진 원장, 기간별 리포트, confirm | `GET /api/hq/settlements` |

- 신규 lib: `src/lib/commerce.functions.ts` — HQ API 클라이언트(fetch wrapper, `HQ_API_BASE`+`HQ_API_TOKEN` env). React Query 키 규약 `['hq', resource, params]`.
- AI 리뉴얼 잡 타입 추가: `src/lib/generation/`에 `listingRenewal` 잡 핸들러 등록(입력: supplier_product 스냅샷 → 출력: designDoc+assets 업로드+HQ draft 저장). 완료 알림은 기존 JobNotificationsBell 재사용.
- 권한: loyadbeta 운영자 세션 = HQ API 토큰 보유자. 별도 RLS 불필요(HQ API가 서버-서버).

## 4. lexistyle 이식 작업 명세 (커머스 코어 + HQ API)

- `src/db/schema.ts`: §1 테이블 추가, `drizzle-kit push`.
- `src/lib/sourcing/`: `connector.ts`(인터페이스) + `connectors/`(공급처별) + `normalize.ts`.
- `src/lib/renewal/render.ts`: designDoc → HTML 렌더러 (PDP와 Cafe24 상세 공용).
- `src/app/api/hq/[...]`: §2 엔드포인트 전부. 인증 미들웨어: `Authorization: Bearer ${HQ_API_TOKEN}` 불일치 시 401. Zod로 페이로드 검증.
- `src/app/api/cron/`: `supplier-sync`, `publish-worker`, `tracking-poll` (vercel.json crons).
- Cafe24: 기존 `admin-products.ts`에 `upsertFromListing(listing)` 헬퍼 추가만.
- 자사몰 PDP: `listings` 게시분은 `lib/catalog.ts`가 이미 products를 읽으므로 무변경. `renderedHtml` 블록은 PDP 설명영역에 sanitize 후 삽입(기존 ksacs `sanitize-html` 패턴 재사용).

## 5. 판매처(셀러 마켓) 연동 규격

- 채널 등록 시 필수 config: `{workspaceType:'file'|'api', uploadFormat:'zip'|'csv', orderExport:{format:'xlsx', headerMap:{...}}, asCenterUrl}`.
- **업로드 패키지 생성기**: `POST /api/hq/listings/:id/export?channel=X` → zip(상세HTML, 이미지, meta.csv[상품명/가격/옵션/카테고리]) — API 없는 마켓 대응 표준 경로.
- **주문 엑셀 규격(권장 템플릿)**: `order_ref, listing_ref, qty, paid_amount, currency, buyer_name, country, addr1, addr2, zip, phone, ordered_at` — 채널별 상이 헤더는 매핑 프리셋으로 흡수.

## 6. 상태머신 요약

```
listing_draft : draft → review → approved | rejected
listing       : ready → published ⇄ paused → retired
channel_listing: queued → pushed → live | failed(→재시도)| delisted
purchase_req  : received → matched → vetted → sourcing → fulfilled → closed
                        ↘ rejected            ↘ refund_delegated
sourcing_order: requested → confirmed → shipped → delivered → settled
                          ↘ failed | cancelled | as_delegated
```
모든 전이는 `data_mode_audit` 패턴과 동일한 `commerce_audit`(actor, from, to, meta) 기록.

## 7. 마일스톤 (실행 순서)

| M | 범위 | 완료 기준 |
|---|---|---|
| M1 | 스키마+HQ API 골격+토큰 인증 | drizzle push, /api/hq/suppliers CRUD 통합테스트 |
| M2 | 커넥터 1호(공급처 1곳) + supplier-sync cron | 실제 카테고리/상품 1천건 인제스트 |
| M3 | loyadbeta Commerce 패널 3종(suppliers/sourcing/listings) | 대시보드에서 수집→컬렉션→승인 왕복 |
| M4 | AI 리뉴얼 잡 + designDoc 렌더러 + 승인 게이트 | 초안 10건 생성·승인·자사몰 게시 |
| M5 | Cafe24 게시 + 엑셀 인입 + 검수 + 수동 발주 | 구매요청 1건 end-to-end (모의) |
| M6 | 자동 발주 커넥터·트래킹·정산 리포트 | delivered→margin 리포트 자동 산출 |

## 8. 리스크 & 준수사항 (반드시 검토)

1. **스크래핑/약관**: 공급처 사이트 약관·robots 위반 수집은 계정정지·법적 분쟁 리스크. 공식 API/제휴 피드 우선, 스크레이프는 허용 범위 확인 후. 커넥터별 `legalNote` 필드에 근거 기록.
2. **지재권**: 원본 상품 이미지·상세문구 무단 재게시 금지 — AI 리뉴얼(자체 제작 콘텐츠)이 이 리스크의 해결책이며, 원본 이미지는 내부 참고용으로만 보관.
3. **반품 위임 한계**: "대리점은 반품 의무 없음"은 내부 정책일 뿐, 소비자 보호법(판매 채널 소재국)과 채널 정책이 우선. 채널별 `firstLineSupport` 플래그로 1차 응대 의무 채널을 구분하고, 이용약관에 A/S 위임 구조를 명시할 것.
4. **가격/환율**: 발주 시점 환율 고정 저장(`settlements.fxRate`), 마진 미달 자동 경고 임계값 `minMarginUsd`.
5. **비밀정보**: 커넥터 인증키·HQ_API_TOKEN은 Vercel env로만, DB의 connectorConfig에는 참조 키만.

## 9. 확정된 공급처·판매처 커넥터 매트릭스 (v1.1)

### 9.1 공급처 커넥터 — 실제 API 현황 기준 구현 전략

| 공급처 | API 현황 (현실) | 커넥터 전략 | 발주(placeOrder) | 우선순위 |
|---|---|---|---|---|
| **CJDropshipping** | ✅ 공식 REST API (developers.cjdropshipping.com) — 상품목록/상세/재고/주문생성/트래킹 전부 제공, 이메일+API키 토큰 인증 | `connectors/cjdropshipping.ts` **완전 자동**. 상품 카탈로그 → supplier_products 직행 | ✅ API 직접 발주 + 트래킹 웹훅 | **P0 (1호)** |
| **Superbuy** (구매대행 레이어) | ✅ 오픈 API 제공 — 1688/타오바오 상품 파라미터 조회·대리구매 주문·창고/배송 API | `connectors/superbuy.ts` — **1688·타오바오의 발주 게이트웨이**로 사용 (직접 계정 없이 대리구매) | ✅ 대리구매 API | **P0** |
| **1688** | ⚠️ open.1688.com은 중국 사업자 인증 필요. 외국 법인 직접 연동 사실상 불가 | 상품 데이터: Superbuy 상품조회 API 경유(URL/ID 입력→파싱된 정규 데이터 수신). 직접 스크래핑은 약관·안티봇 리스크로 배제 | Superbuy 경유 | P0 (Superbuy에 포함) |
| **Taobao** | ⚠️ Taobao Open Platform 폐쇄적(중국 개발자 계정). 단, 상품페이지 구조 파싱 난이도는 낮은 편 | 1688과 동일하게 Superbuy 경유를 기본. 보조로 URL 단건 임포트(관리자가 URL 붙여넣기→서버 파싱→supplier_products 1건 생성) | Superbuy 경유 | P1 |
| **Pinduoduo** | ❌ 해외 개방 API 없음 + 업계 최강 안티봇. 자동화 투자 대비 효율 최악 | **백로그**. 수동 단건 임포트 폼(관리자가 상품정보 직접 입력)만 지원 | 수동 발주 | P3 (보류) |

> 구현 함의: `SupplierConnector`에 `importByUrl(url): Promise<RemoteProductDetail>` 옵션 메서드 추가 (Superbuy/Taobao URL 단건 임포트용). `suppliers.connectorKind`에 `'agent'`(대행 API) 값 추가.

### 9.2 판매채널 어댑터 — 인증·게시·주문수신 방식

| 채널 | API | 인증 | 상품 게시 | 주문 수신 | 우선순위 |
|---|---|---|---|---|---|
| **Coupang (쿠팡)** | Wing Open API (developers.coupangcorp.com, `api-gateway.coupang.com`) | Wing에서 발급한 vendorId + AccessKey/SecretKey, 요청별 **HMAC-SHA256 서명**(CEA 알고리즘) | `POST /v2/.../marketplace/seller-products` — 카테고리 자동추천 API·옵션·상세HTML(AI 리뉴얼 renderedHtml 그대로 투입) 지원 | `GET .../ordersheets` 일 단위 폴링 → 자동 purchase_requests 인입, 발주확인(acknowledge)·송장업로드 API로 회신 (**엑셀 불필요**) | **P0 (1호)** |
| **Shopee** | Shopee Open Platform (open.shopee.com) | partner_id + HMAC-SHA256 서명, shop 단위 OAuth | `product/add_item` 일괄등록 — 대량등록 최적 | `order/get_order_list` 폴링 + 푸시 웹훅 | **P1** |
| **Lazada** | Lazada Open Platform (open.lazada.com) | app key + HMAC 서명 (알리바바 계열 — 1688 데이터 구조와 필드 호환성 높음) | `/product/create` | `/orders/get` 폴링 | **P2** |
| **Qoo10 Japan** | QAPI (api.qoo10.jp) — 구식이지만 동작하는 REST | 판매자 인증키(QSM 발급) | `ItemsBasic.SetNewGoods` | `ShippingBasic.GetShippingInfo` 폴링 + **QSM 주문 엑셀 다운로드 병행**(P5 엑셀 인입 경로가 여기서 실사용) | **P1** (일본 고마진 K-뷰티) |
| **Amazon Global** | SP-API | LWA OAuth + AWS SigV4 (난이도 최고) | Listings API + **A+ Content API** ← AI 리뉴얼 designDoc과 직결 | Orders API + SQS 알림 | P2 |
| **TikTok Shop** | TikTok Shop Partner API | 파트너 앱 OAuth | 상품 API + **loyadbeta SocialPublish/ReelsAuto 패널과 결합**: listing 승인 시 숏폼 홍보 잡 자동 enqueue (기존 SNS 파이프라인의 유일한 직접 시너지) | 주문 API | P2 |

> 구현 함의: `channels.kind`에 `'shopee'|'lazada'|'qoo10'|'amazon'|'tiktok'` 추가. 채널 어댑터 인터페이스 `ChannelAdapter { publish(listing), pullOrders(since), ackOrder(ref) }`를 `src/lib/channels/`에 신설 — P4 publish-worker와 P5 인입이 같은 어댑터를 공유. 서명 로직(HMAC/SigV4)은 어댑터 내부 캡슐화.

### 9.3 우선 구현 조합 (Phase A)

**CJDropshipping(소싱·발주) × Coupang(게시·주문수신)** — 양쪽 다 완전 API라 엑셀·수동 단계 없이 M2~M5를 순수 자동 파이프라인으로 검증 가능. 이후 Superbuy(Phase B)로 1688/타오바오가 소싱 풀에 합류하고, Shopee/Qoo10(Phase B)으로 해외 판매 확장. Qoo10은 엑셀 인입 경로(P5-1)의 실전 검증 채널. 환율은 `USD_KRW_RATE` 단일 env → `fx_rates` 테이블(USD/CNY/KRW/SGD/JPY)로 승격.

**Coupang 특이사항 (구현·법무 체크리스트)**
1. **판매 모델 구분**: 중국 소싱→쿠팡 국내 판매는 엄밀히 '해외 구매대행'. Wing 상품 등록 시 구매대행 상품 고지(원산지·수입신고 문구) 필드를 채워야 하며, `channels.config.tradeModel:'purchase-agency'`로 표시.
2. **반품 위임 불가**: 한국 전자상거래법상 청약철회(7일)는 판매자(=우리) 의무 — §6의 `refund_delegated`는 쿠팡 채널에서 **내부 원가 회수용**(공급처 AS에 비용 청구)으로만 동작하고, 소비자 응대는 `firstLineSupport:true` 강제. 반품지 주소는 배대지/국내 회수지 지정 필요.
3. **인증 규제**: KC 인증 대상 카테고리(전자·유아·식품접촉)는 큐레이션 단계에서 차단 필터 — `collection_items.decision='rejected'` 자동 룰 + 카테고리 블랙리스트 테이블.
4. **정산 주기**: 쿠팡 정산(주/월 단위, 판매대금 유보)을 `settlements.status='pending'` 유지 기간에 반영 — 현금흐름 리포트에 유보금 항목 추가.
5. 상품 등록 시 쿠팡 카테고리 매핑: `카테고리 추천 API` 호출 → 실패 시 관리자 수동 매핑 UI (channel_listings에 `categoryOverride` jsonb).

### 9.4 신규 env

```
CJ_API_EMAIL= / CJ_API_KEY=
COUPANG_VENDOR_ID= / COUPANG_ACCESS_KEY= / COUPANG_SECRET_KEY=
SUPERBUY_APP_KEY= / SUPERBUY_APP_SECRET=
SHOPEE_PARTNER_ID= / SHOPEE_PARTNER_KEY= / SHOPEE_SHOP_ID=
LAZADA_APP_KEY= / LAZADA_APP_SECRET=
QOO10_API_KEY= / QOO10_SELLER_ID=
```

## 9.5 쿠팡 Wing 실물 대시보드 UX 이식 (v1.2 — 사장님 제공 PDF 분석 반영)

Wing 스크린샷 19p 분석 결과, 아래 4개 패턴을 양쪽 콘솔(lexistyle `/admin/sourcing`, loyadbeta CommercePanel)에 이식 **완료**:

| Wing 패턴 | Wing 원형 | 이식 구현 |
|---|---|---|
| 퍼널 상태 카운터 카드 | 반품접수 0건/반품진행 0건/반품완료 0건 — 클릭 시 필터 | 소싱상품→검토대기 초안→라이브 리스팅→검수대기 주문→발주 진행→정산 대기 6카드, 클릭 시 해당 탭 이동, 액션 필요 단계는 코랄 하이라이트 |
| N개 선택됨 일괄 액션 | 체크박스 + [입고완료][반품완료] 일괄 버튼 | 구매요청 일괄 검수✓/일괄 반려 (전체선택 지원) |
| 엑셀 다운로드 상시 | 정산관리 엑셀 다운로드 목록 | 구매요청/정산 CSV 다운로드 (BOM 포함, 엑셀 호환) |
| 온보딩 체크리스트 배너 | "입점절차 완료를 위해 2가지 절차를 완료해주세요" | 파이프라인 다음 단계 배너 (①수집→②담기→③리뉴얼→④승인→⑤게시→⑥주문) |

미이식(후속): 정산 기간 필터+정산상태 라디오(전체/확정/예정/보류), 정산 캘린더, 문의/리뷰 탭, 비즈니스 인사이트 차트.

## 11. 구현 현황 (M1–M6 완료, 검증됨)

| M | 상태 | 산출물 |
|---|---|---|
| M1 | ✅ | 스키마 14테이블(+hq_state 스냅샷), HQ 스토어, Bearer/세션 인증, /api/hq/* 16 엔드포인트 |
| M2 | ✅ | CJDropshipping(실API+목업 폴백)·Superbuy 커넥터, supplier-sync cron |
| M3 | ✅ | lexistyle `/admin/sourcing` 콘솔 + loyadbeta CommercePanel(HQ API 소비, PR: loyadbeta#1) |
| M4 | ✅ | lexi-pdp-v1 리뉴얼 생성기(AI 대체 지점 명시), designDoc→HTML 렌더러, 승인 게이트→마진 산출 |
| M5 | ✅ | Coupang CEA HMAC 어댑터(게시/ordersheets pull), CSV 인입(중복·오류행 리포트), 검수/수동매칭 |
| M6 | ✅ | placeOrder 자동발주, 상태머신, delivered→정산 원장 자동 생성(채널수수료·PG수수료·환율 반영), 트래킹 폴링 |
| E2E | ✅ | 수집→큐레이션→리뉴얼→승인→게시→주문→검수→발주→배송→정산 전 구간 통과 + 무토큰 401 확인 |

**v1 내구화 주의**: HQ 상태는 메모리+`hq_state` jsonb 스냅샷(DATABASE_URL 설정 시 자동 저장/복원). 관계형 테이블 완전 이관은 M7. DATABASE_URL 없는 서버리스 환경에서는 인스턴스 간 상태가 공유되지 않으므로 **운영 전 Neon 연결 필수**.

## 10. 결정 필요사항 (남은 것)

| # | 질문 | 기본안 |
|---|---|---|
| 1 | ~~1호 공급처~~ → **CJDropshipping 확정** (P0) | — |
| 2 | ~~1호 판매처~~ → **Coupang 확정** (P0). Wing 셀러 가입 + OpenAPI 키(vendorId/AccessKey/SecretKey) 발급은 사장님 명의 필요. 구매대행 판매를 위한 통신판매업 신고 여부도 확인 | 수령 전까지 모의 모드 |
| 3 | AI 리뉴얼 언어: Shopee(EN/현지어)·Qoo10(JA) — EN+JA 2개 동시 생성? | EN 우선, JA는 Qoo10 착수 시 |
| 4 | loyadbeta와 lexistyle 장기 통합 여부 | 당분간 분리 + HQ API 연동(D2) |
| 5 | Cafe24 발주/주문 쓰기용 OAuth 토큰 발급 상태? | 미발급 시 M5까지 모의 모드 |
| 6 | CJ/Superbuy 계정 개설 및 API 키 발급 (사장님 액션 필요) | 발급 전 커넥터는 목업 픽스처로 개발 |
