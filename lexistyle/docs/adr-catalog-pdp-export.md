# ADR: Catalog Index / PDP Documents / Export Jobs

**Status**: Accepted  
**Date**: 2026-07-19  
**Context**: CJ 전량 카탈로그를 `hq_state` JSON 스냅샷에 넣으면 O(N) 직렬화·응답 폭주·이미지 eager load가 발생한다.

## Decision

| Concern | Canonical store | Notes |
|---|---|---|
| 공급처 목록 메타 | `catalog_index` (Neon) | 제목·가격·카테고리·thumb URL 문자열만. 이미지 바이너리 금지 |
| Sync 진행 | `catalog_sync_runs` + `catalog_sync_checkpoints` | 페이지 청크·재개 |
| 선택 후 자산 | `asset_cache` | sharp WebP → Vercel Blob |
| 선택 Import | `import_jobs` | getProduct → assets → internal product |
| 브랜드 PDP | `content_documents` / `content_versions` | Gemini ruleset. HQ `listing_drafts`는 승인 projection |
| 채널 송출 | `export_jobs` | durable retry·idempotency. mock을 live로 위장 금지 |

## Anti-patterns (금지)

1. `/api/hq/state`에 `catalog_index` 전량 포함
2. 목록 UI에서 선택 전 `<img src=CJ>` 렌더
3. 공개 PDP/채널에 CJ 원본 URL 직접 게시
4. Git에 상품별 HTML 파일 커밋

## Rate limit

- 기본 2 rps (CJ 계정 등급에 맞게 `CJ_MAX_RPS`로 조정)
- 429 시 `Retry-After` 또는 exponential backoff
- Cron 1회 = checkpoint부터 `CATALOG_CRAWL_PAGES` (기본 5) 페이지만
- HQ **갱신** = 1페이지부터 빈 페이지까지 반복 스윕. `exhausted`이고 오류가 없을 때만 census prune
- prune: `import_state`가 `none`/`failed`면 인덱스 행 삭제, 그 외(queued/imported)는 `source_status=gone` (PDP/상품 원장은 유지)
- 해시 불변이어도 `sync_run_id`는 이번 스윕 id로 찍어야 census가 맞다

## Env

## Env

- `GEMINI_API_KEY`, `LEXI_PDP_MODEL` (기본 `gemini-2.0-flash`)
- `BLOB_READ_WRITE_TOKEN`
- `CJ_MAX_RPS`, `CATALOG_CRAWL_PAGES`
