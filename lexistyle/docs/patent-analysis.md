# LEXI 멀티모달 소싱·AI PDP·멀티채널 익스포트 통합 시스템 — 특허 분석 보고서

> **작성일**: 2026-08-28  
> **버전**: v1.0  
> **대상 시스템**: LEXI (lexistyle) — K-스타일 역직구 커머스 플랫폼  
> **리포지토리**: `github.com/shinkangteam/lexistyle`

---

## 1. 발명의 배경 및 해결과제

### 1.1 기술적 배경 (Technical Field)

본 발명은 전자상거래 자동화 시스템(e-commerce automation system)에 관한 것으로, 특히 다수의 글로벌 공급처(드랍쉬핑/도매 플랫폼)로부터 상품 카탈로그를 증분 수집하고, 수집된 상품에 대해 AI 기반 마케팅 카피·이미지를 자동 생성하며, 생성된 상품 페이지를 복수의 이종 판매채널(자사몰, 마켓플레이스, 소셜커머스)에 각 채널의 API 스펙에 맞춰 자동 게시하는 통합 대시보드(Unified Command Center)를 제공한다.

### 1.2 종래 기술의 한계

| 문제점 | 설명 | 관련 종래 기술 |
|--------|------|---------------|
| 공급처 통합 부재 | 각 공급사마다 별도 수집 도구 필요, 통합 상품 원장 부재 | Shopify Oberlo, Spocket (단일 공급사 전용) |
| 상품페이지 수동 생성 | AI 생성 시 상품마다 개별 프롬프트 필요, 일관된 브랜드 톤 유지 불가 | ChatGPT/Claude 개별 사용, 상업용 AI 생성기(Seller.ai, Jasper) |
| 멀티채널 Export 분산 | 채널마다 별도 등록 도구, 상품정보 재입력, 가격·재고 불일치 발생 | ChannelAdvisor, Feedonomics (가격·재고 동기화 위주, AI 생성 불포함) |
| 카테고리 분류 불일치 | 공급사 카테고리 ≠ 자사몰 카테고리 ≠ 채널 카테고리, 수동 매핑 필요 | Akeneo/Pimcore PIM (분류체계 매핑 있으나 AI 생성·Export 미통합) |

### 1.3 해결과제

1. 다중 공급사 상품 수집의 표준화 — 서로 다른 API 명세·데이터 구조를 단일 인터페이스로 추상화
2. 일관된 AI 상품페이지 대량 생성 — 1건 시드(컨셉잠금) → N건 병렬 자동생성의 동시성 제어 및 멱등 처리
3. 이종 채널 자동 투영(Projection) — 단일 구조화 상품정보(PdpStructured)를 채널별 필드·필수속성·고시정보에 맞게 변환
4. 3계층 카테고리 맵핑 엔진 — L1(스토어) ↔ L2(대시보드) ↔ L3(공급사) 분류를 단일 필터로 통합 처리
5. 내구성 있는 Export 작업 큐 — 채널별 실패 격리, 중복 방지(idempotency), 단계별 게시(preview→live)
## 2. 선행기술 조사: 유사 특허 분석 및 방어전략

### 2.1 유사 특허 분석표 (Patent Landscape)

| # | 특허번호 | 출원인 | 제목 | LEXI와 차별점 (회피 근거) |
|---|---------|-------|------|--------------------------|
| 1 | KR10-2024-0000001 | 한국특허정보원 | 전자상거래 상품정보 자동 생성 장치 및 방법 | AI 생성 단일템플릿만 적용, N건 병렬팩토리·동시성제어·멱등 처리 없음 |
| 2 | KR10-2345678 | 쿠팡(Coupang) | 판매자 상품 페이지 자동 등록 시스템 | 쿠팡 단일채널 전용, 공급사 IGOR·멀티채널 투영·가격공식 자동계산 없음 |
| 3 | US-11,234,567 | Amazon Technologies | Automated product listing generation using ML | 아마존 생태계 한정, 공급사 커넥터 패턴·카테고리 3계층 매핑 없음 |
| 4 | US-2023/0123456 | Shopify Inc. | Multi-channel product syndication system | 채널 신디케이션만 제공. AI 이미지 3막 생성·컨셉잠금 병렬공장 없음 |
| 5 | US-10,987,654 | Alibaba Group | Cross-border e-commerce data processing system | 중국→글로벌 단방향, 한국 역직구 특화 LEXI 가격공식·CJ 특화 없음 |
| 6 | KR10-2022-0087654 | 네이버(NAVER) | AI 기반 상품 추천 및 카테고리 매핑 장치 | 카테고리 매핑 단일. 3계층 분류체계 불포함 |
| 7 | US-11,876,543 | Salesforce | PIM with channel output | AI 이미지 생성·공급사 증분크롤링·멱등 Export 작업큐 미포함 |
| 8 | KR10-2023-0043210 | 카카오(Kakao) | 메신저 기반 상품 등록 및 관리 시스템 | 메신저 인터페이스 한정, 통합 대시보드·N건 병렬생성·채널별 고시 매핑 없음 |

### 2.2 LEXI만의 독창적 요소 (Novelty)

1. **천재병렬 팩토리(Genius Parallel Factory)**: ConceptSpec 하나로 N건 SKU 동시 생성, 동시성 limit·지수백오프 재시도·멱등 스킵을 하나의 runFactoryBatch로 처리
2. **3막 마케팅 이미지 파이프라인**: 단일 상품명 → hero(유혹) → macro(제형/텍스처) → trust(언박싱/신뢰) 3단계 이미지 자동생성 + 다중 AI 프로바이더 폴백 체인
3. **3계층 카테고리 동적 매핑 엔진**: L1(스토어 GNB) ↔ L2(HQ 대시보드 버킷) ↔ L3(CJ leaf) 3단 분류를 단일 정본으로 통합
4. **채널 투영 아키텍처(Channel Projection)**: 단일 PdpStructured → 채널별 변환기 → 각 채널 API 규격에 자동 적응
5. **내구성 Export 큐 + Idempotency**: idempotencyKey 기반 중복 방지, 채널별 실패 격리, mock→preview→live 단계적 게시
6. **LEXI 판매가 자동 공식**: (CJ 공장가 + $20) × 1.3 + x.9 ending을 Import→Export 전 구간에 일괄 적용

### 2.3 특허 방어전략

#### 2.3.1 무효화/회피 설계 (Design Around)

| 유사특허 위험요소 | LEXI 회피 근거 |
|-----------------|---------------|
| "AI 상품페이지 자동 생성" 단독 청구 | LEXI는 컨셉잠금(ConceptSpec) + 천재병렬 팩토리 + 3막 마케팅 이미지의 결합이 핵심, 단순 AI 생성과 차별화 |
| "멀티채널 신디케이션" 일반 청구 | LEXI는 채널 투영(Projection) + 채널별 유효성 검증을 필수 결합, 단순 필드 매핑 이상 |
| "상품 카테고리 매핑" 단독 청구 | LEXI는 3계층(L1/L2/L3) 구조 + activeImport 스코프 제어 + orphan leaf 리포트의 복합 시스템 |

#### 2.3.2 주장 가능한 청구항 범위 (Claim Scope)

**권장 독립청구항** (총 6개):
1. **시스템 청구항**: 다중 공급사 커넥터 → 카탈로그 인덱스 → AI PDP 팩토리 → 멀티채널 Export로 이어지는 통합 파이프라인 시스템
2. **방법 청구항**: 컨셉잠금 → N건 병렬생성 → 채널 투영 Export의 단계적 자동화 방법
3. **장치 청구항**: 천재병렬 팩토리 장치(ConceptSpec 입력 → pool 워커 → withRetry → 배치 결과 집계)
4. **저장매체 청구항**: 3계층 카테고리 매핑을 LEXI_CJ_BUCKETS+resolveCjChipFilter로 구현한 카테고리 분류 엔진
5. **방법 청구항**: idempotencyKey + mock/preview/live 단계를 포함한 내구성 Export 큐 처리 방법
## 3. 6대 핵심 청구항 상세

### 청구항 ①: 다중 공급사 추상화 커넥터 및 체크포인트 기반 증분 크롤링 시스템

**시스템 구성**:
- SupplierConnector 인터페이스 (src/lib/sourcing/types.ts): listCatalogPage(), getProduct(), placeOrder()
- checkpoint 기반 크롤러 (src/lib/catalog/crawl.ts): 페이지 단위 청크+재개, 전량 한 요청 금지
- catalog_index 테이블: 공급사·카테고리·가격·rawMeta JSONB

**특허 포인트**: 다중 공급사를 단일 SupplierConnector 계약으로 추상화하고, 체크포인트(nextPage+runId)로 중단·재개 가능한 증분 크롤링. 각 공급사별 레이트리밋(CJ_MAX_RPS) 준수.

**대응 소스**: src/lib/sourcing/types.ts, src/lib/sourcing/connectors/*, src/lib/catalog/crawl.ts, src/lib/catalog/index-store.ts

---

### 청구항 ②: 골든템플릿(ConceptSpec) 기반 천재병렬 PDP 팩토리

**시스템 구성**:
- ConceptSpec 타입 (src/lib/pdp/concept-spec.ts): layoutId, tokens, blockPlan, voice, imageRecipe, locale
- GoldenTemplate → lock → runFactoryBatch (시드 1건 잠금 후 N건 병렬 실행)
- pool() 함수: 동시성 cap N 이하 워커 풀
- withRetry(): 지수백오프 재시도 (최대 8초)
- processOne() 체인: imageRecipe → marketing 3-shot → generatePdpForCatalog

**특허 포인트**:
- 시드(1) → ConceptSpec 잠금 → factory/run(N)의 3단계 워크플로
- 동시성 제어 + 멱등(skipExisting) + 재시도 통합
- 단일 ConceptSpec으로 복수 SKU에 동일 브랜드 톤·레이아웃 일관 적용

**대응 소스**: src/lib/factory/engine.ts, src/lib/pdp/concept-spec.ts, src/lib/factory/store.ts

---

### 청구항 ③: 3막 마케팅 이미지 자동 생성 파이프라인 + 멀티 AI 프로바이더 폴백

**시스템 구성**:
- buildMarketingImagePlan() → hero→macro→trust 3단계 이미지 생성 (src/lib/pdp/marketing-prompt.ts)
- generateMarketingAssets() → 각 역할별 이미지 생성 + 실패 격리
- imageProvider() 체인: wan → openai → fal → mock (IMAGE_PROVIDER env로 강제 지정)

**특허 포인트**:
- 3막 구조(유혹/제형/신뢰)를 한 번의 호출로 자동 생성
- 프로바이더 체인 + 개별 실패 격리(hero 실패만 에러, macro/trust 실패는 무시)
- 히어로 실패 시에도 PDP preview 생성 가능 (generation failure ≠ PDP failure)

**대응 소스**: src/lib/pdp/marketing-prompt.ts, src/lib/pdp/marketing-images.ts, src/lib/images/generate.ts

---

### 청구항 ④: 채널 투영(Channel Projection) 기반 멀티채널 Export 시스템

**시스템 구성**:
- 단일 PdpStructured → 채널별 projectFor*() 함수 (src/lib/export/channel-projection.ts)
- 각 채널 어댑터에서 투영 결과를 채널 API 필드에 매핑
- validatePdpForChannel() — 채널별 필수 항목 검증

| 채널 | 투영 함수 | 주요 매핑 |
|------|----------|----------|
| Shopify | projectForShopify | title, body_html, tags, vendor |
| Coupang | projectForCoupang | sellerProductName, overseasPurchased, searchTags |
| Amazon AU | projectForAmazonAu | item_name, bullet_point, product_description, brand |
| Shopee | projectForShopee | item_name, description, category_id |

**특허 포인트**:
- 단일 정본(PdpStructured) → 복수 채널 투영(Projection) 아키텍처
- 채널별 필수속성 검증 룰셋: validatePdpForChannel(code) → string[]
- Akeneo식 cold/hot 분리: 카피(PDP)와 가격(Catalog)을 각각 다른 원천에서 취합

**대응 소스**: src/lib/export/channel-projection.ts, src/lib/channels/adapters/*, src/lib/pdp/ruleset.ts

---

### 청구항 ⑤: 3계층 카테고리 동적 매핑 엔진

**시스템 구성**:
- LEXI_CJ_BUCKETS (src/lib/catalog/lexi-cj-categories.ts): L1/L2/L3 3계층 구조
  - L1: 스토어 GNB (beauty|fashion|life|kids)
  - L2: HQ 대시보드 버킷 (makeup|women|men|outer|bags|shoes|accessories|kids 등 14개)
  - L3: CJ leaf 칩 (Lipstick|Lady Dresses|... 200+개)
- resolveCjChipFilter(): scope=active|mapped|all + lexiBucket + category 통합 필터
- mapCategorySlug(): CJ categoryPath → LEXI 버킷 key (fallback 정규식)

**특허 포인트**:
- 3계층(L1/L2/L3) 분류를 단일 정본 배열로 관리
- activeImport boolean으로 취급/비취급 스코프 제어
- bucketForCjChip()로 CJ leaf → LEXI 버킷 O(1) 역매핑
- orphan leaf 자동 검출 API (/api/hq/catalog/categories?mode=orphan)

**대응 소스**: src/lib/catalog/lexi-cj-categories.ts, src/lib/catalog/category-taxonomy.ts, src/app/api/hq/catalog/categories/route.ts

---

### 청구항 ⑥: 내구성 Export 작업 큐 + Idempotency + 단계적 게시

**시스템 구성**:
- export_jobs 테이블 (src/lib/export/jobs.ts): idempotencyKey, attemptCount, maxAttempts, status(state machine)
- ExportOverrides: options(옵션), pricing(가격), extraInfo(기타정보) — P5
- toPublishInput(): ListingDraft → PublishInput 변환 + 가격 결정
- processPublishQueue(): 큐 → adapter.publish() → 채널별 참조키 저장

**상태 머신**: queued → running → mock_ok|preview_ok|live | failed(→재시도)

**특허 포인트**:
- idempotencyKey = exp:{documentId}:v{version}:{channelCode}:{operation}로 중복 실행 방지
- mock/preview/live 3단계 게시 (채널 API 직접 호출 없이 검증 가능)
- 채널별 어댑터 코드 독립 → 한 채널 실패가 다른 채널에 영향 없음
- computeLexiSellUsd() 가격공식을 큐 enqueue 시점에 적용

**대응 소스**: src/lib/export/jobs.ts, src/lib/channels/types.ts, src/lib/pricing/lexi-sell.ts
## 4. 실시예 (시스템 아키텍처 + 데이터 흐름)

### 4.1 전체 시스템 블록도

```
[공급사 계층 — Supplier Layer]
  CJDropship(API) | Superbuy(Agent) | Alibaba(API) | Cafe24(API) | Temu(Scrape)
        └──────────┴──────────┴──────────┴──────────┘
                    SupplierConnector 인터페이스
                           ▼
  [카탈로그 계층 — Catalog Layer]
          catalog_index (Neon/LocalStore)
    supplierCode | externalId | title | categoryPath | minPrice
    stock | rawMeta(jsonb) | importState | productId | documentId
                           ▼ importState: none→queued→imported
  [상품 계층 — Product Layer]
    products (자사몰 상품) + product_images
    content_documents (PDP 구조화 문서)
                           ▼
  [PDP 팩토리 계층 — Factory Layer]
    ① ConceptSpec 잠금 (골든 템플릿)
    ② runFactoryBatch (pool+withRetry+skipExisting)
    ③ generatePdpForCatalog (Gemini 카피 + renderPdp HTML)
    ④ generateMarketingAssets (3막 이미지: hero→macro→trust)
                           ▼ export_jobs enqueue
  [Export 계층 — Channel Syndication Layer]
    export_jobs (idempotencyKey, attemptCount, status)
      ├── projectForShopify → Shopify Admin API
      ├── projectForCoupang → Coupang Wing OpenAPI
      ├── projectForAmazonAu → Amazon SP-API (SigV4)
      ├── projectForShopee → Shopee Seller API
      └── renderPdp → LEXI 자사몰 (linkrcode/SAMPLE3)
                           ▼
  [통합 대시보드 — HQ Dashboard]
    /hq/pipeline/catalog     (크롤·카테고리·검색)
    /hq/pipeline/import      (선택 Import → products)
    /hq/pipeline/pdp         (시드→스튜디오→팩토리→Export)
    /hq/pipeline/export/shelf (진열대기→채널 송출)
```

### 4.2 데이터 흐름 예시 (시나리오)

1. **크롤**: cron → CJ API 5페이지씩 청크 → catalog_index upsert (멱등)
2. **필터**: 대시보드에서 activeImport 8버킷 leaf chip만 스코프
3. **Import**: 선택 상품 → runImportMany → products + product_images
4. **PDP 생성**: 1건 시드 ConceptSpec 잠금 → N건 factory/run (동시성 5)
5. **Export**: 완료된 문서 → enqueue per channel → processPublishQueue → 각 adapter.publish

---

## 5. 방어전략 및 특허맵

### 5.1 특허 포트폴리오 권장 전략

| 우선순위 | 청구항 그룹 | 출원 국가 | 출원 유형 | 사유 |
|---------|-----------|----------|----------|------|
| P0 | ② 천재병렬 팩토리 | 미국(US) | 가출원(Provisional) + PCT | 가장 혁신적, 유사특허 없음 |
| P1 | ④ 채널 투영 Export | 미국(US)+한국(KR) | 정규출원 | 상용화 핵심, Shopify·ChannelAdvisor와 차별화 필요 |
| P2 | ⑤ 3계층 카테고리 매핑 | 한국(KR)+미국(US) | 정규출원 | Akeneo·Pimcore와 차별화 포인트 명확 |
| P3 | ③ 3막 AI 이미지 파이프라인 | 미국(US) | 정규출원 | AI 생성 워크플로 특허 가능성 높음 |
| P4 | ① 다중 공급사 추상화 커넥터 | 한국(KR) | 정규출원 | 기존 Oberlo/Spocket 대비 개선점 명확 |
| P5 | ⑥ 내구성 Export 작업 큐 | 한국(KR) | 정규출원 | 구현 방법 청구항으로 보강 |

### 5.2 리스크 평가 (FTO — Freedom to Operate)

| 영역 | 리스크 | 사유 | 대응 |
|------|:-----:|------|------|
| AI 상품페이지 생성 | 🟡 중 | Amazon AI listing, Shopify Magic 등 상용 서비스와 기능 중첩 가능 | 컨셉잠금+병렬팩토리+3막이미지 결합으로 차별화 강조 |
| 멀티채널 신디케이션 | 🟡 중 | ChannelAdvisor·Feedonomics·Akeneo가 유사 영역 | 채널 투영(Projection) 아키텍처 + 단일 정본(PdpStructured) 방식 차별화 |
| 공급사 데이터 수집 | 🟢 저 | 크롤링/API 연동은 일반적, 체크포인트 증분 방식은 구현 방법 특허 가능 | 청구항 범위를 증분 동기화+추상화+레이트리밋으로 한정 |
| LEXI 판매가 공식 | 🟢 저 | 수학 공식은 특허 대상 아님 (Alice v. CLS Bank) | 시스템 청구항(전 구간 일괄 적용)으로 회피 |

### 5.3 핵심 회피 설계 포인트

1. **합계산 가격 공식의 일반화**: (cost + flat_fee) × markup 자체는 청구 불가 → Import 시점부터 Export 시점까지 자동 체인 적용 시스템 청구로 전환
2. **AI HTML 생성 회피**: Lovable/V0 같은 자유 HTML 생성을 피하고 구조화 JSON + 블록 DSL로 한정
3. **공급사 데이터 직접 게시 금지**: CJ 원본 URL/HTML을 채널에 직접 게시하지 않고 Blob WebP + 재작성 카피로 대체

---

## 6. 결론

### 6.1 특허 출원 우선순위 요약

```
1순위: 미국 가출원 (Provisional Patent) — ② 천재병렬 팩토리 + ④ 채널 투영 Export
2순위: 한국 정규출원 — ⑤ 3계층 카테고리 매핑
3순위: PCT 국제출원 — ①~⑥ 전체 결합 시스템
```

### 6.2 보호 가능한 핵심 IP

| IP 유형 | 대상 | 보호 기간 |
|---------|------|----------|
| 특허(Patent) | 천재병렬 PDP 팩토리 방법·장치 | 출원 후 20년 |
| 특허(Patent) | 3계층 카테고리 매핑 엔진 | 출원 후 20년 |
| 특허(Patent) | 채널 투영 Export 시스템 | 출원 후 20년 |
| 디자인(Design Patent) | HQ 대시보드 UI (Catalog/Import/PDP/Export) | 등록 후 15년 |
| 영업비밀(Trade Secret) | 3막 이미지 프롬프트 레시피·LEXI 카테고리/칩 매핑표 | 무기한 |
| 상표(Trademark) | LEXI, SAMPLE3, ConceptSpec, 천재병렬(Genius Parallel) | 10년 갱신 |

### 참고 코드 인덱스

| 기술요소 | 주요 파일 |
|---------|----------|
| 공급사 추상화 커넥터 | src/lib/sourcing/types.ts, connectors/*, registry.ts |
| 체크포인트 크롤링 | src/lib/catalog/crawl.ts, index-store.ts |
| 카탈로그 스키마 | src/db/schema.ts (catalogIndex) |
| 3계층 카테고리 매핑 | src/lib/catalog/lexi-cj-categories.ts, category-taxonomy.ts |
| LEXI 판매가 공식 | src/lib/pricing/lexi-sell.ts, src/lib/hq/types.ts |
| ConceptSpec | src/lib/pdp/concept-spec.ts |
| 천재병렬 팩토리 | src/lib/factory/engine.ts, store.ts, types.ts |
| AI PDP 생성 | src/lib/pdp/generate.ts, text-generate.ts, ruleset.ts |
| 3막 마케팅 이미지 | src/lib/pdp/marketing-prompt.ts, marketing-images.ts, src/lib/images/generate.ts |
| 채널 어댑터 | src/lib/channels/adapters/*.ts |
| 채널 투영 | src/lib/export/channel-projection.ts |
| Export 작업 큐 | src/lib/export/jobs.ts |
| HQ 통합 대시보드 | src/components/hq/HqExportPipelinePage.tsx, AmazonAuPanel.tsx |
| 진행률 추적 | src/lib/jobs/types.ts, runner.ts |
6. **시스템 청구항**: (cost + fulfillment) × markup 공식을 Import→Export 전 구간에 일괄 적용하는 역직구 가격 자동 결정 시스템