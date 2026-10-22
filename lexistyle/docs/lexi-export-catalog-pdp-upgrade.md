# LEXI Export · Catalog · PDP 고도화 기획서

> 작성일: 2026-08-22 · 근거: 사용자 요구(6개 항목) + 기존 코드 실측 분석

---

## 0. 현황 진단 (코드 실측)

| 영역 | 현재 상태 | 근거 파일 |
|------|----------|-----------|
| 익스포트 페이지 | 상품번호 클릭 시 팝업 미구현. 제목/CTA만 편집 가능 | `src/components/admin/catalog-pipeline-panel.tsx` (export focus) |
| 익스포트 옵션·가격·기타정보 | `PublishInput`에 옵션/가격/기타정보 필드 **없음**. 가격은 `sellPriceUsd` 고정(29.9)로 하드코딩 | `src/lib/export/jobs.ts:97` · `src/lib/channels/types.ts` |
| 카탈로그 인덱스 | 카테고리 필터 **없음**, 50개 표시 **없음**, 페이지네이션은 cursor 방식만 | `src/app/api/hq/catalog/route.ts` · `src/lib/catalog/index-store.ts:231` |
| 임포트 버튼 | 인라인 버튼(플로팅 아님), 진행률 팝업 **없음**, 동기 처리 | `src/app/api/hq/catalog/import/route.ts` |
| PDP 생성 | **직렬 for-loop** (병렬 아님), 진행률 **없음**, `maxDuration=60` | `src/app/api/hq/pdp/route.ts` · `src/lib/pdp/generate.ts:89` |
| PDP 다중 미리보기 | 탭 토글 **없음** | PDP 문서 목록만 표시 |
| 판매처 어댑터 | coupang/shopee/lexi만 존재. **amazon 어댑터 없음**. 쿠팡/쇼피 모두 옵션·속성 미전송 | `src/lib/channels/adapters/*` · `src/lib/channels/registry.ts` |
| 동시 생성 오류(#5) | PDP 생성이 동기 직렬이므로, 두 요청이 겹치면 큐/watchdog 없이 충돌 가능 | `src/app/api/hq/pdp/route.ts` |

---

## 1. 목표

1. 익스포트 페이지에서 상품번호 클릭 → 해당 상품 페이지를 팝업으로 미리보기
2. 카탈로그 인덱스 → 카테고리별 필터, **50개씩 페이지네이션**, 상품 선택
   - 임포트 버튼을 **우하단 플로팅 버튼**으로 전환
   - 임포트 진행 중 → **개수·퍼센트 진행률 팝업**
3. PDP 상품페이지 생성 → **5개씩 천재병렬(concurrency=5)** 처리
   - 진행 중 각 작업별 상태와 퍼센트를 팝업으로 표시
4. PDP 다중 페이지 동시 생성 시 → **탭 토글 버튼**으로 전환하며 미리보기
5. **실검증**: 임포트된 상품 선택 후 생성 중, 다른 상품 생성이 겹칠 때의 오류 검증·수정
6. 익스포트 시 **옵션·가격·기타정보** 입력 가능
   - 쿠팡 / 호주아마존 / 쇼피 어댑터에 동일 입력이 전송되도록 연동

---

## 2. 아키텍처: 공통 잡 실행 엔진 (JobRunner)

6개 항목이 모두 **비동기 잡 + 진행률 + 병렬 제어**를 필요로 하므로, 공통 엔진을 먼저 설계한다.

### 2.1 공통 잡 모델 (모든 잡에 적용)

```ts
// src/lib/jobs/types.ts (신규)
export type JobProgress = {
  jobId: string;          // 서버 생성 uuid
  kind: "import" | "pdp" | "export";
  total: number;
  done: number;
  failed: number;
  percent: number;        // Math.round(done / total * 100)
  tasks: TaskProgress[];
  status: "queued" | "running" | "done" | "failed";
  createdAt: string;
  updatedAt: string;
};

export type TaskProgress = {
  refId: number;          // catalogId | documentId
  label: string;          // 상품명
  status: "queued" | "running" | "done" | "failed";
  percent: number;        // 개별 진행률 (예: Gemini 스트리밍)
  previewUrl?: string;    // 생성되면 미리보기 href (PDP 탭용)
  error?: string;
};
```

### 2.2 진행률 저장소·전송 방식

- **메모리 저장소** `globalThis.__lexiJobs: Map<jobId, JobProgress>` (로컬 파일 DB처럼 내구화는 v1에서 생략, 재시작 시 잡 소실 허용)
- **전송**: `POST /api/hq/jobs` 로 잡 시작 → **SSE(`/api/hq/jobs/:id/stream`)** 로 진행률 push
  - SSE 대안: 1.5초 폴링 `GET /api/hq/jobs/:id` (저비용 우선)
- **병렬 제어**: `pLimit(5)` 유틸(자체 구현, 의존성 불필요) 사용

### 2.3 API 라우트 추가

| 메서드 | 경로 | 역할 |
|--------|------|------|
| POST | `/api/hq/jobs` | `{ kind, targetIds[] }` → jobId 반환 |
| GET | `/api/hq/jobs/:id` | 진행률 폴링 |
| GET | `/api/hq/jobs/:id/stream` | SSE 진행률 (선택) |
| POST | `/api/hq/jobs/:id/cancel` | 취소 (선택) |

### 2.4 프론트 공통 컴포넌트

```tsx
// src/components/hq/JobProgressPopup.tsx (신규)
// - 진행률 팝업: 전체 퍼센트 + 작업별 리스트(상태 뱃지, 개별 %)
// - import용: "완료 n/total (x%)"
// - pdp용: 작업별 탭 토글(미리보기) 포함
// - 플로팅 진행버튼(진행 중 배지)을 우하단에 유지 → 클릭 시 팝업 열림
```

---

## 3. 페이즈 구성 (병렬 진행 가능하도록 독립 스트림 분리)

> 각 페이즈는 독립 파일·API를 추가해 충돌을 최소화한다. P1(공통) → P2~P6는 공통 기반 위에서 **병렬 작업** 가능.

### [P1] 공통 잡 엔진 · 진행률 기반 (선행)
**범위**: JobProgress 모델, 메모리 저장소, `/api/hq/jobs` API, `JobProgressPopup` 컴포넌트
**완료 기준**: 임의 잡 ID 생성/조회 API가 동작하고, 팝업에 퍼센트가 렌더된다.

- [ ] `src/lib/jobs/*` 신규 (types, store, runner)
- [ ] `src/app/api/hq/jobs/*` 신규 (POST/GET/stream)
- [ ] `src/components/hq/JobProgressPopup.tsx` 신규
- [ ] `pLimit(5)` 병렬 유틸 신규 (`src/lib/jobs/p-limit.ts`)

### [P2] 카탈로그 인덱스 고도화 (P1 기반, P3와 병렬 가능)
**범위**: 카테고리 필터 + 정확한 50개 페이지네이션 + 상품 선택 + 플로팅 임포트 버튼
**완료 기준**: 카테고리 탭 선택 시 해당 카테고리만 표시, 페이지당 50개, 페이지 버튼 동작, 우하단 플로팅 버튼으로 임포트 시작, 진행률 팝업 표시.

- [ ] `searchCatalog`에 `category?: string[]` 파라미터 추가 (`src/lib/catalog/index-store.ts`)
  - [`CategoryRow` 존재]: `categoryPath` 첫 요소 기준 매칭 + 인덱스
  - 카테고리 목록 집계: `GET /api/hq/catalog/categories`
- [ ] `GET /api/hq/catalog` query에 `category`, `page`, `pageSize(=50)` 추가 (cursor와 공존, page=1이 기본)
- [ ] `CatalogPipelinePanel`에 카테고리 탭 UI + 페이지네이션 UI 추가
- [ ] **플로팅 임포트 버튼**: `FloatingImportButton` (우하단 고정, 선택 개수 배지)
- [ ] Import 호출을 잡 엔진으로 전환: `POST /api/hq/jobs { kind:"import", targetIds }`
- [ ] `runImportMany`를 `pLimit(5)` 병렬로 전환 (`src/lib/catalog/import.ts`)
- [ ] 진행 중 → `JobProgressPopup` 표시 (완료 n/total, x%)

### [P3] PDP 생성 병렬 + 진행률 팝업 + 탭 토글 (P1 기반, P2와 병렬 가능)
**범위**: 5개씩 병렬 생성, 작업별 진행률 팝업, 탭 토글 미리보기
**완료 기준**: 5개 이상 선택 시 동시에 5개만 Gemini 호출, 각 작업별 % 표시, 완료된 문서는 탭으로 전환하며 미리보기 가능.

- [ ] `src/lib/pdp/generate.ts`에 **진행률 콜백** 추가
  - `generatePdpForCatalog(id, { onProgress })` — Gemini 호출 전 10%, 문서 저장 후 100%
  - (선택) Gemini stream을 받는다면 per-chunk 진행률
- [ ] `POST /api/hq/pdp` → 잡 엔진으로 전환 (`kind:"pdp"`), `pLimit(5)` 적용
  - 기존 동기 응답은 **하위호환 유지**: 잡 시작 후 `{ jobId }`를 반환하되, 클라이언트는 새 API 사용
- [ ] `JobProgressPopup` 확장: PDP 작업별 목록 + **탭 토글** (각 탭에서 `renderedHtml` iframe 미리보기)
- [ ] `GET /api/hq/pdp/:id/html` — 탭 미리보기용 HTML 조회 (문서 ID → renderedHtml)

### [P4] 익스포트 상품 팝업 미리보기 (P3 탭 토글 렌더링 재사용)
**범위**: 익스포트 페이지 상품번호 클릭 → 팝업으로 해당 상품 페이지 표시
**완료 기준**: 목록의 상품번호(또는 상품명)·링크 클릭 시 팝업 내 iframe으로 상품 페이지 표시.

- [ ] `GET /api/hq/pdp/:id/html` 재사용 → 익스포트 목록 각 행에 "👁 보기" 버튼
- [ ] `ProductPreviewModal` 컴포넌트 신규 (팝업 + iframe + 닫기)

### [P5] 익스포트 옵션·가격·기타정보 입력 + 판매처 연동 (P4와 병렬 가능)
**범위**: 익스포트 폼에 옵션/가격/기타정보 입력, `PublishInput` 확장, 쿠팡·아마존·쇼피 어댑터 전송
**완료 기준**: 옵션·가격·기타정보를 입력 후 전송 시, 각 어댑터의 API body에 해당 값이 포함된다(로컬 mock 응답 캡처로 검증).

- [ ] `src/lib/hq/types.ts`에 `Listing`/`ListingDraft` 확장:
  ```ts
  export type ListingOptions = {
    name: string;
    sku?: string;
    priceUsd?: number;
    stock?: number;
    attributes: Record<string, string>; // 색상/사이즈/재질 등
  };
  // ListingDraft에 options: ListingOptions[] 추가
  // Listing에 sellPriceUsd(override 가능), extraInfo: Record<string, string> 추가
  ```
- [ ] `PublishInput`에 `options`, `extraInfo`, `pricing` 포함되도록 확장 (`src/lib/channels/types.ts`)
- [ ] 익스포트 폼(`CatalogPipelinePanel` export 섹션)에 입력 영역 추가:
  - 옵션 테이블(이름·SKU·가격·재고·속성 key/value)
  - 판매가 override
  - 기타정보 key/value
- [ ] `POST /api/hq/export` body에 `options/pricing/extraInfo` 수용, `enqueueExport`를 통해 잡 엔진 연결
- [ ] **쿠팡 어댑터**: `seller-products` body에 옵션·속성 매핑
  - `items[].itemName/unitCount/requiredSellCount/품목속성(attribute)` 등 — 쿠팡 Wing 문서 확인 후 매핑 (스펙 §9.2)
- [ ] **쇼피 어댑터**: `add_item`에 `tier_variation`(옵션) + `item_sku` + `original_price` override 매핑
- [ ] **아마존 어댑터 신규**: `src/lib/channels/adapters/amazon.ts`
  - SP-API `createProduct`/Feed body: `item_name, price, variation(변형), attribute_sets` 매핑
  - env: `AMAZON_*` (호주 마켓플레이스 AUS) — 미설정 시 mock
  - `registry.ts`에 `amazonAdapter` 등록
  - HQ 채널 시드에 `amazon` 채널 추가 (`hq/store.ts`)
- [ ] 각 어댑터의 **테스트 스크립트**로 전송 body 캡처 검증

### [P6] 실검증 · 오류 수정 (P2~P5 완료 후 통합 검증)
**범위**: #5 동시 생성 오류 포함, 전체 회귀
**완료 기준**: 시나리오별 스모크 통과, 오류 재현 시 수정 완료.

- [ ] **#5 실검증**: 임포트된 상품 선택 → 상품페이지 생성 → 진행 중 다른 상품 생성이 겹치는 시나리오
  - 잡 엔진 도입으로 **요청별 독립 jobId** 보장 → 동시 생성 충돌 원인 제거 확인
  - Gemini 호출 5개 제한으로 같은 문서 중복 생성 방지(`catalogId` 기반 락) 확인
- [ ] 카탈로그 카테고리 필터 + 페이지네이션 회귀 (P2)
- [ ] PDP 병렬 + 탭 미리보기 회귀 (P3)
- [ ] 익스포트 팝업 + 옵션/가격/기타정보 전송 회귀 (P4·P5)
- [ ] `npm run build` 통과

---

## 4. 병렬 작업 매트릭스

```
P1 (선행 · 공통 엔진)
 │
 ├── P2 (카탈로그 인덱스+플로팅 임포트) ──┐
 │                                        ├── 병렬 진행 가능
 ├── P3 (PDP 병렬+탭)                 ──┘
 │
 ├── P4 (익스포트 팝업)      ──────────┐
 │                                     ├── 병렬 진행 가능
 └── P5 (옵션·가격·기타정보 연동) ──────┘
 │
 └── P6 (통합 실검증 + 오류수정)
```

- **동시 진행팀 배정 예시**
  - 팀 A: P2 (카탈로그/임포트)
  - 팀 B: P3 (PDP 병렬/탭)
  - 팀 C: P4 (익스포트 팝업)
  - 팀 D: P5 (판매처 연동 — 쿠팡/쇼피/아마존)
  - 통합 브랜치에서 각자 독립 파일만 수정 (충돌 최소화)

---

## 5. 파일 변경 요약

### 신규
| 파일 | 목적 |
|------|------|
| `src/lib/jobs/types.ts` | JobProgress/TaskProgress 타입 |
| `src/lib/jobs/store.ts` | 메모리 잡 저장소 |
| `src/lib/jobs/runner.ts` | pLimit 병렬 실행기 |
| `src/lib/jobs/p-limit.ts` | 5개 동시 실행 유틸 |
| `src/app/api/hq/jobs/route.ts` | 잡 시작(POST) |
| `src/app/api/hq/jobs/[id]/route.ts` | 진척 조회(GET) |
| `src/app/api/hq/jobs/[id]/stream/route.ts` | SSE (선택) |
| `src/components/hq/JobProgressPopup.tsx` | 진행률 팝업 공통 |
| `src/components/hq/ProductPreviewModal.tsx` | 상품 페이지 팝업 |
| `src/components/hq/FloatingImportButton.tsx` | 우하단 플로팅 임포트 버튼 |
| `src/app/api/hq/catalog/categories/route.ts` | 카테고리 목록 |
| `src/lib/channels/adapters/amazon.ts` | 아마존(호주) 어댑터 |
| `scripts/verify-export-fields.ts` | 옵션/가격/기타정보 전송 검증 |

### 수정
| 파일 | 변경 |
|------|------|
| `src/lib/catalog/index-store.ts` | `category`, page/offset 검색 파라미터 |
| `src/lib/catalog/import.ts` | pLimit 병렬화, 진행 콜백 |
| `src/app/api/hq/catalog/route.ts` | category/page/pageSize 쿼리 |
| `src/app/api/hq/catalog/import/route.ts` | 잡 엔진 연동 |
| `src/app/api/hq/pdp/route.ts` | 잡 엔진 연동 (병렬 5) |
| `src/lib/pdp/generate.ts` | 진행률 콜백 |
| `src/components/admin/catalog-pipeline-panel.tsx` | 카테고리 탭/페이지네이션/플로팅 임포트/익스포트 폼/팝업 |
| `src/lib/export/jobs.ts` | options/pricing/extraInfo 전달, 잡 진행률 |
| `src/app/api/hq/export/route.ts` | body 확장 |
| `src/lib/channels/types.ts` | PublishInput 확장 |
| `src/lib/hq/types.ts` | ListingOptions/extraInfo 추가 |
| `src/lib/channels/adapters/coupang.ts` | 옵션·속성 매핑 |
| `src/lib/channels/adapters/shopee.ts` | tier_variation/SKU/가격 override |
| `src/lib/channels/registry.ts` | amazon 등록 |
| `src/lib/hq/store.ts` | amazon 채널 시드 추가 |
| `src/lib/hq/overview.ts` | amazon 채널 헬스 추가 |

---

## 6. 우선순위·리스크

| 리스크 | 대응 |
|--------|------|
| Next.js `maxDuration=60` 제한 | 잡을 요청과 분리(메모리 store)해 제한 회피. 단, 서버리스 환경에선 인스턴스 수명 이슈 → v2에서 DB 영속화 |
| Gemini 병렬 호출 rate limit | `pLimit(5)` + `rate-limit.ts` 재사용 |
| 옵션·가격 스키마의 판매처별 차이 | 어댑터별 매핑 함수 분리, mock 캡처 테스트로 계약 고정 |
| 스냅샷에 남은 채널 | P5에서 amazon 추가 시 `migrateChannels`와 충돌 없이 병합 |
| #5 동시 생성 | 잡 엔진의 jobId 기반 비동기 분리로 원천 해소. 단 catalogId 중복 생성 방지용 in-flight 락 추가 |

---

## 7. 완료 정의 (Definition of Done)

- [ ] `npm run build` 통과
- [ ] P2: 카테고리 필터 + 50개 페이지네이션 + 플로팅 임포트 진행률 팝업 동작
- [ ] P3: 5개 병렬 PDP 생성 + 작업별 % + 탭 토글 미리보기 동작
- [ ] P4: 익스포트 상품번호 클릭 → 팝업 미리보기 동작
- [ ] P5: 옵션·가격·기타정보 입력 → 쿠팡/아마존/쇼피 어댑터 body 매핑 검증
- [ ] P6: #5 동시 생성 실검증 통과 + 전체 스모크