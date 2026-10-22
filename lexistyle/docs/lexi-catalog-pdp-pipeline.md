# LEXI Catalog → Gemini PDP → Export Pipeline

실행 체크리스트. 상세 ADR: [adr-catalog-pdp-export.md](./adr-catalog-pdp-export.md)

## P0 Contract
- [x] ADR
- [x] CJ Zod schemas (`src/lib/catalog/cj-schema.ts`)
- [x] Rate limiter (`src/lib/catalog/rate-limit.ts`)
- [x] Env keys in `.env.example`

## P1 Catalog index
- [x] Tables + memory fallback
- [x] Checkpoint crawl worker
- [x] `GET /api/hq/catalog` search
- [x] Console catalog tab (no eager images)

## P2 Import + assets
- [x] Import jobs
- [x] sharp WebP + Blob/fallback
- [x] Console Import action

## P3 Gemini PDP
- [x] Ruleset + Gemini provider
- [x] `content_documents` write
- [x] Storefront render path

## P4 Edit
- [x] PATCH document + batch edit API
- [x] Console editor

## P5 Export
- [x] `export_jobs` + worker
- [x] LEXI / Coupang / Cafe24 / Alibaba package

linkrcode 3P와 채널 투영: [lexi-linkrcode-pdp-syndication.md](./lexi-linkrcode-pdp-syndication.md)
