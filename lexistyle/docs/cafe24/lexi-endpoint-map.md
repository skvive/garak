# LEXI 구현 ↔ Cafe24 엔드포인트 매핑

API version: `2026-03-01`  
Base: `https://partnersc88.cafe24api.com/api/v2`

이 문서는 전체 API 목록이 아니라 LEXI 코드가 현재 호출하거나 다음 구현 단계에서 직접 사용할 endpoint를 추적한다. 정확한 request body와 scope는 호출 전 공식 문서에서 다시 확인한다.

## 현재 구현

### OAuth

- Authorization code: `GET /oauth/authorize`
- Token 교환: `POST /oauth/token`
- Token refresh: `POST /oauth/token`
- Token revoke: `POST /oauth/revoke` — 문서화됨, LEXI UI 미구현

관련 코드:

- `src/lib/cafe24/oauth.ts`
- `src/app/api/cafe24/oauth/start/route.ts`
- `src/app/api/cafe24/oauth/callback/route.ts`

### 카탈로그

- Front 상품 목록: `GET /products`
- Front 상품 상세: `GET /products/{product_no}`
- Admin 상품 목록: `GET /admin/products`
- Admin 상품 등록: `POST /admin/products`

관련 코드:

- `src/lib/cafe24/catalog.ts`
- `src/lib/cafe24/admin-products.ts`
- `src/lib/cafe24/map-product.ts`

현재 OAuth 최소 scope는 `mall.read_product`다.

### 카트

- Front 카트 목록: `GET /carts`
- Front 카트 추가: `POST /carts`
- Admin 회원 카트: `GET /admin/carts`

관련 코드: `src/lib/cafe24/carts.ts`

### 주문

- Admin 주문 목록: `GET /admin/orders`
- 주문 생성/미러: `POST /admin/orders` — Cafe24 정책·scope·필수 body 재검증 필요
- 주문 상세: `GET /admin/orders/{order_id}`
- 주문 품목: `GET /admin/orders/{order_id}/items`
- 주문 배송: `GET|POST|PUT|DELETE /admin/orders/{order_id}/shipments`
- 환불 조회: `GET /admin/refunds`
- 주문 취소: `POST /admin/orders/{order_id}/cancellation`
- 반품: `POST|PUT /admin/orders/{order_id}/return`
- 교환: `POST|PUT /admin/orders/{order_id}/exchange`

관련 코드: `src/lib/cafe24/orders.ts`

운영 원칙: 주문·결제·배송 원장은 Cafe24이며 LEXI DB는 projection 또는 작업 이력만 보존한다.

### PDP·상품 콘텐츠 게시

- 상품 상세 조회: `GET /admin/products/{product_no}`
- 상품 상세 수정: `PUT /admin/products/{product_no}`
- 상품 이미지 업로드: `POST /admin/products/{product_no}/images`
- 추가 이미지: `POST|PUT|DELETE /admin/products/{product_no}/additionalimages`
- 상품 SEO: `GET|PUT /admin/products/{product_no}/seo`
- 상품 태그: `GET|POST|DELETE /admin/products/{product_no}/tags`

관련 코드:

- `src/lib/studio/publish.ts`
- `src/app/api/studio/publish/route.ts`

게시 전 사람 승인과 immutable content version이 필수다.

### 디자인

- 테마 목록·상세: `GET /admin/themes`, `GET /admin/themes/{skin_no}`
- 테마 페이지: `GET|POST|PUT|DELETE /admin/themes/{skin_no}/pages`
- 스크립트 태그: `GET|POST|PUT|DELETE /admin/scripttags`

LEXI는 현재 Studio 디자인을 Neon에서 관리하며 Cafe24 theme/page 직접 수정은 운영 결정 대기 상태다.

### 운영자·앱

- 운영자 조회: `GET /admin/users`, `GET /admin/users/{user_id}`
- 공급사 운영자: `GET|POST|PUT|DELETE /admin/suppliers/users`
- 앱 조회·버전 수정: `GET|PUT /admin/apps`
- 웹훅 설정: `GET|PUT /admin/webhooks/setting`
- 웹훅 로그: `GET /admin/webhooks/logs`

LEXI가 Cafe24에 제공하는 운영자 권한 문서:

```text
GET https://lexi0.vercel.app/api/cafe24/operator-permissions
```

## 인덱싱된 주요 endpoint 패턴

### 상품

```text
GET    /admin/products
GET    /admin/products/count
GET    /admin/products/{product_no}
POST   /admin/products
PUT    /admin/products/{product_no}
DELETE /admin/products/{product_no}
GET    /admin/products/{product_no}/variants
PUT    /admin/products/{product_no}/variants/{variant_code}
GET    /admin/products/{product_no}/variants/{variant_code}/inventories
PUT    /admin/products/{product_no}/variants/{variant_code}/inventories
```

### 주문

```text
GET /admin/orders
GET /admin/orders/{order_id}
GET /admin/orders/count
PUT /admin/orders
PUT /admin/orders/{order_id}
GET /admin/orders/{order_id}/items
GET /admin/orders/{order_id}/buyer
GET /admin/orders/{order_id}/receivers
GET /admin/orders/{order_id}/paymenttimeline
GET /admin/orders/dashboard
```

### 카테고리·진열

```text
GET|POST|PUT|DELETE /admin/categories
GET|POST|PUT|DELETE /admin/categories/{category_no}/products
GET|POST|PUT|DELETE /admin/mains
GET|POST|PUT|DELETE /admin/mains/{display_group}/products
```

### 공급사·배송

```text
GET|POST|PUT|DELETE /admin/suppliers
GET|POST|PUT|DELETE /admin/suppliers/users
GET|POST|PUT|DELETE /admin/carriers
GET|POST|PUT|DELETE /admin/shippingorigins
GET|PUT /admin/shipping
```

### 매출·성과

```text
GET /admin/financials/dailysales
GET /admin/financials/monthlysales
GET /admin/reports/hourlysales
GET /admin/reports/productsales
GET /admin/reports/salesvolume
```

## 기능 추가 체크리스트

1. 공식 문서에서 endpoint의 `SCOPE`와 지원 method를 확인한다.
2. 개발자센터 앱 권한에 scope를 먼저 등록한다.
3. Vercel `CAFE24_SCOPES`를 같은 목록으로 갱신한다.
4. OAuth code 발급부터 다시 동의한다.
5. `X-Cafe24-Api-Version`을 명시한다.
6. `X-Api-Call-Limit`과 Usage/Remain 헤더를 처리한다.
7. 민감정보·개인정보 API는 최소 권한과 감사로그를 적용한다.
8. 쓰기 요청은 멱등성·실패 상태·롤백 경로를 갖춘다.
