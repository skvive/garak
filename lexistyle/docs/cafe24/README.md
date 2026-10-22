# Cafe24 개발문서 허브 — LEXI / partnersc88

기준일: 2026-07-17  
API 버전: `2026-03-01`  
대상 쇼핑몰: `partnersc88` / 기본 멀티쇼핑몰 `shop_no=1`

이 디렉터리는 Cafe24 공식 문서를 LEXI 계정과 구현 범위에 맞춰 재구성한 로컬 지식베이스다. API 키, Client Secret, Access Token, Refresh Token은 기록하지 않는다.

## 가장 먼저 읽을 문서

1. [계정·연결 프로필](./account-profile.md) — URL, 환경변수, OAuth callback, 운영자 권한 URI
2. [플랫폼·인증·호출 규칙](./platform-guide.md) — 요청 형식, 토큰 수명, 상태 코드, 호출 제한
3. [LEXI 엔드포인트 매핑](./lexi-endpoint-map.md) — 현재 코드와 Cafe24 API의 연결 관계
4. [API 리소스 인덱스](./api-resource-index.json) — 도메인별 전체 리소스 검색용 JSON
5. [검색 인덱스](./search-index.json) — 주제·키워드에서 관련 문서로 이동하는 Agent용 인덱스
6. [Studio 전환 명세](../lexi-cafe24-studio-master-spec.md) — Cafe24와 LEXI의 시스템 소유권 경계

## 빠른 검색법

Cursor에서 다음 키워드로 `docs/cafe24`를 검색한다.

- 인증: `oauth`, `access_token`, `refresh_token`, `invalid_scope`, `redirect_uri`
- 상품: `products`, `variants`, `inventories`, `additionalimages`, `seo`
- 주문: `orders`, `payments`, `shipments`, `cancellation`, `refunds`
- 디자인: `themes`, `themes pages`, `scripttags`
- 운영자: `users`, `suppliers users`, `operator-permissions`
- 제한·오류: `429`, `X-Cafe24-Call-Usage`, `403`, `scope`

기계 판독이 필요하면 `api-resource-index.json`의 `domains[].resources`를 검색한다.

## 공식 사이트

- 개발자센터: https://developers.cafe24.com/
- 앱 관리: https://developers.cafe24.com/app/front/app/manage/list
- Admin API: https://developers.cafe24.com/docs/en/api/admin/
- 인증·보안 가이드: https://developer.cafe24.com/docs/guide/authentication_security_guide.html
- Scope 가이드: https://developers.cafe24.com/app/front/app/develop/api/scope

## 업데이트 원칙

1. 구현 전 공식 문서에서 해당 endpoint의 `SCOPE`, HTTP method, 필수 파라미터를 다시 확인한다.
2. `X-Cafe24-Api-Version`이 바뀌면 이 허브의 버전과 `CAFE24_API_VERSION`을 함께 갱신한다.
3. 신규 리소스를 사용하면 `api-resource-index.json`, `lexi-endpoint-map.md`, `search-index.json`을 함께 갱신한다.
4. 비밀값은 Vercel/로컬 환경변수에만 저장하고 문서·로그·Git에는 남기지 않는다.
