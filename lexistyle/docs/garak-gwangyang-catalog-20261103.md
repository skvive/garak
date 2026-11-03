# 가락한상숍 · 광양수산 입점대기 상품 등록 (2026-11-03)

## 범위 및 출처
- 운영 도메인: `garak.lexid.site` (Vercel `garakhs`)
- 소스 저장소: `skvive/garak`, 프로젝트 루트 `lexistyle`
- CSV 원본: `가락한상오더_47개메뉴_이미지매칭.csv` (Library, 47행)
- 이번 등록: 원본 번호 11~47, `광양수산` 전용 **37건 / 카테고리 9종**
- 번호 1~10 일반 가락한상 메뉴는 의도적으로 제외
- 추적 JSON: `data/gwangyang-seafood-pending-20261103.json`

## 안전한 등록 설계
- Vercel의 상품 구매 코드에서 사용하는 `public.products` / `public.categories`는 변경하지 않았다.
- 별도 `public.garak_partner_categories`, `public.garak_partner_products`에만 등록한다.
- 37건 모두 `status='pending'`, `visible=false`, `purchasable=false`, `stock=0`, `image_verified=false`로 고정하여 최초 등록한다.
- DB CHECK 제약: 승인·이미지 검수 전 공개 불가, 승인·공개·재고 확보 전 구매 가능 전환 불가.
- CSV의 `images_800/...` 파일명은 **검수용 원본 참조**이며 웹에서 접근 가능한 이미지 URL이 아니다.
- 모든 사진은 AI 목업 시안으로, 실물 사진이라고 광고하거나 상품 상세에 전시하지 않는다.
- 금액은 KRW. 기존 `products.price_usd`에 원화 가격을 잘못 저장하지 않는다.

## 관리자 페이지
- `/hq/partners/gwangyang` (실제 i18n URL은 미들웨어 구성에 따름).
- HQ 메뉴 `커머스 원장 / 광양수산 입점대기`에서 진입.
- Neon Auth 서버 세션과 admin role 또는 `public.users`의 활성 admin 권한을 이중 확인한다.
- `HQ_ALLOW_ANON`, 데모 쿠키, 레거시 세션만으로는 접근 불가.
- 쓰기·승인·공개 버튼은 구현하지 않았다. 읽기 전용 검수 화면이다.
- 실제 관리자 계정의 권한 부여 상태는 별도 확인 필요.

## 검수 전 유지해야 할 항목
1. 공급처(광양수산) 입점 승인 및 증빙
2. 어종, 원산지, 중량, 손질, 포함 소스, 배송/냉장·냉동 안내
3. 상품 사진을 실제 상품/허가된 사진으로 교체하고 진위·저작권 검수
4. 철별 메뉴 판매 가능 여부 검증, `지구방어삼색회` 4종 구성 명칭 검토, 쥐치 사진 오매칭 교체
5. 가격과 매입가/수수료/원산지 표시 및 결제·환불 고지, 판매 가능 재고 확인
6. 별도 승인 워크플로를 개발·검증한 뒤 명시적 승인에 한하여 공개 상품 원장으로 게시

## 사후 검증 쿼리
```sql
SELECT count(*) total,
       count(*) FILTER (WHERE status='pending' AND NOT visible AND NOT purchasable AND NOT image_verified AND stock=0) safe_pending,
       count(DISTINCT category_code) categories
FROM public.garak_partner_products
WHERE merchant_slug='gwangyang-fisheries';
```

예상: `total=37`, `safe_pending=37`, `categories=9`.

## 재실행
- DDL은 `db/migrations/20261103_garak_partner_pending_catalog.sql`를 사용한다.
- CSV에서 생성한 `data/gwangyang-seafood-pending-20261103.json`를 기준으로 멱등 upsert/insert를 수행한다.
- **승인된 항목을 일괄 초기화하거나 기존 주문·재고를 수정하지 않는다.**
