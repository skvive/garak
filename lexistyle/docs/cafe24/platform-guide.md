# Cafe24 API 플랫폼·인증·호출 가이드

출처: 사용자가 제공한 Cafe24 Admin API 문서와 공식 개발자 문서  
스냅샷: 2026-07-17 / API version `2026-03-01`

## 기본 규약

- REST + OAuth 2.0
- HTTPS 전용
- 요청·응답: JSON
- 날짜: ISO 8601 (`YYYY-MM-DDTHH:MM:SS+09:00`)
- Base URL: `https://{mallid}.cafe24api.com/api/v2`
- Admin API: `/api/v2/admin/{resource}`
- Version header: `X-Cafe24-Api-Version: 2026-03-01`

### 표준 요청 헤더

```http
Authorization: Bearer {access_token}
Content-Type: application/json
X-Cafe24-Api-Version: 2026-03-01
```

### HTTP method

- `GET`: 조회
- `POST`: 생성
- `PUT`: 수정
- `DELETE`: 삭제

## OAuth 2.0 흐름

### 1. Authorization code

브라우저에서 요청한다. code는 재사용할 수 없고 발급 후 1분이면 만료된다.

```text
GET https://{mallid}.cafe24api.com/api/v2/oauth/authorize
  ?response_type=code
  &client_id={client_id}
  &state={csrf_state}
  &redirect_uri={registered_redirect_uri}
  &scope={registered_scopes}
```

### 2. Access token 교환

```http
POST /api/v2/oauth/token
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code={code}&redirect_uri={redirect_uri}
```

- Access token 수명: 2시간
- Refresh token 수명: 2주
- 응답에는 `mall_id`, `user_id`, `shop_no`, `scopes`, 만료시각이 포함된다.

### 3. Refresh

```http
POST /api/v2/oauth/token
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token={refresh_token}
```

갱신 시 새 Access/Refresh token이 함께 발급되며 기존 Refresh token은 폐기된다.

### 4. Revoke

```http
POST /api/v2/oauth/revoke
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded

token={token}&token_hint={access_token|refresh_token|id_token}
```

## Scope 원칙

- endpoint마다 공식 문서의 `SCOPE`를 확인한다.
- OAuth 요청 scope와 개발자센터 앱 등록 권한을 정확히 일치시킨다.
- 미등록 scope가 하나라도 포함되면 `invalid_scope`가 발생한다.
- 유효한 토큰이어도 endpoint 권한이 없으면 `403`이다.
- 권한 변경 후에는 authorization code 발급부터 다시 진행한다.

## GET 조회 패턴

### 조건 검색

```text
GET /admin/products?brand_code=B000000A&price_min=1000
```

### 복수 값

콤마로 최대 100개 값을 OR 조회한다.

```text
GET /admin/products?product_no=11,12,13
```

### 멀티쇼핑몰

```text
GET /admin/products?shop_no=2
```

생략 시 기본 쇼핑몰을 조회한다.

### 상세·단건

```text
GET /admin/products/128
GET /admin/products?product_no=128
```

### Pagination

```text
GET /admin/products?limit=100&offset=200
```

### 특정 필드

```text
GET /admin/products?fields=product_name,product_no
```

### 하위 리소스 embed

```text
GET /admin/products/570?embed=variants,inventories
```

## 호출 제한

Cafe24는 Leaky Bucket과 사용량 제한을 함께 적용한다.

- Bucket은 초당 2회 감소한다.
- 동일 IP에서 쇼핑몰당 초당 10회 이상 호출하면 비정상 호출로 판단될 수 있다.
- 제한 초과 시 `429 Too Many Requests`
- 재시도를 계속하면 차단 시간이 늘어날 수 있으므로 Remain이 끝날 때까지 대기한다.

관찰해야 할 헤더:

- `X-Api-Call-Limit: used/limit`
- `X-Cafe24-Call-Usage`: 호출량 사용률(%)
- `X-Cafe24-Call-Remain`: 재호출까지 남은 시간(초)
- `X-Cafe24-Time-Usage`: 처리시간 사용률(%)
- `X-Cafe24-Time-Remain`: 처리 재개까지 남은 시간(초)

구현 원칙:

1. 응답 헤더를 읽어 throttling한다.
2. `429`는 지수 백오프보다 `Remain` 우선으로 대기한다.
3. 동일 요청의 재시도에는 멱등성을 보장한다.
4. 대량 조회는 `limit`과 `offset`으로 직렬 또는 낮은 동시성으로 처리한다.

## 상태 코드 진단

- `200`: GET/PUT/DELETE 성공
- `201`: POST 성공
- `202`: 비동기 요청 접수
- `204`: 본문 없는 DELETE 성공
- `207`: 다중 요청의 개별 상태가 다름
- `400`: JSON Content-Type 오류 또는 URL 인코딩 오류
- `401`: 토큰 누락·만료·무효, 알 수 없는 client, Front API Client ID 누락
- `403`: scope 부족, HTTPS 아님, 앱 삭제, 몰 기능 미지원
- `404`: URL 또는 리소스 ID 오류
- `409`: 동일 값으로 중복 업데이트
- `422`: 필수 파라미터 누락 또는 스펙 불일치
- `429`: 호출량 제한 초과
- `500`: Cafe24 내부 오류
- `503`: 서비스 장애
- `504`: 처리 시간 초과

### API 문의 시 필수 정보

Cafe24에 API 관련 문의를 접수할 때 다음 정보를 함께 기재하면 빠르게 답변받을 수 있다.

- 쇼핑몰 아이디: `partnersc88`
- 해당 API 응답 헤더의 `X-Trace_ID` 값

`X-Trace_ID`는 모든 API 요청을 역추적할 수 있도록 Cafe24가 응답 헤더에 정의하는 고유 일련번호다.

## 버전 정책

- 비호환 변경은 날짜 버전으로 제공한다.
- 지정하지 않으면 개발자센터 앱 버전으로 동작한다.
- 새 버전 출시 후 기존 버전은 최대 1년간 유지된다.
- 버전 변경 위치: 개발자센터 로그인 → Apps → 개발정보 → 인증정보 → 버전관리
