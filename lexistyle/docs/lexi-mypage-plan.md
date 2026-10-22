# LEXI 고객 마이페이지 (My LEXI v2) 구현 기획

> 작성 2026-10-08 · 대상 `lexistyle.vercel.app` 고객 계정(Google 로그인) · 연동 LEXI HQ 대시보드(`/hq`)
> 상태: **기획 (구현 전)** — 이 문서는 구현 순서·데이터·API·연동 지점을 확정하기 위한 기획서입니다.

## 0. 목표

구글 로그인한 회원이 **각자 자기 계정 공간**에서 프로필·주문/배송·배송지·고객센터(문의)·알림·위시리스트·설정을 관리한다.
모든 데이터는 기존 세션(`lexi_session`)·DB(`users/orders/cs_*`)에 직접 연동하고, **문의·주문 이벤트는 HQ 대시보드로 흘러가 운영자가 처리**한다.

한 줄 정의: **"고객은 /account 에서 내 것을 관리하고, 운영자는 /hq 에서 고객 것을 본다."**

## 1. 현황 (As-Is) — 재사용 자산 정리

### 1.1 인증 (변경 없이 활용)
| 요소 | 현황 |
|---|---|
| 로그인 | Google OAuth 커스텀(`/api/auth/google` → callback) + Neon Auth 병행 |
| 세션 | `lexi_session` HMAC 쿠키(7일, `AUTH_SECRET`) — `src/lib/auth/session.ts` |
| 서버 가드 | `requireSession()` / `requireAdmin()` — `src/lib/auth/admin.ts` |
| 게스트 정책 | 주문 시 `orders.guestEmail` 귀속 → 로그인 시 `userId` 자동 연결(`checkout.ts resolveUserId`) |
| 데모 | `DEMO_LOGIN=1` 데모 쿠키(개발용) |

### 1.2 기존 고객 페이지
| 경로 | 현황 | 판단 |
|---|---|---|
| `/account` | My LEXI 허브(메뉴 리스트, 관리자면 /hq 링크) | **확장** (요약 카드 추가) |
| `/account/orders` | 주문 목록(id/상태/금액)만 | **확장** (상세·배송·반품) |
| `/account/wishlist` | 위시리스트 그리드 | 유지 |
| `/account/notifications` | 알림 목록 + 읽음 처리 | 유지 (트리거 보강) |
| `/account/settings` | 읽기 전용(이름/이메일) + 로그아웃 | **확장** (편집·탈퇴) |
| `/account/language`, `/account/avatar`, `/account/looks` | 언어/아바타/룩보드 | 유지 |
| `/account/[path]` | Neon Auth `AccountView` 전용(catch-all) | 유지 (충돌 없음, `dynamicParams=false`) |
| `/support`, `/support/chat` | FAQ + 1:1 스레드 UI | **통합** (`/account/support`로 진입점 정리) |

### 1.3 기존 API (재사용)
`/api/cart` · `/api/wishlist` · `/api/notifications` · `/api/reviews` · `/api/checkout` · `/api/payments/*`(toss·danal·mock) · `/api/support/chat`(스레드 생성/추가) · 관리자 `/api/admin/members|orders|products`

### 1.4 기존 DB (schema.ts)
- `users`(email/authUserId/name/image/country/tier/points/status)
- `orders`(status/payment provider·ref/shippingAddress jsonb/guestEmail/userId) · `order_items`(variantSku=CJ vid)
- `cart_items` · `wishlists` · `reviews` · `notifications`(userId/type/title/body/href/readAt)
- `cs_threads`(userId/guestEmail/subject/status) · `cs_messages`(threadId/sender/body)

### 1.5 갭 (신규 구현 필요)
| 갭 | 내용 |
|---|---|
| 프로필 | 전화·기본배송지·마케팅 수신·통관부호 저장/편집 수단 없음 |
| 주소록 | `addresses` 테이블 없음(주문 jsonb 스냅샷만) |
| 주문 상세 | 상품/옵션/운송장/타임라인/취소·반품 접수 없음 |
| 이메일 | **발송 인프라 전무** — resend/smtp 의존성·env 없음, OTP도 mock(`src/lib/auth/otp.ts`) |
| HQ CS | `/hq/cs` 없음, `cs-chat` lib은 고객 측만 |
| 알림 트리거 | 주문 상태 전이·CS 답변 시 알림 자동 생성 미비 |

## 2. 목표 구조 (To-Be) — `/account` IA

기존 `/account` 허브를 **대시보드 홈**으로 승격하고, 하위 6개 영역을 신설/확장한다.

```
/account                      My LEXI 홈 — 요약 카드(주문/배송중/알림/리워드) + 바로가기
├── /account/profile          프로필: 이름·전화·생년월일(선택)·기본 배송지·통관부호(마스킹)
├── /account/addresses        배송지 관리: 목록·추가·수정·기본 지정·삭제
├── /account/orders           주문 목록 (기간 필터, 상태 배지)
│   └── /account/orders/[id]  주문 상세: 상품·옵션·금액·배송지·타임라인·운송장·취소/반품 접수
├── /account/support          고객센터: 새 문의(이메일 발송) + 내 문의 내역(스레드) + FAQ
├── /account/notifications    알림 (기존)
├── /account/wishlist         위시리스트 (기존)
└── /account/settings         설정: 언어·통화, 마케팅 수신, 로그인 연결, 로그아웃, 회원 탈퇴
```

공통 레이아웃: **`src/app/[lng]/account/layout.tsx` 신설** — `requireSession()` 가드 + 좌측(데스크톱)/상단 스크롤(모바일) 서브내비. 게스트는 로그인 유도 카드(기존 패턴).

## 3. 상세 기능 정의

### 3.1 프로필 (`/account/profile`)
| 항목 | 내용 |
|---|---|
| 표시 | 이름·이메일(읽기), 가입일, 등급(`users.tier`)·포인트 |
| 편집 | 이름, 전화번호, 생년월일(선택), 기본 배송지(주소록에서 지정) |
| 통관 | 개인통관고유부호(P+12자리) 등록/수정 — **마스킹 표시**(`P1234****1234`), KR 배송 기본값 |
| 저장 | `PATCH /api/account/profile` → `users` 확장 컬럼 |
| 이미지 | `users.image`(Google 프로필) 표시, 변경은 후속(선택) |

### 3.2 배송지 관리 (`/account/addresses`) — 신규 테이블
| 항목 | 내용 |
|---|---|
| 필드 | label(집/회사), 받는사람, 전화, 우편번호, 주소1/2, 국가, 기본 여부 |
| 액션 | 추가·수정·삭제·기본 배송지 지정(1개만 기본, 트랜잭션) |
| 연동 | **체크아웃 화면에서 주소록 선택** → `orders.shippingAddress` 스냅샷으로 복사(기존 jsonb 형태 유지) |
| 게스트 | 비로그인은 기존 수동 입력 유지(변경 없음) |
| API | `GET/POST /api/account/addresses`, `PATCH/DELETE /api/account/addresses/[id]`, `POST …/[id]/default` |

### 3.3 주문/배송 (`/account/orders`, `/account/orders/[id]`)
| 기능 | 내용 |
|---|---|
| 목록 | 기간 필터(1·3·6개월), 상태 배지, 상품 썸네일 요약, 총액(USD/KRW) |
| 상태 | `pending_payment → paid → preparing → shipped → delivered` / `cancelled` (orders.status) — 한글 라벨 매핑 |
| 상세 | 주문 상품(옵션=`order_items.variantLabel`/SKU), 결제수단·ref, 배송지, 관세/배송비 breakdown |
| 타임라인 | 결제완료 → 구매요청 → CJ 발주(`sourcing_orders.cjStatus`) → 출고(운송장 `logisticName`+번호, 있으면) → 배송완료 |
| 추적 연동 | `order_items.variantSku`(CJ vid) → HQ `purchase_requests`/`sourcing_orders` 조회로 상태·운송장 노출 (HQ 데이터가 아직 없으면 "준비 중" 단계 표시) |
| 취소 | `pending_payment`·`paid`(미발주) 상태에서 즉시 취소 요청 → `orders.status='cancelled'`(관리자 확인 정책은 옵션) |
| 반품/교환 | 수령 후 15일 이내(FAQ 정책) 접수 → CS 스레드 자동 생성(제목 `[반품] 주문 #123`) + HQ CS 보드로 |
| API | `GET /api/account/orders/[id]`, `POST /api/account/orders/[id]/cancel`, `POST /api/account/orders/[id]/return` |

### 3.4 고객센터 (`/account/support`) — 문의 + **이메일 발송**
요구사항의 핵심. 두 채널을 한 화면에 통합한다.

| 기능 | 내용 |
|---|---|
| 새 문의 폼 | 유형(배송/통관/반품/결제/기타), 제목, 내용, 주문 선택(드롭다운: 내 주문), 답변 받을 이메일(기본=계정 이메일) |
| 접수 처리 | ① `cs_threads`/`cs_messages` 저장(기존 `createThread`) ② **운영자 수신 메일 발송**(support@rpcow.com) ③ **고객 자동확인 메일 발송**("접수됨 · 영업일 24시간 내 답변") ④ HQ `/hq/cs` 보드에 open 등장 |
| 내 문의 내역 | 기존 스레드 리스트(상태 open/waiting/closed) + 대화 뷰 + 추가 메시지(기존 `appendMessage`) |
| 이메일 답변 | 운영자가 HQ에서 답변 → ① `cs_messages(agent)` 저장 ② 고객에게 **답변 알림 메일** ③ `notifications` 생성 |
| FAQ | 기존 `/support` FAQ 콘텐츠 재사용(컴포넌트 추출) |
| API | `POST /api/support/inquiry`(신규: 스레드+메일), `GET/POST /api/support/chat`(기존 유지), `GET /api/support/mine` |
| 스팸 방지 | 로그인 필수(쿠키 검증) + IP·이메일 기준 5분 1건 레이트리밋 + 길이 제한(4,000자) |

동작 원칙: **메일 발송 실패가 접수를 막지 않는다.** DB 저장(①)이 성공하면 접수 성공으로 응답하고, 메일은 best-effort(실패 시 `cs_threads.emailError` 기록 + HQ 보드에 ⚠ 표시).

### 3.5 알림 (`/account/notifications`)
- 유지 + **트리거 보강**: 주문 상태 전이(결제완료/출고/배송완료), CS 답변 도착, 반품 접수/완료 → `createNotification(email, {type,title,body,href})`
- 헤더 벨 아이콘 뱃지(미읽음 수) — `unreadCount` API 연동(이미 `src/lib/notifications.ts` 기반)

### 3.6 위시리스트 (`/account/wishlist`)
- 유지. 상세 개선: 품절/판매중지 배지(`catalog_index.sourceStatus`), 삭제·카트 담기 원탭, 총 예상금액 표시

### 3.7 리워드 (`/account` 홈 카드)
- `users.tier`(bronze→silver→gold) + `users.points` **읽기 전용 표시**부터 시작
- 적립 정책(구매 확정 시 1% 등)은 M5에서 정책 확정 후 반영 — 기획 단계에서는 표시만 (허위 혜택 금지 원칙: 기존 BENEFITS 문구 유지)

### 3.8 설정 (`/account/settings`)
| 기능 | 내용 |
|---|---|
| 언어·통화 | 기존 `/account/language` 링크 유지 |
| 마케팅 수신 | 이메일 수신 동의 토글(`users.marketingOptIn`) — 동의 시에만 알림성 메일 발송 |
| 로그인 연결 | Google(현재)·휴대폰 OTP(연결됨 표시) |
| 로그아웃 | 기존 `/api/auth/logout` |
| 회원 탈퇴 | 소프트 삭제(`users.status='deleted'`, `deletedAt`) + 세션 만료 + 주문/CS 기록은 법적 보존(5년) — 확인 문구 2단계 |

## 4. HQ 대시보드 연동

### 4.1 `/hq/cs` CS 보드 (신설)
| 요소 | 내용 |
|---|---|
| 목록 | 스레드: 상태(open/waiting/closed)·유형·회원(email/name)·최근 메시지·대기시간, 필터·검색 |
| 상세 | 대화 뷰 + **답변 작성(agent)** → `appendMessage(agent)` + 이메일/알림 발송, 상태 변경(open↔waiting↔closed), 담당자(assignee) 지정 |
| 회원 패널 | 옆 패널: 회원 정보(`users`), 최근 주문 3건(`orders` 링크), 총 구매액 |
| 주문 연계 | 주문 문의면 주문 상세(`/hq/orders`)로 이동 링크 |
| API | `GET /api/hq/cs/threads`, `GET /api/hq/cs/threads/[id]`, `POST /api/hq/cs/threads/[id]/messages`, `PATCH /api/hq/cs/threads/[id]` (모두 `requireAdmin`) |

### 4.2 기존 HQ 확장
- `/hq/orders`: 주문 행에 회원(email) 표시 + 주문 상태 변경 시 **고객 알림·메일 트리거** (기존 상태 업데이트 경로에 훅)
- `/api/admin/members`: `phone/marketingOptIn/lastSeenAt/주문수` 컬럼 확장
- 알림 트리거 위치: `checkout.ts markOrderPaid`에 이미 결제완료 알림 존재 → 출고/배송완료/CS답변 트리거 추가

## 5. 데이터 모델 변경 (마이그레이션 목록)

| 테이블 | 변경 | 내용 |
|---|---|---|
| `users` (확장) | ADD COLUMN | `phone text`, `birth_date date`, `customs_code text`, `marketing_opt_in boolean default false`, `last_seen_at timestamptz` |
| `addresses` (신규) | CREATE | `id, user_id, label, receiver, phone, postal, address1, address2, country(2), is_default bool, deleted_at, created_at` + `(user_id, is_default)` 인덱스 |
| `cs_threads` (확장) | ADD COLUMN | `category text`(배송/통관/반품/결제/기타), `order_id bigint`, `priority text default 'normal'`, `assignee text`, `last_message_at timestamptz`, `email_error text` |
| `notifications` (변경 없음) | — | 트리거만 보강 |
| (선택) `order_events` (신규) | CREATE | `order_id, from_status, to_status, note, actor, created_at` — 타임라인 정본(없으면 `commerce_audit` 재사용) |

마이그레이션 방식: 기존 관행대로 `drizzle-kit push`(schema.ts 수정 후 로컬→Neon) + 신규 컬럼은 `ADD COLUMN IF NOT EXISTS` 스크립트 병행(운영 중단 없음).

## 6. API 스펙 (신규/변경)

| 메서드·경로 | 용도 | 인증 | 비고 |
|---|---|---|---|
| `PATCH /api/account/profile` | 이름·전화·생일·통관부호·마케팅 동의 저장 | 세션 | 통관부호 검증 `validateCustomsCode` 재사용 |
| `GET/POST /api/account/addresses` | 주소록 목록/추가 | 세션 | 최대 10개 |
| `PATCH/DELETE /api/account/addresses/[id]` | 수정/삭제(소프트) | 세션 | 소유권 검증 |
| `POST /api/account/addresses/[id]/default` | 기본 배송지 지정 | 세션 | 트랜잭션(기존 기본 해제) |
| `GET /api/account/orders/[id]` | 주문 상세 + 타임라인 | 세션+소유권 | `userId` 또는 `guestEmail` 일치 |
| `POST /api/account/orders/[id]/cancel` | 결제대기/결제완료(미발주) 취소 | 세션+소유권 | HQ 알림 병행 |
| `POST /api/account/orders/[id]/return` | 반품/교환 접수 | 세션+소유권 | CS 스레드 생성 + 메일 |
| `POST /api/support/inquiry` | 문의 접수(스레드+운영자 메일+자동확인) | 세션 | 레이트리밋 |
| `GET /api/support/mine` | 내 스레드 목록 | 세션 | 기존 `listThreads` 래핑 |
| `GET /api/notifications/unread-count` | 헤더 뱃지 | 세션 | 없는 경우 신설 |
| `DELETE /api/account` | 회원 탈퇴(소프트) | 세션 | 세션 쿠키 만료 동반 |
| `GET/POST /api/hq/cs/threads(+[id]/messages)` | HQ CS 보드 | 관리자 | 신규 |
| `PATCH /api/admin/orders/[id]` | 상태 변경 | 관리자 | 기존 경로 확장 시 알림·메일 훅 |

기존 API는 변경 없이 재사용: `/api/support/chat`, `/api/wishlist`, `/api/notifications`, `/api/cart`, `/api/checkout`, `/api/payments/*`.

## 7. 이메일 발송 설계 (신규 인프라)

현재 저장소에는 메일 발송 수단이 전혀 없다(의존성·env 0, OTP도 mock). 아래 최소 구조로 신설한다.

### 7.1 모듈
```
src/lib/email/
├── index.ts        sendEmail({to, subject, html, replyTo}) — provider 분기 + console 폴백
├── templates.ts    문의접수(운영자), 자동확인(고객), 답변알림(고객), 주문상태(고객) — 한국어 HTML
└── provider.ts     Resend HTTP API 호출(fetch) — 의존성 추가 없이 REST로 구현
```

- **provider 선택**: `RESEND_API_KEY` 있으면 Resend REST(`https://api.resend.com/emails`), 없으면 `console.log` 폴백(로컬·CI 안전). 라이브러리 설치 없이 `fetch`만 사용 → 번들/의존성 영향 없음.
- **env (Vercel + .env.local)**: `RESEND_API_KEY`, `EMAIL_FROM="LEXI <no-reply@rpcow.com>"`, `SUPPORT_INBOX="support@rpcow.com"`, `EMAIL_DRY_RUN=1`(선택)
- **도메인**: `rpcow.com` DKIM/SPF 등록 필요 — **사용자 액션**(Resend 대시보드에서 도메인 인증). 미인증 동안은 `onboarding@resend.dev` 테스트 발신.

### 7.2 발송 지점 (best-effort, 실패가 기능을 막지 않음)
| 시점 | 수신 | 템플릿 |
|---|---|---|
| 문의 접수 | 운영자(SUPPORT_INBOX) | 제목 `[LEXI 문의 #TID] 유형 · 제목`, 본문에 회원/주문/내용, `replyTo=고객 이메일` |
| 문의 접수 | 고객 | 접수 확인 + 스레드 링크 |
| HQ 답변 | 고객 | `replyTo=SUPPORT_INBOX` — 그대로 회신하면 스레드에 추가되도록 안내 |
| 주문 상태 변경 | 고객(결제완료/출고/배송완료) | 상태·운송장 링크 |
| (수신 회신 수집) | 운영자 | M3 이후 선택: Resend Inbound → `/api/support/email-inbound` 웹훅으로 스레드 추가 |

### 7.3 보안·품질
- 발송 전 `escapeHtml`, 헤더 인젝션 방지(제목 개행 제거), 수신 주소 화이트리스트 검증(형식만)
- 발송 로그: `commerce_audit`(entity=`email`) 또는 `cs_threads.email_error` 기록
- GDPR/스팸: 마케팅성 메일은 `users.marketingOptIn=true` 인 경우만. 트랜잭션 메일(접수/주문)은 동의와 무관하게 발송(법적 고지).

## 8. UX/디자인 가이드
- 스토어프론트 토큰 유지: `ink/paper/fog/line/dim/coral/sage/gold`, `price` 클래스, `rounded-2xl`, 12–15px 본문, lucide 아이콘
- `account/layout.tsx`: 데스크톱 좌측 220px 서브내비 + 모바일 상단 가로 스크롤 탭
- 빈 상태 문구 한국어("아직 주문이 없습니다" 패턴 유지), 로그인 유도는 기존 카드 패턴 재사용
- 상태 배지 색: 기존 `Badge tone`(neutral/express/fresh) 재사용 — pending_payment=neutral, paid/shipped=express, delivered=fresh, cancelled=neutral
- 목록 페이지네이션: 기존 `paginateSlice`/`STOREFRONT_PAGE_SIZE` 패턴 재사용

## 9. 보안 · 권한
- **서버 컴포넌트 가드**: 모든 `/account/*`는 `requireSession()` — 없으면 로그인 유도(리다이렉트 대신 인라인 카드, 기존 패턴)
- **API 가드**: 모든 `/api/account/*`, `/api/support/*`에서 `requireSession()` + **리소스 소유권 검증**(order.userId 일치 또는 `guestEmail === 세션 이메일`)
- 개인통관고유부호: 저장 시 원문, 화면 표시는 마스킹. 응답 로그·에러 메시지에 원문 금지
- 세션: 기존 `lexi_session`(HMAC-SHA256, 7일) 그대로. 쿠키 `httpOnly`, `secure`, `sameSite=lax` 확인(발급 route)
- 게스트→회원 귀속: 로그인 후 `guestEmail` 주문이 목록에 자동 포함(이미 `/account/orders`가 `or(...)` 처리 중) — 프로필 최초 진입 시 `userId` 백필(선택)
- 탈퇴: `status='deleted'` 소프트 삭제, `user_email` 재가입 시 새 행 생성 정책

## 10. 마일스톤 (구현 순서)

| 단계 | 범위 | 주요 파일 | 검증 |
|---|---|---|---|
| **M1** 프로필·주소록 | users 확장 + addresses + 프로필/주소 페이지 + 체크아웃 주소록 선택 | `src/db/schema.ts`, `scripts/migrate-mypage.ts`(ADD COLUMN/IF EXISTS), `src/app/[lng]/account/layout.tsx`, `profile/page.tsx`, `addresses/page.tsx`(+client), `src/app/[lng]/api/account/profile|addresses/*` | 로컬 PG에서 저장/기본주소 지정 → 체크아웃에 반영, tsc |
| **M2** 주문·배송 | 주문 목록 필터/상세/타임라인/취소·반품 접수 | `account/orders/page.tsx`(확장), `orders/[id]/page.tsx`, `api/account/orders/[id]/cancel|return` | 테스트 주문(mock 결제)으로 상세·취소·반품 스레드 생성 확인 |
| **M3** 고객센터·이메일 | `/account/support` 통합(폼+내역+FAQ) + `src/lib/email/*` + `/api/support/inquiry` | `lib/email/index|provider|templates.ts`, `account/support/page.tsx`(+client), `api/support/inquiry/route.ts` | DRY_RUN 로그로 발송 지점 확인 → 키 투입 후 실수신, 레이트리밋 확인 |
| **M4** HQ CS 보드 | `/hq/cs` + 답변(agent)+메일+상태/담당자 + 주문 상태 트리거 | `src/app/hq/cs/page.tsx`(+detail), `api/hq/cs/threads/*`, `checkout.ts`·HQ 상태변경 훅 | HQ에서 답변 → 고객 알림·메일 도착, `/hq/orders`에서 이메일 트리거 |
| **M5** 설정·마무리 | 설정 편집/탈퇴/마케팅 동의, 위시리스트·리워드 다듬기, 헤더 뱃지 | `account/settings/page.tsx`, `api/account/route.ts`, `account/page.tsx` 요약 카드 | 전체 회귀(로그인/게스트/관리자), **프로덕션(lexistyle.vercel.app) 확인** |

원칙: 각 단계는 독립 배포 가능(뒤 단계가 앞 단계를 깨지 않게). 모든 단계 종료 시 `npx tsc --noEmit` + 로컬 PG 라이브 확인 → 커밋/푸시(규칙대로 `db:sync:neon` 선행) → Vercel 배포 후 실사이트 확인.

## 11. 결정 필요 (사용자 확인)

| # | 항목 | 기본 제안 |
|---|---|---|
| 1 | 메일 provider | **Resend** (무료 3,000통/월, REST만 사용) + `rpcow.com` 도메인 DKIM 등록 필요 |
| 2 | 운영자 수신 주소 | `support@rpcow.com` (변경 가능) — env `SUPPORT_INBOX`로 교체 |
| 3 | 반품 접수 정책 | 15일 이내 접수 → HQ 확인 후 진행(자동 승인 아님). 쿠팡 채널 수수료(48,000/24,000원) 문구는 스토어프론트에 미노출 |
| 4 | 취소 자동 처리 | `pending_payment` 즉시 취소 / `paid`는 "접수→확인" 단계 |
| 5 | 회원 탈퇴 | 소프트 삭제 + 주문 5년 보존 |
| 6 | 적립·등급 정책 | M5에서 정책 확정 전까지 표시만 |

## 12. 참고 (관련 파일 지도)

- 인증: `src/lib/auth/session.ts` · `src/lib/auth/admin.ts` · `src/app/[lng]/api/auth/google/*`
- 체크아웃: `src/lib/checkout.ts` · `src/app/[lng]/api/checkout/route.ts` · `src/app/[lng]/api/payments/*`
- CS: `src/lib/cs-chat.ts` · `src/app/[lng]/api/support/chat/route.ts` · `src/app/[lng]/support/*`
- 알림: `src/lib/notifications.ts`
- 위시/리뷰: `src/lib/wishlist.ts` · `src/lib/reviews.ts`
- DB: `src/db/schema.ts`(users/orders/cs_threads/cs_messages/notifications)
- HQ: `src/app/hq/orders` · `src/app/api/admin/*` · `src/lib/hq/services.ts`(`intakeLexiStoreOrder`)
- 스타일: `src/components/commerce/*`(Badge, ProductCardDense), 토큰 ink/paper/fog
