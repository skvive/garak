# Neon DB 마이그레이션 (2026-08-26)

## 배경
- 구 프로젝트 `ancient-sun-32389962` — data transfer quota(402)로 조회·복제 불가
- Cursor Neon MCP는 `org-red-cake-60363177` 조직 멤버가 아니어서 해당 org에 프로젝트 자동 생성 불가

## 신규 프로젝트 (운영 중)
| 항목 | 값 |
|------|-----|
| Project ID | `still-paper-36573151` |
| Org | `org-wispy-brook-68991240` (강) |
| Branch | `main` / `br-lucky-pond-azlehiow` 대체 |
| Console | https://console.neon.tech/app/projects/still-paper-36573151 |

## 완료 작업
1. `drizzle-kit push` — 전체 스키마 적용
2. Vercel Production `DATABASE_URL` → 신규 pooled URL
3. `site_settings.data_mode = real` 시드
4. Production 재배포 — `/api/hq/overview` 200 확인

## 데이터
- 구 DB는 402로 **행(row) 복제 불가** — 카탈로그·Import·PDP는 **재수집/재Import** 필요
- `node scripts/import-active-scope.mjs` 로 active 버킷 Import 재개

## org-red-cake로 옮기려면
1. [org-red-cake 프로젝트](https://console.neon.tech/app/org-red-cake-60363177/projects)에서 `lexistyle` 생성
2. Connection string(pooled) 복사
3. `vercel env add DATABASE_URL production --force` 로 교체
4. `npm run db:push` (신규 URL 기준)
5. **dbd** 리포 Vercel `DATABASE_URL`도 동일하게 갱신 (공유 DB)

## 스크립트
- `scripts/neon-migrate-test.mjs` — OLD/NEW 연결 테스트 (`.env.migrate.local`, gitignore)
- `scripts/verify-women-channel-export.mjs` — 채널 익스포트 실검증

## 재적재·실검증 (2026-08-26)
| 단계 | 결과 |
|------|------|
| Crawl | +5000 upsert (누적 인덱스 재구축) |
| Import | active scope 재Import 진행 (여성패션 imported ≥137) |
| PDP ×10 | 성공 · engine=`template` (GEMINI_API_KEY 미설정) |
| Coupang ×10 | **실 API 호출** → IP 화이트리스트 거부 (`3.239.83.33` Vercel) · retry |
| Shopee ×10 | mock_ok (SHOPEE_* 키 없음) |
| Amazon ×10 | mock_ok (AMAZON_* 키 없음) |

쿠팡 live 재시도: Wing OpenAPI에 Vercel egress IP 등록 또는 고정 IP/릴레이(`COUPANG_RELAY_URL`) 사용.
