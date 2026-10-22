# LEXI 카테고리 3단 택소노미

> 정본 코드: `src/lib/catalog/category-taxonomy.ts`  
> 부서 UI: `src/lib/departments.ts`  
> CJ 원장: `src/lib/catalog/cj-categories.ts`

## 계층

| 층 | 역할 | 값 |
|----|------|-----|
| **L1 스토어 GNB** | 고객 최상단 | Beauty · Fashion · Life · Kids (+ Brands/Trend/Best/Sale/Look = 큐레이션 레일, 택소노미 아님) |
| **L2 대시보드** | HQ·몰 진열 단위 | `beauty` / `fashion` / `life` / `kids` |
| **L3 CJ** | 소싱·상품 원장 `products.category` / `catalog_index` | CJ 14종 id |

상품 저장은 항상 **L3(CJ id)**. 몰 `/category/{L2}` 는 L2→L3 펼침 필터.

## 배치표 (L2 ← L3)

| 대시보드 (L2) | CJ id (L3) | CJ 한글 |
|---------------|------------|---------|
| beauty | `beauty` | 건강, 미용 및 헤어 |
| fashion | `women-clothing`, `men-clothing`, `bags-shoes`, `jewelry` | 여성 의류 · 남성 의류 · 가방 및 신발 · 보석 및 시계 |
| life | `home-garden`, `pet`, `sports`, `electronics`, `home-improve`, `auto`, `phones`, `computers` | 홈가든 · 애완 · 스포츠 · 가전 · 주택개량 · 자동차 · 휴대폰 · 컴퓨터 |
| kids | `kids` | 장난감, 어린이 및 유아용품 |

## 쇼핑몰 표시

- URL: `/category/fashion` → fashion에 묶인 L3 상품 전부
- 칩: `?cj=women-clothing` 로 L3 단일 필터
- 픽커: 좌측 L2 4개, 우측 L3(+서브아이콘)

## HQ

- Catalog/Import 카테고리 버튼은 **L3(CJ)** 유지 (소싱용)

## CJ leaf 이식 (DB 원장)

CJ 실카테고리(leaf)를 LEXI 쇼핑몰 카테고리로 이식한다 (2026-10).

- 테이블: `category_cj_leaves` — `cj_leaf` ↔ `catalog_index.category_path[1]`, `bucket_slug`(LEXI 버킷) · `department` · `label_ko` · `product_count`
- 빌드: `npm run db:build:category-map` (로컬 PG) / `npm run db:build:category-map -- --neon`
  - 매핑 순서: 수기 override → 큐레이션(`LEXI_CJ_BUCKETS.cjChips`) → 자동(`mapCategorySlug`) → 미분류(`unmapped`)
  - leaf 한글 라벨: `src/lib/catalog/cj-leaf-ko.ts` (없으면 영문 leaf 그대로)
- 스토어프론트 `/category/{dept}` (DB 모드):
  - 칩 2단 = LEXI 버킷 칩 + **CJ 하위분류 칩**(`dbLeafDefsForDept`, 라이브 카운트)
  - `?leaf=<CJ leaf>` → `listProductsPage({ leaf })` → `catalog_index` leaf 검색, 표시가 `computeSellPrice((원가+20)×1.3)`
- 동기화: `scripts/sync-local-to-neon.mjs` 의 DEFAULT_TABLES 에 포함 (크롤 → `db:build:category-map` → `db:sync:neon` 순서 권장)
- PG 배열은 1-based: `category_path[1]` 이 leaf (`searchCatalog`/`cjCanonicalSql` 동일)
