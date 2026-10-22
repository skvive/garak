# LEXI — K-Style 역직구 커머스 플랫폼 통합 설계 명세서

> **버전**: v1.0 (고객 납품용) · **작성**: Fable (UX/UI Architect) · **벤치마크**: YesStyle.com
> **스택**: Next.js (App Router) · Vercel · Neon DB (PostgreSQL) · Tailwind CSS

---

## 1. Executive Summary

### 1.1 프로젝트 요약
**LEXI**는 한국의 뷰티·패션·라이프스타일 상품을 전 세계 소비자에게 직접 판매하는 **K-Style 역직구(Cross-border D2C) 커머스 플랫폼**입니다. 벤치마크인 YesStyle이 "아시아 상품의 백화점식 대량 진열"이라면, LEXI는 **"큐레이션된 K-스타일 에디토리얼 커머스"**로 포지셔닝합니다.

### 1.2 브랜드 비전
- **Less, but Luxe**: YesStyle의 최대 약점인 정보 과밀(Cognitive Overload)을 제거하고, 매거진급 화이트스페이스와 실사 중심 비주얼로 프리미엄 신뢰감을 형성
- **Mobile Thumb-First**: 트래픽의 75% 이상이 모바일인 역직구 시장 특성에 맞춰, 모든 핵심 액션을 엄지 도달 영역(Thumb Zone) 하단에 배치
- **Trust at Every Step**: 해외 구매의 3대 불안(배송·관세·정품)을 UI 레벨에서 상시 해소하는 Trust Layer 설계

### 1.3 핵심 차별화 3축
| 축 | YesStyle | LEXI |
|---|---|---|
| 비주얼 | 썸네일 격자 나열, 프로모션 배너 과다 | 에디토리얼 히어로 + 실사 룩북 큐레이션 |
| 탐색 | 12+ 뎁스 메가메뉴, 높은 인지 부하 | 5-Tab 구조 + AI 추천 피드, Hick's Law 최적화 |
| 신뢰 | 배송/관세 정보가 FAQ에 은닉 | PDP·장바구니에 관세/배송 실시간 계산 위젯 상시 노출 |

---

## 2. UX Analysis & Upgraded Site Map

### 2.1 벤치마킹 역설계 — YesStyle 사용자 여정 분석

**핵심 여정**: `유입(SNS/검색) → 홈 배너 → 카테고리/베스트셀러 → PLP 필터링 → PDP 리뷰 검증 → 장바구니(무료배송 임계값 확인) → 결제`

| 요소 | 위치/구조 | UX 알고리즘 분석 | 판정 |
|---|---|---|---|
| 상단 GNB (Women/Men/Beauty/Life/Kids/Brands/Sale) | 헤더 고정 | 카테고리 7개+메가메뉴 60여 항목 → **Hick's Law 위반**. 선택 시간 증가, 이탈 유발 | ✖ 개선 |
| 검색바 | 헤더 중앙 | F-패턴 시선 흐름의 시작점에 배치 — 목적형 쇼퍼에 유효 | ✔ 계승 |
| 무료배송 임계값 바 | 헤더 상단 스트립 | **목표 구배 효과(Goal Gradient)** 로 객단가 상승 유도. 단, 상시 노출로 배너 실명(Banner Blindness) 발생 | △ 개선 계승 |
| 베스트셀러/신상품 캐러셀 | 홈 중단 | **사회적 증거(Social Proof)** 활용은 유효하나 셀당 정보 7개+(가격/할인/별점/뱃지…)로 스캔 비용 급증 | △ 개선 계승 |
| 리뷰 + 구매자 실사진 | PDP 하단 | 역직구 핵심 전환 장치. 단, 뷰포트 3~4스크롤 아래 위치 → **Fitts's Law** 상 도달 비용 큼 | △ 상단 요약 승격 |
| 리워드 포인트/쿠폰 팝업 | 진입 시 모달 | 최초 방문 즉시 모달 → **인지 부하 + 이탈**. 다크패턴에 근접 | ✖ 제거 |
| #YesStyleItList UGC | 홈 하단 | 커뮤니티 전환 루프는 우수. 발견성 낮음 | ✔ 승격 계승 |

**종합 진단**: YesStyle은 전환 장치(임계값 바, 리뷰, 포인트)는 교과서적이지만, **모든 장치를 동시에 노출**해 인지 부하가 임계치를 초과합니다. LEXI는 "한 화면 = 한 가지 설득"의 **Single Persuasion per Viewport** 원칙으로 재설계합니다.

### 2.2 LEXI 사이트맵 (Tree)

```
LEXI
├── / (Home — 에디토리얼 커머스 피드)
├── /category
│   ├── /beauty          스킨케어·메이크업·헤어/바디·이너뷰티
│   ├── /fashion         여성·남성·acc·슈즈
│   ├── /life            홈·문구·푸드·테크
│   └── /kids
├── /brands              브랜드 A-Z + 브랜드 스토리 허브
│   └── /brands/[slug]   브랜드관 (히어로 필름 + 베스트 라인업)
├── /trend               ★ 에디토리얼 허브 (매거진 + Shop the Look)
│   └── /trend/[slug]
├── /best                실시간 랭킹 (24h/주간/카테고리별)
├── /new                 신상품 (일자별 타임라인)
├── /sale                프로모션 (타임딜 카운트다운)
├── /search              검색 (자동완성·최근검색·비주얼서치)
├── /product/[slug]      PDP
├── /cart                장바구니 (관세/배송 실시간 계산기 내장)
├── /checkout            결제 (게스트 체크아웃 지원, 3-Step)
├── /account
│   ├── /orders          주문/배송 추적 (물류 타임라인 UI)
│   ├── /wishlist
│   ├── /rewards         LEXI Points·등급
│   ├── /reviews
│   └── /settings        주소록·통화/언어
├── /community           ★ #LEXILOOK UGC 갤러리 (태그 상품 연동)
├── /support             배송/관세 가이드·FAQ·1:1 문의
└── /admin               (내부) 상품·주문·배너·CMS·Dummy/Real 스위치
```

**설계 근거**
- GNB는 `Beauty · Fashion · Trend · Best · Sale` **5개로 압축** (Miller's Law 7±2의 하한 운용) — 나머지는 검색·풋터·햄버거로 이관
- `/trend`를 1뎁스로 승격: 목적 없는 브라우저(전체 트래픽의 60%)를 에디토리얼로 흡수 후 Shop the Look으로 전환하는 **Discovery → Conversion 루프**
- 모바일은 하단 5-Tab(`홈 · 카테고리 · 검색 · 커뮤니티 · 마이`) — Thumb Zone 내 모든 1차 내비게이션 완결

---

## 3. UI/UX Design System & Wireframe Concept

### 3.1 디자인 원칙
1. **Editorial White** — 배경은 순백, 상품 실사가 유일한 컬러 히어로. UI 크롬은 무채색으로 후퇴
2. **Single Persuasion per Viewport** — 뷰포트당 설득 장치 1개(임계값 바 or 타임딜 or 리뷰), 동시 노출 금지
3. **Thumb-Zone Commerce** — 구매 CTA·필터·탭은 화면 하단 1/3에 고정(Sticky), 상단은 정보 전용
4. **Trust Layer** — 관세·배송·정품 보증을 별도 페이지가 아닌 컨텍스트 인라인 위젯으로 제공

### 3.2 컬러 시스템 (Tailwind Tokens)

| 토큰 | HEX | 용도 |
|---|---|---|
| `lexi-ink` | `#111114` | 본문·헤드라인 (순흑 대신 잉크블랙, 눈부심 감소) |
| `lexi-paper` | `#FFFFFF` | 기본 배경 |
| `lexi-fog` | `#F5F5F3` | 섹션 구분 배경 (웜그레이 — 실사와 충돌 없음) |
| `lexi-line` | `#E4E4E0` | 디바이더·카드 보더 |
| `lexi-coral` | `#FF5C4D` | **Primary Accent** — CTA·할인가·타임딜 (K-뷰티 톤과 조화되는 코랄레드) |
| `lexi-coral-deep` | `#E03E30` | CTA hover/pressed |
| `lexi-sage` | `#5C7A6E` | 신뢰 요소 전용 (배송완료·정품인증·재고확보) |
| `lexi-gold` | `#C9A05C` | 등급·리워드 전용 |
| `lexi-dim` | `#6E6E73` | 보조 텍스트 |

> 접근성: 본문 대비 `lexi-ink/paper` 16.9:1, CTA `white/coral` 4.6:1 — WCAG AA 전 조합 통과. 컬러 사용률 규칙 **90(무채) : 7(coral) : 3(sage/gold)** 고정.

### 3.3 타이포그래피

| 레벨 | 폰트 | 크기(모바일/데스크톱) | 용도 |
|---|---|---|---|
| Display | **Playfair Display** (Latin) | 34/56px, -1% | 히어로 에디토리얼 헤드라인 |
| H1–H3 | **Pretendard** 700 | 24→18px / 32→22px | 섹션·상품명 |
| Body | Pretendard 400 | 15/16px, 행간 1.65 | 본문·설명 |
| Price | **Inter Tabular** 600 | 17/18px | 가격 (tabular-nums로 자릿수 정렬) |
| Caption | Pretendard 500 | 12/13px | 뱃지·메타 |

### 3.4 프론트 페이지 상세 설계 (모바일 기준, 위→아래)

| # | 섹션 | 상세 명세 |
|---|---|---|
| 0 | **Utility Strip** (h32) | 배송국가 자동감지 플래그 + "🇺🇸 Free shipping over $49" — 스크롤 시 소멸, 장바구니에서 재등장 (배너 실명 방지) |
| 1 | **Header** (h56, sticky) | 좌: LEXI 로고(세리프 워드마크) / 우: 검색·위시·카트 아이콘(44px 터치타겟). 검색 탭 시 풀스크린 서치 오버레이 |
| 2 | **Hero Editorial** (풀블리드 4:5) | 실사 룩북 1장 + Playfair 헤드라인("Seoul, This Week") + 고스트 CTA. **3초 자동 전환 금지**, 스와이프 수동 전환(사용자 통제감). 도트 대신 진행바 |
| 3 | **Category Chips** (가로 스크롤) | 원형 실사 썸네일 8개(스킨케어/메이크업/여성복/ACC/…) — 텍스트 링크 대비 인지속도 2배(Picture Superiority Effect) |
| 4 | **Real-time Ranking** | "지금 세계에서 가장 담긴" — 2열 그리드 6개. 카드 정보는 **이미지·브랜드·상품명·가격·♥ 5요소로 제한**(YesStyle 7+ → 5) |
| 5 | **Time Deal** (단독 뷰포트) | 코랄 배경 1블록, 카운트다운(tabular), 상품 3개 가로 스크롤. 뷰포트당 유일한 코랄 대면적 |
| 6 | **Shop the Look** | 에디토리얼 실사 1장 위에 상품 핀(+) 인터랙션 → 탭 시 하단 시트로 상품 리스트. Discovery→Conversion 핵심 루프 |
| 7 | **Brand Spotlight** | 주간 1브랜드: 브랜드 필름 스틸컷 + 베스트 4종 |
| 8 | **#LEXILOOK UGC** | 마소니 3열 실사용자 사진 → 탭 시 태그 상품 연결. Social Proof의 최종 형태 |
| 9 | **Trust Footer 진입부** | sage 톤 3아이콘: 정품 직소싱 · 관세 사전계산 · 15일 무료반품 |
| 10 | **Bottom Tab Bar** (h64, safe-area) | 홈·카테고리·검색·커뮤니티·마이 — Thumb Zone 완결 |

**PDP 핵심 업그레이드**
- 리뷰 평점·사진 리뷰 수를 **상품명 바로 아래로 승격** (YesStyle은 4스크롤 하단)
- **관세·배송비 계산 위젯**: 배송국 기준 "총 결제 예상액 $XX.XX (관세 포함)" 인라인 표시 — 역직구 이탈 1위 원인 제거
- 구매 CTA는 하단 Sticky Bar(가격+옵션+담기), 옵션 선택은 Bottom Sheet

### 3.5 AI 실사 이미지 생성 가이드 (Photorealistic Prompt Spec)

**공통 스타일 수식어(모든 프롬프트에 접미)**
```
shot on Canon EOS R5 85mm f/1.8, soft natural window light, editorial
commerce photography, muted warm tones, clean white/warm-gray backdrop,
photorealistic, high detail skin texture, no text, no watermark, 4:5
```

| 용도 | 프롬프트 코어 | 수량 |
|---|---|---|
| Hero 룩북 | `Korean fashion model in oversized cream knit and wide slacks, walking in minimal Seoul studio, candid motion` | 4 |
| 뷰티 카테고리칩 | `glass serum bottle with water droplets on wet stone pedestal, macro` | 8종 |
| Time Deal 상품 | `pastel cushion compact floating above silk fabric, product levitation shot` | 12 |
| Shop the Look | `two Korean models street style, Seongsu-dong cafe exterior, golden hour` | 6 |
| UGC 스타일 | `casual mirror selfie style, young woman holding skincare product, natural bedroom light, iPhone photo look` | 24 |
| 브랜드관 히어로 | `minimal cosmetic lab scene, chrome and frosted glass, single coral accent object` | 4 |

### 3.6 더미 데이터 명세

| 엔티티 | 수량 | 구성 규칙 |
|---|---|---|
| brands | 24 | K-뷰티 12·패션 8·라이프 4, 각 브랜드 스토리 200자 |
| products | 240 | 카테고리별 30±10, 가격 $8–$180 로그정규분포, 할인율 0/10/20/30% = 5:3:1:1 |
| product_images | 960 | 상품당 4장 (대표 1 + 상세 2 + 착용/사용 1) |
| reviews | 1,800 | 상품당 평균 7.5개, 평점 β분포(α=8,β=2 → 평균 4.4★), 사진리뷰 30% |
| users | 120 | 12개국 분포 (US 35%·JP 15%·SG 10%·…) |
| orders | 380 | 최근 90일 분포, 상태 6종 (paid→preparing→shipped→customs→delivered / cancelled 5%) |
| ugc_posts | 60 | 상품 태그 1–3개 연동 |
| banners/editorials | 12 | 히어로 4·타임딜 2·Shop the Look 6 |

모든 더미 레코드는 `is_dummy = TRUE` 플래그를 가지며(§4.2), 시더 스크립트 `scripts/seed-dummy.ts`로 멱등(idempotent) 삽입.

---

## 4. Technical Specification

### 4.1 스택 구성

| 레이어 | 기술 | 비고 |
|---|---|---|
| Frontend | **Next.js 15 App Router** + React Server Components | ISR로 PLP/PDP 캐싱, 홈은 revalidate 60s |
| Styling | Tailwind CSS v4 + shadcn/ui | §3.2 토큰을 `@theme`로 등록 |
| DB | **Neon PostgreSQL** (serverless driver `@neondatabase/serverless`) | 브랜치 기능으로 preview 배포별 DB 분리 |
| ORM | Drizzle ORM | 스키마 = 단일 진실 원천, `drizzle-kit push` |
| 인증 | Auth.js v5 (게스트 체크아웃 병행) | |
| 이미지 | Vercel Image Optimization + Blob | AI 생성 원본은 Blob 저장 |
| 결제(더미) | 모의 PG 어댑터 인터페이스 | Real 전환 시 Stripe/PortOne 어댑터 교체만 |

### 4.2 Neon DB 스키마 (핵심 엔티티)

```sql
-- 모든 콘텐츠 테이블 공통: is_dummy 플래그
CREATE TABLE brands (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  story       TEXT,
  logo_url    TEXT,
  is_dummy    BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at  TIMESTAMPTZ,                 -- soft delete
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  parent_id BIGINT REFERENCES categories(id),
  sort INT NOT NULL DEFAULT 0
);

CREATE TABLE products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  brand_id BIGINT NOT NULL REFERENCES brands(id),
  category_id BIGINT NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL, description TEXT,
  price_usd NUMERIC(10,2) NOT NULL,
  discount_rate SMALLINT NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  rating_avg NUMERIC(2,1), review_count INT NOT NULL DEFAULT 0,
  is_dummy BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_images ( ... product_id FK, url, sort, is_dummy ... );
CREATE TABLE reviews        ( ... product_id FK, user_id FK, rating, body, photo_urls TEXT[], is_dummy ... );
CREATE TABLE users          ( ... email UNIQUE, country CHAR(2), tier TEXT, is_dummy ... );
CREATE TABLE orders         ( ... user_id FK, status order_status, total_usd, duty_usd, shipping_usd, is_dummy ... );
CREATE TABLE order_items    ( ... order_id FK, product_id FK, qty, unit_price_usd, is_dummy ... );
CREATE TABLE ugc_posts      ( ... user_id FK, image_url, caption, product_ids BIGINT[], is_dummy ... );
CREATE TABLE banners        ( ... slot TEXT, image_url, headline, href, starts_at, ends_at, is_dummy ... );

-- ★ 사이트 전역 상태 (Dummy/Real 모드의 단일 진실 원천)
CREATE TABLE site_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);
INSERT INTO site_settings (key, value)
VALUES ('data_mode', '{"mode":"dummy","initialized":false}');

-- 전환 이력 감사 로그
CREATE TABLE data_mode_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  from_mode TEXT, to_mode TEXT, strategy TEXT,      -- 'soft' | 'hard'
  affected JSONB,                                    -- 테이블별 삭제 건수
  actor TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_dummy_live ON products (category_id)
  WHERE deleted_at IS NULL;                          -- partial index
```

### 4.3 [Dummy / Real] 토글 — 작동 메커니즘

**UI**: 화면 우상단(관리자 세션에서만 렌더)에 pill 토글. Real 전환 시 2단계 확인 모달 — ① 영향 요약(테이블별 삭제 예정 건수 미리보기) ② 브랜드명 타이핑 확인(`LEXI` 입력) 후 실행. 되돌릴 수 없는 작업의 표준 UX 패턴.

**전환 파이프라인 (Server Action, 단일 트랜잭션)**

```
POST /api/admin/data-mode  { target: "real", strategy: "soft" | "hard" }

BEGIN;
  SELECT value FROM site_settings WHERE key='data_mode' FOR UPDATE;  -- 동시 전환 락
  -- 1) Soft Delete (기본): 복구 가능 창구 유지
  UPDATE products  SET deleted_at = now() WHERE is_dummy AND deleted_at IS NULL;
  UPDATE reviews   SET deleted_at = now() WHERE is_dummy AND deleted_at IS NULL;
  ...  (FK 역순: order_items → orders → reviews → ugc → images → products → brands → users)
  -- 2) Hard Delete (strategy='hard' 시): DELETE ... WHERE is_dummy — FK 역순 삭제
  -- 3) 상태 영속화
  UPDATE site_settings
     SET value = '{"mode":"real","initialized":true}', updated_at = now()
   WHERE key = 'data_mode';
  INSERT INTO data_mode_audit (from_mode,to_mode,strategy,affected,actor) VALUES (...);
COMMIT;
→ revalidateTag('data-mode') → 전체 ISR 캐시 무효화
```

**핸들러 로직 규칙**
- 모든 조회 쿼리는 `WHERE deleted_at IS NULL` 기본 필터(Drizzle 쿼리 헬퍼로 강제) — 모드 분기 불필요, **데이터 자체가 상태를 표현**
- `data_mode`는 요청마다 조회하지 않고 `unstable_cache` + tag로 캐싱, 전환 시에만 무효화
- Real 모드에서 시더 재실행 시도는 `initialized:true` 가드로 차단 (재초기화는 감사 로그 필수 경유)
- Soft-deleted 더미는 30일 후 Vercel Cron(`/api/cron/purge-dummy`)이 Hard Delete — 복구 유예창 제공

### 4.4 Vercel 배포 자동화 & 도메인 네이밍 폴백

```bash
# scripts/deploy.sh — lexi.vercel.app → lexi0 → lexi1 ... 자동 폴백
BASE="lexi"; N=""
until vercel alias set "$DEPLOY_URL" "${BASE}${N}.vercel.app" 2>/dev/null; do
  N=$(( ${N:-(-1)} + 1 ))          # "", 0, 1, 2 ...
  [ "$N" -gt 20 ] && { echo "alias exhausted"; exit 1; }
done
echo "✅ https://${BASE}${N}.vercel.app"
```

- `vercel --prod --yes`로 CLI 배포 → 반환된 Deployment URL에 위 알리아스 폴백 적용
- Neon 브랜치 전략: `main`(production DB) / PR별 `preview/*` 브랜치 자동 생성·폐기 (Neon-Vercel 통합)
- 환경변수: `DATABASE_URL`(Neon pooled), `AUTH_SECRET`, `ADMIN_EMAILS`, `BLOB_READ_WRITE_TOKEN`

---

## 5. Client Q&A Queue (고객 최종 결정 대기 목록)

| # | 질문 | 기본안 (미회신 시) |
|---|---|---|
| 1 | **프레임워크 확정**: 현재 리포 베이스라인은 Vite+TanStack Start입니다. 본 명세대로 Next.js App Router로 신규 구축할까요, 기존 베이스라인을 유지·개조할까요? | Next.js 신규 구축 (명세 기준) |
| 2 | 기준 통화·언어: USD/영어 단일로 시작할까요, KRW·JPY 멀티커런시를 1차 범위에 포함할까요? | USD/EN 단일 + 통화 셀렉터 UI만 선탑재 |
| 3 | Real 모드 전환 기본 전략: Soft Delete(30일 유예) vs 즉시 Hard Delete? | Soft + 30일 자동 purge |
| 4 | 결제 PG: Real 단계에서 Stripe / PortOne(글로벌) 중 선호가 있으신가요? | 어댑터 인터페이스만 구현, PG 미연동 |
| 5 | AI 생성 이미지의 모델(인물) 사용 범위: 히어로·룩북에 AI 인물 사용 허용 여부 (브랜드 정책상 민감할 수 있음) | 인물은 실루엣/뒷모습 위주, 제품 실사는 전면 활용 |
| 6 | `lexi.vercel.app` 선점 시 폴백 네이밍 `lexi0,1,2…` 외에 `lexi-shop`, `lexistyle` 같은 의미형 대안을 선호하시나요? | 숫자 순차 (지시 기준) |
| 7 | 커뮤니티(#LEXILOOK) 1차 오픈 범위: 읽기 전용 갤러리 vs 회원 업로드 포함? | 1차는 읽기 전용(더미 UGC), 업로드는 2차 |
