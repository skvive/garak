# LEXI Cafe24 계정·연결 프로필

## 계정 식별 정보

- Mall ID: `partnersc88`
- Shop No: `1`
- API version: `2026-03-01`
- LEXI production: https://lexi0.vercel.app
- Vercel project: `shinkang888-codes-projects/lexi0`

Client ID는 환경변수로 관리하며 Client Secret과 OAuth Token은 절대 문서에 기록하지 않는다.

## Cafe24 개발자센터 앱 설정값

### Redirect URI

```text
https://lexi0.vercel.app/api/cafe24/oauth/callback
```

### 운영자 권한확인 URI

```text
https://lexi0.vercel.app/api/cafe24/operator-permissions
```

응답 형식은 UTF-8 JSON이며 `MENU_LIST`와 `FUNCTION_LIST`를 반환한다.

### 현재 최소 Scope

```text
mall.read_product
```

LEXI 카탈로그의 현재 읽기 경로는 상품 목록·상세 조회만 사용하므로 최소 권한을 요청한다. 신규 기능을 추가할 때는 Cafe24 개발자센터 앱 권한과 `CAFE24_SCOPES`가 정확히 일치해야 한다. 하나라도 등록되지 않은 scope를 요청하면 OAuth 단계에서 `invalid_scope`가 발생한다.

PDP 게시 등 Admin API 쓰기는 해당 endpoint 공식 문서의 쓰기 scope를 개발자센터 앱에 추가한 뒤 `CAFE24_SCOPES`에도 동일하게 반영해야 한다. scope 명칭은 추측하지 말고 버전 `2026-03-01` 공식 문서에서 확인한다.

## 환경변수 인덱스

- `CAFE24_MALL_ID` — `partnersc88`
- `CAFE24_SHOP_NO` — 기본값 `1`
- `CAFE24_API_VERSION` — `2026-03-01`
- `CAFE24_MODE` — `off | front | hybrid`
- `CAFE24_FRONT_CLIENT_ID` — 개발자센터 앱 Client ID
- `CAFE24_CLIENT_SECRET` — 서버 전용 비밀값
- `CAFE24_SCOPES` — 개발자센터 앱 권한과 동일한 콤마 구분 scope
- `CAFE24_ACCESS_TOKEN` — 정적 토큰 폴백; OAuth 저장 토큰 우선
- `CAFE24_FRONT_API_KEY` — Front API 레거시 폴백
- `NEXT_PUBLIC_CAFE24_ADMIN_URL` — Cafe24 관리자 외부 링크

## 애플리케이션 경로

- 연결 UI: `/studio/cafe24`
- OAuth 시작: `/api/cafe24/oauth/start`
- OAuth callback: `/api/cafe24/oauth/callback`
- 연결 상태: `/api/cafe24/status`
- 상품 projection sync: `/api/cafe24/sync`
- 운영자 권한 JSON: `/api/cafe24/operator-permissions`

## 토큰 저장 우선순위

1. Neon `hq_state`의 `cafe24_oauth` 토큰 — 자동 refresh
2. `CAFE24_ACCESS_TOKEN` — 정적 환경변수
3. Front API에 한해 Client ID + `CAFE24_FRONT_API_KEY`

토큰 원문을 API 응답, Devlog, 문서, Git에 남기지 않는다.
