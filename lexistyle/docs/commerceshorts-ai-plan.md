# CommerceShorts AI — 기획·개발 명세 v0.1

> 고객용 URL-to-Video SaaS. 요청 명세(Creatify / CapCut Commerce / Arcads / Pebblely)를
> **이미 있는 lexistyle 마케팅 엔진 + loyadbeta 운영 분리** 위에 얹는다.
> 신규 FastAPI·Celery·별도 Postgres·별도 유저 테이블은 만들지 않는다.

근거로 읽은 정본:

| 문서·코드 | 가져오는 결정 |
|---|---|
| `docs/lexi-dropship-integration-spec.md` D1–D4 | Neon 원장은 lexistyle 단독. loyadbeta는 HQ API 소비 콘솔. 수집은 공식 API 우선, 크롤은 약관 범위만 |
| `docs/lexi-ai-marketing-feed-upgrade.md` M8–M11 | Hook Lab·LMF·ICE·Anti-Slop·스토리보드·Remotion·학습 원장 **이미 구현** |
| `src/lib/marketing/*` | 훅 6유형, 카피, 15초 스토리보드 검증기, 릴스 HTML, 카드뉴스 |
| `services/remotion/` | 스토리보드 JSON → MP4. BGM·폰트는 라이선스 트랙만 |
| `docs/lexi-wan-maas.md`, `src/lib/wan/*` | 상품 이미지→영상(i2v) primary. Kling/Luma/Hedra는 v1에 넣지 않음 |
| loyadbeta (명세상) | `CommercePanel` 마케팅 탭, `QueuePanel` 잡 알림. DB 복제 금지 |

GitHub 라이브 조회(`gh`)는 이 세션에서 응답이 없어, 위 로컬 정본(loyadbeta를 이미 소화한 명세)을 기준으로 썼다.

---

## 0. 한 줄

스마트스토어·쿠팡·Cafe24 URL → 상품 메타 추출 → AIDA 대본 3종 미리보기(무료) → 9:16 MP4 1개(크레딧).  
영상 모델은 **Wan i2v 1순위, 실패 시 Remotion 켄번+자막**. 아바타 립싱크는 3단계.

가칭 **CommerceShorts**. 슬로건은 고객 페이지에만. 내부 코드·HQ에는 플랫폼명(CJ 등)을 노출하지 않는다.

ICP: 스마트스토어·쿠팡·Cafe24·Shopify 1인 셀러, 퍼포먼스 대행사.  
LEXI 자사몰 운영 콘솔(HQ)과 고객 SaaS는 같은 엔진을 쓰고, 화면은 분리한다.

---

## 1. 벤치마크 → 이식 판정

| 요청 벤치 | 킬러 | 우리 판정 |
|---|---|---|
| Creatify URL-to-Video | URL→대본→1분 영상 | **핵심.** 추출은 채널 어댑터, 대본은 기존 Hook+LMF+스토리보드를 3템플릿으로 확장. 길이는 15초(기존 `TOTAL_SECONDS`)부터, 30초는 2단계 |
| CapCut 누끼·모델 합성 | 상품을 모델이 든 영상 | v1은 **누끼 없이** 원본 컷 + Wan i2v. 배경제거(RMBG)는 2단계. 모델이 상품을 드는 합성은 3단계 |
| Arcads UGC | AI 배우 리뷰 | 템플릿 `ugc_review`의 **자막·훅·나레이션 문안**만 v1. 립싱크(Hedra/LivePortrait)는 3단계. 없는 API를 라우터에 빈 칸으로 두지 않음 |
| Pebblely / Flair | 배경 교체·줌 | Remotion 켄번(기존 줌 스펙 0.04/s 상수) + Wan i2v 프롬프트(`wan-prompts.ts`) |

OpenCut 에디터, MoviePy, 별도 임베딩 사이드카는 이번 범위에서 제외(마케팅 피드 명세와 동일).

---

## 2. 서비스 기획

### 2.1 고객 흐름 (무료 가두리)

1. URL 붙여넣기 → 상품명·가격·이미지·특징 미리보기. **크레딧 0.**
2. 템플릿 3종 대본·컷 구성 미리보기(훅, 씬 나레이션, 자막). **크레딧 0.**
3. 「영상 만들기」→ 크레딧 1 차감 → 진행률 → MP4. 무료 플랜은 워터마크, 다운로드 전 결제 유도는 Pro 이상에서 워터마크 제거.

미리보기까지 무료, 최종 MP4만 과금. 요청 명세의 가두리와 같다.

### 2.2 템플릿 3종

| id | 이름 | 대본 축 | 비주얼 v1 |
|---|---|---|---|
| `ugc_review` | UGC 리뷰 | 질문형 훅 + 후기 키워드 | 상품 컷 켄번 + 말풍선 자막 |
| `discount_sale` | 세일 | 가격·품절 훅 + CTA | 가격 오버레이 + 상품 모션 |
| `brand_emotion` | 감성 | 짧은 브랜드 문장 | Wan i2v 또는 슬로 줌 |

훅 문장 생성은 `generateHooks()` 6유형(PAIN/QUES/STAT/SOC/EMO/BENE)을 재사용하고, 템플릿이 유형 가중치만 바꾼다.  
카피 후처리는 `antiSlop()`. 점수·사람 검수는 HQ용 `makeIce` / `needsHumanReview`. 셀러 셀프서브에는 ICE를 노출하지 않는다.

### 2.3 요금 (요청안 유지, 원가 상한 코드)

`src/lib/shorts/pricing.ts`: 크레딧 단가 대비 렌더 원가 35% 초과(마진 65% 미만)면 Wan을 끄고 Remotion만 쓴다.

| 플랜 | 단가 | Wan $0.55 | 결과 |
|---|---|---|---|
| free $0 / 2편 | $0 | 초과 | Remotion + 워터마크. 다운로드 클릭 시 Pro 유도 |
| Starter $29 / 15 | $1.93 | 허용 | Wan 가능, 워터마크, 같은 다운로드 게이트 |
| Pro $79 / 50 | $1.58 | 허용(상한 $0.55) | 워터마크 없이 즉시 다운로드 |
| Agency $199 / 200 | $1.00 | 초과(상한 $0.35) | Remotion. 편당 단가를 올리지 않는 한 AI 모션 없음 |

미리보기(추출·대본·9:16)는 비로그인 무료. 크레딧은 렌더 시작에 1. 결제 유도 화면은 완성 영상의 다운로드 버튼.

### 2.4 요금 원안

| 플랜 | 월 렌더 | 비고 |
|---|---|---|
| free | 가입 2회 | 워터마크, 1080×1920 |
| Starter $29 | 15 | 1080p, URL 추출 |
| Pro $79 | 50 | 워터마크 없음, 보이스(연결 시), 업스케일 자리만 |
| Agency $199 | 200 | 배치 URL, 팀 시트, API 키 |

원가 불변식: `크레딧 1회 원가 = Wan(또는 폴백 렌더) + 스토리지 + 함수 시간`.  
판매가 대비 원가 ≤ 35% (마진 65%+). 원가가 상한을 넘으면 그 잡은 폴백(Remotion only)으로 내리고, 폴백도 실패하면 크레딧을 되돌린다.  
4K·아바타·다국어 더빙은 플랜 카피에 넣되 **코드 플래그 off**. 키·단가 확정 전 과금 기능으로 열지 않는다.

---

## 3. 아키텍처

```
[셀러 웹  Next.js  Vercel]
   URL 입력 · 대본 미리보기 · 잡 폴링(2초) · 다운로드
        │  /api/shorts/*
        ▼
[lexistyle 엔진  같은 Neon]
   extract → script(기존 marketing) → video_jobs
        │
        ├─ 동기(미리보기): Hook + LMF + storyboard JSON + 릴스 HTML
        └─ 비동기(MP4): Render 워커
              1) Wan i2v (이미지 1장, 5초, 9:16)  키 있을 때
              2) 실패·키 없음 → Remotion 켄번+한글 자막
              3) MP4를 Blob(또는 기존 asset 저장)에 넣고 final_video_url
```

요청 명세의 FastAPI·Redis·WebSocket·S3·Kling 라우터는 **채택하지 않는다.**

| 요청 스택 | 대체 | 이유 |
|---|---|---|
| FastAPI + Celery | Next 라우트 + `video_jobs` 상태머신 + Render 워커 1개 | 엔진이 이미 TS. Python 서비스는 임베딩 사이드카만 잔존, 영상 경로에 추가하지 않음 |
| Redis 진행률 / WebSocket | `video_jobs.progress` + `GET /jobs/:id` 폴링 | HQ 파이프가 이미 완료/전체 카운터 패턴. 동시 사용자가 워커 1대 수준이면 WS 이득 없음 |
| PostgreSQL 신규 | **기존 Neon** Drizzle 증설 | D1. loyadbeta Supabase에 상품·잡 테이블 금지 |
| users 테이블 신규 | 기존 계정. `plan_type`·`credits`는 `short_accounts` 1:1 | 로그인 이원화 방지 |
| S3 + CloudFront | Vercel Blob (초안) | 앱이 Vercel. 24시간 만료되는 Wan OSS URL은 즉시 Blob에 복사 (`lexi-wan-maas`와 동일) |
| Playwright 상시 크롤러 | 채널 어댑터: OG/JSON-LD → Cafe24 API → 그 외 수동 이미지 업로드 | D4. 쿠팡·스마트스토어 HTML 크롤을 기본 경로로 두지 않음 |
| Kling/Luma/Hedra/ElevenLabs | v1 라우터 없음. primary Wan, secondary Remotion | 없는 벤더를 fallback 체인에 넣으면 장애 원인만 늘어남 |
| 고객 사이트 = loyadbeta | loyadbeta는 운영 검수·배치만 | D2. 셀러 가입 화면을 본사 콘솔에 넣지 않음 |

Vercel 함수는 영상 렌더(수 분)를 돌리지 않는다. 렌더 프로세스만 Render 웹/워커.  
클라이언트는 Vercel, DB는 Neon, 긴 잡은 Render. CLI는 `vercel`, `neonctl`(또는 Neon MCP), `gh`.

---

## 4. 모듈

### A. URL 추출 — 새로 작성, 얇게

`POST /api/shorts/extract` `{ url }`

우선순위:

1. `og:title`, `og:image`, `product:price:amount`, JSON-LD `Product`
2. Cafe24 상품 URL이면 기존 `src/lib/cafe24/` 조회(몰 권한 있는 경우만)
3. 실패 시 400 + 「이미지 직접 올리기」

저장: 아래 `short_products`. 이미지 바이너리는 DB에 넣지 않고 URL 배열만 (`catalog_index`와 같은 규칙).

수집 필드: 제목, 가격, 통화, 이미지 URL[], 페이지 텍스트에서 잘라낸 특징 5줄, 후기 문장(페이지에 노출된 것만, 최대 5). 로그인 월을 깨는 스크레이퍼는 만들지 않는다.

### B. 대본 — 기존 모듈 확장

`src/lib/marketing/storyboard.ts`는 **15초·자막 15자·씬 수 = 이미지 수**가 불변식이다. 광고 대본 JSON을 그 검증기에 그대로 넣으면 깨진다.

확장안 (기존 함수는 유지):

```ts
// src/lib/shorts/script.ts  (신규)
type ShortScene = {
  sceneId: number;
  duration: number;          // 초, 합 = 15 (v1)
  narration: string;         // 더빙 문장. v1은 자막으로만 사용
  overlayText: string;       // 한글 ≤15자 — 기존 clamp 재사용
  visual: "kenburns" | "wan_i2v";
  imageIndex: number;
};
type ShortScript = {
  template: "ugc_review" | "discount_sale" | "brand_emotion";
  hookText: string;          // generateHooks 1위
  scenes: ShortScene[];
  valid: boolean;
  source: "template" | "fallback";
};
```

LLM이 없을 때도 `fallbackStoryboard`처럼 **항상 유효한 보드**를 낸다. LLM을 붙일 때는 JSON만 바꾸고 `verify`는 그대로 둔다 (storyboard.ts 주석과 동일 원칙).

3템플릿은 훅 유형·CTA 문장·`visual` 기본값만 다른 상수 테이블이다.

### C. 비디오 라우터 — Wan + Remotion만

씬마다 모델을 고르지 않는다. v1 잡 하나 = 전략 하나.

| 전략 | 조건 | 산출 |
|---|---|---|
| `wan_i2v` | `WAN_API_KEY` 있고 대표 이미지 HTTPS | 5초 클립 1개 + 나머지 씬은 같은 클립 위 자막 시퀀스 |
| `remotion` | 키 없음, Wan 실패, 이미지 핫링크 실패 | 전 씬 켄번 + 자막. 기존 `StoryboardVideo` props |

진행률: `queued 5 → scripting 20 → rendering 60 → uploading 90 → completed 100`. 숫자만 DB에 기록.

크레딧: `rendering` 진입 시 1 선차감, `failed`면 반환. 미리보기 단계는 차감 없음.

### D. 합성

- 9:16만 v1. 1:1·16:9는 props의 width/height 자리만 타입에 둔다.
- 한글 자막: Pretendard/Noto, 자간 0, 12px 미만 금지, 이탤릭 없음. 단어별 팝업은 Remotion `<Sequence>` 2단계.
- BGM 파일은 레포에 넣지 않는다. `bgmFile`은 라이선스 트랙이 있을 때만 (`services/remotion/README.md`).
- 무료 플랜 워터마크 텍스트는 브랜드 prop. 하드코딩 금지.

---

## 5. DB (Neon, Drizzle 증설)

`users`를 새로 만들지 않는다. 기존 사용자 id에 1:1.

```sql
short_accounts (
  user_id        pk references 기존 사용자,
  plan           text default 'free',  -- free|starter|pro|agency
  credits        int  default 2,
  period_end     timestamptz
);

short_products (
  id             bigint pk,
  user_id        not null,
  source_url     text not null,
  title          text,
  price_amount   numeric,
  currency       char(3) default 'KRW',
  image_urls     jsonb not null default '[]',
  features       jsonb not null default '[]',
  created_at     timestamptz default now()
);

short_scripts (
  id             bigint pk,
  product_id     not null,
  template       text not null,
  payload        jsonb not null,       -- ShortScript
  created_at     timestamptz default now()
);

video_jobs (
  id             bigint pk,
  user_id        not null,
  product_id     not null,
  script_id      not null,
  status         text default 'queued', -- queued|rendering|uploading|completed|failed
  progress       int  default 0,
  strategy       text not null,         -- wan_i2v|remotion
  final_video_url text,
  error          text,
  credits_cost   int default 1,
  created_at     timestamptz default now(),
  finished_at    timestamptz
);
```

`marketing_assets` / `campaign_log`는 HQ 승인·성과용으로 유지한다. 셀러 잡은 `video_jobs`에만 쌓고, 운영자가 승격할 때만 marketing 원장으로 복사한다. 이중 기록 금지.

---

## 6. API

| 메서드 | 경로 | 크레딧 | 응답 |
|---|---|---|---|
| POST | `/api/shorts/extract` | 0 | `{ product, scripts[3] }` (비로그인, DB 기록 없음) |
| POST | `/api/shorts/scripts` | 0 | `{ product, scripts[3] }` (수동 입력·수정) |
| POST | `/api/shorts/upload` | 0 | `{ url }` (로그인, Blob) |
| POST | `/api/shorts/jobs` | 1 선차감 | `{ job }` (`{product, script}` 받아 상품·잡 저장) |
| GET | `/api/shorts/jobs`, `/api/shorts/jobs/:id` | 0 | 내 잡 / `{ job }` (본인만) |
| GET | `/api/shorts/account` | 0 | `{ signedIn, plan, credits, plans }` |
| POST | `/api/shorts/worker/claim`, `/worker/report` | — | 워커 전용 Bearer `SHORTS_WORKER_TOKEN` |

HQ 배치(대행사·운영)는 기존 `/api/hq/marketing/generate`를 유지하고, 셀러 API와 핸들러를 공유하지 않는다. loyadbeta는 계속 HQ 토큰으로만 호출한다.

---

## 7. 화면

셀러용, 한글, ink/paper 톤. 스토어프론트 PDP·HQ 라우트 파일을 개조하지 않는다.

| 경로 | 역할 |
|---|---|
| `/shorts` | URL 입력, 추출 결과, 템플릿 3장 미리보기(기존 `reelPreviewHtml`) |
| `/shorts/jobs/[id]` | 진행률, 완료 시 9:16 플레이어·다운로드 |
| `/shorts/billing` | 플랜·잔여 크레딧. 결제 연동 전엔 플랜 표시만 |

빈 URL, 추출 실패, 크레딧 0, 잡 실패(크레딧 복구 문구)를 각각 둔다.

---

## 8. 구현 순서

1. **대본 엔진** — `src/lib/shorts/script.ts` + 검증 테스트. 네트워크 없음. 3템플릿이 항상 `valid`.
2. **스키마** — 위 4테이블 Drizzle. 로컬 Postgres에 push. Neon은 사용자 확인 후 `db:sync` (개발 중 Neon 직접 쓰기 금지).
3. **extract + scripts API** — OG/JSON-LD. 미리보기 HTML.
4. **잡 + Remotion 워커** — 키 없이 MP4까지. 워커는 Render. 진행률 폴링.
5. **Wan 전략** — 키 있을 때만 i2v, 실패 시 4번으로 폴백, 크레딧 복구.
6. **셀러 페이지** `/shorts` — 브라우저로 URL→미리보기→잡→재생까지.
7. **Vercel** — 웹만. 환경변수 `WAN_*`는 Production에만, 깃 금지.
8. **과금** — 크레딧 원장 동작 확인 후 Stripe. 그 전엔 free 2크레딧.

1–4가 되면 「URL 넣고 15초 숏폼」이 돈다. 아바타·배치·4K·1:1은 그 다음이다.

---

## 9. 하지 않는 것

- loyadbeta에 `products` / `video_jobs` 복제
- 쿠팡·스마트스토어 로그인 크롤, 리뷰 10개 강제 파싱
- v1 멀티 벤더 비디오 라우터 (Kling, Luma, Hedra, SadTalker, ElevenLabs)
- 고객 화면에 공급사명·원가 공식·Ruleset
- Remotion BGM·상용 폰트 번들
- Vercel 서버리스에서 ffmpeg/Remotion 렌더
- 스토어프론트 PDP 개편과 이 작업을 한 변경에 섞기

---

## 10. 결정 기록

- 렌더 워커: Render 유료 대신 **이 PC(상시 가동 팀 서버)** 예약 작업 `LEXI-Shorts-Worker`. `services/remotion/Dockerfile`은 Render 이전용으로 유지.
- MP4 저장: Vercel Blob `shorts/videos/*`.
- Stripe: 크레딧 원장 안정화 뒤(8단계). 지금은 free 2크레딧, 플랜 표시만.
- 대본은 별도 테이블 없이 잡에 고정 저장 → 테이블 3개.

## 11. 구현 현황 (v1)

| 영역 | 위치 |
|---|---|
| 원가 상한 (마진 65%) | `src/lib/shorts/pricing.ts` |
| 대본 엔진 (3템플릿·verify·normalize) | `src/lib/shorts/script.ts` |
| URL 추출 (JSON-LD → OG, SSRF 차단) | `src/lib/shorts/extract.ts` |
| 크레딧·잡·claim·환불 (DB / 메모리 폴백) | `src/lib/shorts/service.ts` |
| 스키마 | `src/db/schema.ts` `short_accounts` `short_products` `short_video_jobs`, SQL `scripts/sql/shorts-schema.sql` |
| API | `src/app/api/shorts/{extract,scripts,account,upload,jobs,jobs/[id],worker/claim,worker/report}` |
| 셀러 화면 | `/[lng]/shorts`, `/shorts/dashboard`, `/shorts/jobs/[id]` 다운로드 게이트 |
| 컴포지션 | `services/remotion/src/ShortVideo.tsx` (후킹 배너·자막 팝업·CTA·워터마크·Wan 클립) |
| 워커 | `services/remotion/worker.mjs`, 실행 `scripts/shorts-worker.ps1` |
| 테스트 | `npx tsx scripts/test-shorts.ts` |

워커 env: `SHORTS_API_BASE`, `SHORTS_WORKER_TOKEN`(Vercel Production과 동일 값), `BLOB_READ_WRITE_TOKEN`.  
Wan: 감성형 첫 씬만 i2v. 10분 내 미완료·실패 시 자동으로 Remotion 켄번 폴백.  
렌더 실패 시 크레딧 1 자동 환불, 15분 넘게 점유된 잡은 재대기열.
