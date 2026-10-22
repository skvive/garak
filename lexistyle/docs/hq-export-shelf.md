# HQ Export 진열대기 (shelf)

## 흐름

1. **PDP** `/hq/pipeline/pdp` — 생성 문서 선택 → `POST /api/hq/export/shelf` `{ documentIds }` → stage `crafted`
2. **Export** `/hq/pipeline/export`
   - A `crafted` 제작목록
   - B `priced` 옵션·가격 (`computeSellPrice`, 재고 기본 10, CJ variants `/api/hq/catalog/:id/options`)
   - C `shelf` 진열대기 → 채널 송출 `enqueueExport` + `processExportQueue`
3. **판매채널** `/hq/channels` — 카드 KPI `진열대기 / 판매중 / 판매중지` (`listingStats`), 팝업에서 **실대시보드 열기**

## Neon 스키마

`export_shelf` 테이블은 `npm run db:push` 또는 `node scripts/_migrate-export-shelf.mjs` 로 생성.
Neon 전송 쿼터 초과 시 shelf는 로컬/메모리 폴백으로 동작한다.
한글 제목은 `searchable_text` + `translateProductTitleKo` (컬럼 `title_ko`는 쿼터 회복 후 선택 추가).

## API

| Method | Path | 역할 |
|--------|------|------|
| GET/POST | `/api/hq/export/shelf` | 목록 / crafted enqueue · promote · export |
| PATCH | `/api/hq/export/shelf/:id` | 가격·옵션 확정 |
| GET | `/api/hq/catalog/:id/options` | CJ variants 캐시 |
| GET | `/api/hq/channels/:code/listing-stats` | 채널 KPI 새로고침 |
| GET | `/api/hq/sales-channels` | 카드 + `listingStats` + `dashboardUrl` |
