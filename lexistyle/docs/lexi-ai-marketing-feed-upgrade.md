# LEXI — AI 마케팅 피드 업그레이드 보고·계획서 (v0.1)

> 벤치마킹 4개 프로젝트(`Amore_project`, `ah-my-marketing`, `OpenCut`, `kekemind`)를 실제 코드
> 레벨까지 분석해, LEXI 역직구 커머스(M1–M6) 위에 얹을 **"AI 마케팅 피드"** 기능의 이식
> 대상·아키텍처·단계별 로드맵을 정리한다. 본 문서는 **계획서**이며, 아직 구현하지 않았다.

---

## 0. 한 줄 요약

큐레이션된 역직구 상품을 입력하면 → **카피·훅(문구)·카드뉴스·숏폼 영상**을 자동 생성하고
→ ICE·근거 태그로 채점·큐레이션한 뒤 → 쿠팡/SNS 채널에 밀어 넣고
→ 성과를 다시 학습 원장에 누적(Compounding)하는 **상품→마케팅 자산 파이프라인**.

4개 벤치마크 중 **kekemind(시맨틱)·ah-my-marketing(카피/비주얼)·Amore(스토리보드·영상)** 3개는
이식 가치가 높고, **OpenCut은 스킵**한다(사유 §1.3).

---

## 1. 벤치마크별 판정

### 1.1 ah-my-marketing — 카피/비주얼 생성 엔진 ★★★ (핵심)
Claude Code 기반 마케팅 하네스. 런타임 코드는 없고 18개 스킬(프롬프트 IP)로 구성.

| 이식 대상 | 실체 | LEXI 적용 |
|---|---|---|
| **LMF 4단계 카피 엔진** (`amm-copy-lmf.md`) | Prepare→Diverge→Converge→Apply. 페르소나→VP(Value Promise)→소구가설→카피 대량 발산 | 상품 1건 → 소구점 카피 후보 N개 자동 생성 |
| **ICE + 근거 레벨 태그** | `ICE=(Impact+Confidence+Ease)/3`, 각 1–10 + `[Strong/Moderate/Emerging/Expert/Contested]` 태그 | 카피 변형마다 점수·근거 저장 → **M4 승인 게이트에 연결**(근거 낮으면 사람 검수 강제) |
| **Hook Lab 6유형** (`amm-hook-lab.md`) | PAIN/QUES/STAT/SOC/EMO/BENE, 유형별 균등 발산 30~60개 → ICE-lite → Top10 채널 매핑 | 상품별 훅 자동 생성기. 쿠팡 광고 타이틀·SNS 첫 줄 공급 (**가장 싼 고가치 승리**) |
| **Anti-Slop 3-pass** (`creative-design.md`) | AI 말투 제거 → 슬롭 단어 삭제 → 짧고 선명하게 | 생성 카피 후처리 프롬프트. 그대로 재사용 |
| **카드뉴스 HTML→PNG** (`amm-cardnews.md`) | 7슬라이드 아크 → CSS-var HTML → **Puppeteer screenshot** | **LEXI 렌더 인프라(Playwright)가 이미 하는 일** → 거의 무료 |
| **릴스 HTML→MP4** (`amm-reels.md`) | 9:16 자가 애니메이션 HTML(CSS keyframe + JS 시퀀서) → **Playwright `recordVideo`** (ffmpeg 없음) | 저작 레이어는 그대로 이식. webm→플랫폼급 MP4 인코딩만 추가 |
| **Compounding 루프** | `lmf-learnings.md` + `campaign-log.md` 누적 → 다음 캠페인 Phase 0 자동 로드 → 복리 | **Neon 테이블 2개로 치환**(§3.2). 이게 "일회성 AI 슬롭"이 아니라 시간이 갈수록 좋아지는 피드로 만드는 핵심 |
| **GATE 0–6** (`hooks.md`) | 선행조건·강제 write-back 체크포인트 | 문자 그대로가 아니라 **서비스 불변식**으로 이식(발행 시 원장 write-back 강제) |

- **라이선스**: LICENSE 없음(본인 리포, 내부 재사용 무방). 방법론 프롬프트 IP → 저위험.
- **이중 트랙**: 자동 피드용은 **인앱 서비스**로, 운영자 수동 작업용은 **Claude Code 스킬** 그대로 loyadbeta에 유지 권장.

### 1.2 Amore_project — 스토리보드·숏폼 영상 ★★★
상품 상세 URL → Playwright DOM 자산추출 → GPT-4o 스토리보드 → MoviePy 15초 1:1 영상. (백엔드 Python/FastAPI, 프론트 C# WinForms)

| 이식 대상 | 실체 | LEXI 적용 |
|---|---|---|
| **스토리보드 생성 파이프라인** (`llm_agent.py`) ★핵심 | 2단계(비전 요약→제약 JSON 계획) + **거절 샘플링**(후보 3개·스타일 다변화·결정적 검증기·best 선택) + **항상 유효 보장**(fallback/normalize) | LEXI의 "AI 상품페이지 리뉴얼" LLM 인프라에 바로 접목. 순수 로직 → **TS 재구현(Zod 스키마)** |
| 스토리보드 스키마·검증 | `{bgm_mood, scenes[{duration, image_index, overlay_text}]}`, 씬수=이미지수, Σduration=15, index 순열, overlay 한글 포함·≤15자 | 그대로 규격화 |
| DOM 자산 heuristic (`crawler.py`) | `src/data-src/data-original/data-zoom-image` + `srcset` 마지막 항목, 쿼리 제거 dedup, ≥300px 필터 | lexistyle 기존 공급처 추출기에 **robustness 유틸로 병합**(전체 크롤러 이식 X — 셀렉터가 Shopify용) |
| 렌더 스펙 상수 | 컷 분배(`distribute_15s`), Ken-Burns 0.04/s 줌, PIL 자막 박스, mood→BGM 매핑 | 렌더러 무관 **스펙/상수로 재사용** |
| 영상 렌더러 | MoviePy/PIL/OpenCV (Python 전용) | **이식 금지**. §3.4 참조 — Remotion(JS 네이티브) 권장, 급하면 Python 워커 임시 |

- **라이선스**: LICENSE 없음(내부 OK). **주의**: 번들 BGM mp3(스톡)·Malgun 폰트(MS 라이선스)·"Amorepacific" 브랜드 문자열은 **상용 배포 전 반드시 교체**(오픈 한글 폰트 Pretendard/Noto + 라이선스 트랙). ffmpeg는 LGPL 빌드 사용.

### 1.3 OpenCut — 스킵 (이 리포 기준)
이 리포는 OpenCut **리라이트의 빈 스캐폴드**다. 타임라인·에디터 UI·영상 엔진(ffmpeg.wasm/WebCodecs/Remotion) **전부 없음**. `apps/web` = TanStack Start + shadcn 보일러플레이트, 홈 라우트는 `return null`. **이식할 코드 0.**
- 실물 에디터가 필요하면 `opencut-app/opencut-classic`(Next.js, 실제 타임라인+ffmpeg.wasm)을 별도로 세션에 추가해 재평가.
- 숏폼 자동 렌더 목표에는 범용 에디터 이식보다 **Remotion(React→MP4, 헤드리스)** 또는 WebCodecs 인코더가 훨씬 가볍고 적합. → 결론: **본 리포 대상 작업 0, 렌더는 Remotion 채택.**
- 라이선스 MIT(확인) — 다만 가져올 실체가 없음.

### 1.4 kekemind — 한국어 시맨틱 레이어 ★★★
한국어 초경량 static 임베딩(`kor-static-embedding-512`, 68MB, 512dim, ~158× 빠름) + FastAPI. 데이터는 브라우저 IndexedDB(개인용).

| 이식 대상 | 실체 | LEXI 적용 |
|---|---|---|
| **임베딩 모델** ★핵심 | model2vec static(룩업테이블+평균풀링, 서브밀리초). `normalize_embeddings=True`→cosine=dot | 한국어 역직구 카탈로그·카피의 싼 시맨틱 레이어 |
| 자동 분류 (`/api/analyze`) | **최근접 centroid** — 10개 카테고리 시드구문 평균벡터 vs 쿼리 cosine. 학습 0, 즉시 교체 | 시드만 LEXI 택소노미(상품 카테고리/캠페인 테마/CS 인텐트)로 교체 |
| 시맨틱 검색 (`/api/recall`) | 쿼리 임베딩 → 클라 cosine top-K | **Neon pgvector `<=>`** 로 서버화 |
| 클러스터링 (`/api/patterns`) | KMeans + 대표문 + 키워드 | 마케팅 콘텐츠 테마 그룹("자주 쓰는 주제") 배치 |
| 요약 (`/api/summarize`) | centroid 추출 요약 | 캠페인/기간 카피 요약 |
| 자동 태그 (`/api/analyze`) | 정규식 빈도(가장 약한 부분) | 베이스라인만 이식, 추후 임베딩 기반 태깅으로 업그레이드 |
| CS 템플릿 추천 | recall을 템플릿 테이블에 적용 | 문의 임베딩 → 템플릿 top-K 추천 |

- **저장/런타임**: **Neon pgvector** 단일 벡터스토어(IndexedDB·브라우저 cosine 폐기). 단기 **FastAPI 임베딩 사이드카** → 중기 **ONNX/transformers.js in-Node** 이관.
- **라이선스**: 리포 Apache 2.0(확인). ⚠️ **모델 `kekeappa/kor-static-embedding-512`의 HF 모델카드 라이선스 + 증류 베이스 라이선스는 배포 전 별도 확인 필수**(리포 라이선스와 별개).

---

## 2. 제안 아키텍처 — "AI 마케팅 피드"

기존 커머스 파이프라인(P1 수집 → P2 큐레이션 → P3 AI 리뉴얼 → P4 게시 → P5 구매요청 → P6 정산)에
**마케팅 브랜치**를 P3와 P4 사이에 삽입한다.

```
 [P3 승인된 리스팅]
        │
        ▼
 ┌─────────────────────  AI 마케팅 피드  ─────────────────────┐
 │  M8 시맨틱          M9 카피 엔진            M10 비주얼      │
 │  (kekemind)   →     (ah-my-marketing) →    (ahmm+Amore)    │
 │  임베딩/태그/       LMF·ICE·Hook·          카드뉴스PNG·    │
 │  분류/검색          Anti-Slop              릴스MP4·숏폼    │
 │        └──────────────┬─────────────────────┘             │
 │                       ▼                                    │
 │              M11 피드 오케스트레이션                        │
 │        채널 배포(쿠팡/SNS) + 성과 → 학습 원장 write-back    │
 └────────────────────────────────────────────────────────────┘
        │
        ▼  (Compounding: 다음 배치 생성 품질 향상)
```

- **원장 일관성**: 마케팅 자산·학습도 lexistyle HQ가 SSOT. loyadbeta 콘솔은 `/api/hq/*` 로 소비(기존 D2 구조 유지).
- **loyadbeta 커머스 패널에 "마케팅" 탭 추가** → 상품별 생성 자산 미리보기·승인·배포 UI.

---

## 3. 데이터 모델 추가 (Neon / Drizzle)

### 3.1 pgvector 도입
- `CREATE EXTENSION vector;` (라이브 스키마 변경은 **diff 선제시 후** 적용 — 기존 정책)
- `supplier_products`, `listings`, `marketing_copy`, `cs_templates` 에 `embedding vector(512)` 컬럼 + HNSW 인덱스.

### 3.2 Compounding 학습 원장 (ah-my-marketing 이식)
```
marketing_learnings   -- lmf-learnings.md 대체
  id, product_id, category, vp_code, appeal_text, customer_language,
  evidence_level (enum), impact, confidence, ease, outcome(winner|rejected), created_at
campaign_log          -- campaign-log.md 대체
  id, product_id, channel(coupang|sns|lexi), asset_type(copy|hook|cardnews|reels|video),
  ice_score, metrics(jsonb: impressions/ctr/cvr), status, published_at, created_at
```
- **불변식(GATE-6 이식)**: 발행·성과분석 시 `campaign_log` write-back 강제, winner는 `marketing_learnings`로 승격.

### 3.3 마케팅 자산 (생성물)
```
marketing_assets
  id, listing_id, type(copy|hook|cardnews|reels|video),
  payload(jsonb: 카피 텍스트 / 훅 배열 / 스토리보드 JSON),
  render_url(png/mp4), ice_score, evidence_level, review_state(draft|approved|rejected),
  channel_targets(text[]), created_at
```

### 3.4 스토리보드 (Amore 이식)
- 스키마 §1.2 → Zod 검증 + `verify/normalize/fallback` 로직 TS 재구현. `marketing_assets.payload`에 저장.

---

## 4. 단계별 로드맵 (M8–M11)

> 기존 M1–M6(커머스) 완료, M7(관계형 마이그레이션)은 백로그. 마케팅 피드는 신규 M8–M11.

### M8 — 시맨틱 레이어 (kekemind)  · 우선 착수
- [S] Neon pgvector 활성화 + `vector(512)` 컬럼/인덱스 (diff 선제시)
- [M] FastAPI 임베딩 사이드카(`/embed`,`/analyze`) — `server.py` 거의 그대로
- [S] 자동 분류(최근접 centroid, 시드=LEXI 택소노미)
- [S] centroid 추출 요약
- [M] 시맨틱 상품/카피 검색(pgvector `<=>`)
- [M] CS 템플릿 추천
- (중기) [L] ONNX/transformers.js in-Node 이관 + 파리티 테스트
- ⚠️ 선행: HF 모델 라이선스 확인

### M9 — AI 카피 엔진 (ah-my-marketing)
- [S] Hook Lab 6유형 `generateHooks(product)` — 가장 싼 고가치
- [S] ICE + 근거 태그 모듈 → M4 승인 게이트 연결
- [S] Anti-Slop 3-pass 후처리
- [M] LMF 4단계 카피 생성 서비스(페르소나→VP→소구가설→카피, gen/eval 2스테이지)
- [M] `marketing_learnings` + `campaign_log` 테이블 + write-back 불변식
- [S] (병행) `amm-copy-lmf`·`amm-hook-lab` 등 스킬을 loyadbeta에 운영자용으로 유지

### M10 — 비주얼 자산 생성 (ah-my-marketing + Amore)
- [S~M] 카드뉴스 HTML→PNG (기존 Playwright 렌더 재사용)
- [M] 스토리보드 파이프라인 TS 재구현(Zod + 거절 샘플링 + 검증/정규화)
- [M~L] 릴스 HTML→MP4 (Playwright recordVideo → 결정적 프레임캡처+ffmpeg 인코딩)
- [L] 숏폼 영상 렌더러 — **Remotion**(스토리보드 JSON→`<Sequence>`) 채택. 임시 필요 시 Amore `video_gen.py` Python 워커(큐 뒤, 인라인 금지)
- [S] 렌더 스펙 상수(컷 분배·줌·자막박스·BGM맵) 이식 + **에셋(BGM/폰트) 라이선스 교체·브랜드 제거**

### M11 — 피드 오케스트레이션 & 채널 배포
- [M] 마케팅 탭(loyadbeta 커머스 패널) — 상품별 자산 생성·미리보기·승인·배포
- [M] 쿠팡/SNS 채널 어댑터에 마케팅 자산 push(기존 ChannelAdapter 확장)
- [S] 성과 수집 → `campaign_log` 지표 write-back → Compounding 폐루프

---

## 5. 빠른 승리(Quick Wins) — 착수 순서 권장
1. **Hook Lab 6유형 생성기** (M9·S) — 외부 의존성 0, 즉시 쿠팡/SNS 타이틀 공급
2. **자동 분류 + 요약** (M8·S) — 최근접 centroid, 순수 로직
3. **Anti-Slop 3-pass + ICE 모듈** (M9·S) — 기존 리뉴얼 카피 품질 즉시 개선
4. **카드뉴스 HTML→PNG** (M10·S~M) — 기존 Playwright 인프라 재사용
5. **pgvector 시맨틱 검색** (M8·M) — 카탈로그 검색·중복탐지 기반

---

## 6. 결정 필요 사항 (사장님 확인)
- **영상 렌더 방식**: Remotion(JS 네이티브, 권장) vs Python MoviePy 워커(빠른 파리티) — 초기 채택안?
- **임베딩 런타임**: FastAPI 사이드카 우선 → ONNX 이관 2단계(권장) vs 처음부터 ONNX?
- **에셋 라이선스**: 상용 배포용 BGM 트랙·한글 폰트 소스 확보 필요(현 번들은 재배포 불가)
- **HF 모델 라이선스**: `kor-static-embedding-512` 카드/증류베이스 라이선스 확인 후 진행
- 착수 범위: 위 Quick Wins만 먼저 PoC로 볼지, M8 전체부터 갈지

---

## 7. 라이선스·자산 요약
| 리포 | 라이선스 | 이식 리스크 | 조치 |
|---|---|---|---|
| ah-my-marketing | 없음(본인) | 낮음(방법론 IP) | 내부 재사용 OK |
| Amore_project | 없음(본인) | 낮음(코드) / **높음(번들 에셋)** | BGM·폰트·브랜드 교체 필수 |
| OpenCut | MIT | — | 스킵 |
| kekemind | Apache 2.0 | 낮음(리포) / **모델 별도확인** | HF 모델카드 라이선스 검증 |

---

## 8. 구현 현황 (M8–M11 완료)

권장안(Remotion / FastAPI 사이드카+결정적 폴백 / 오픈에셋)으로 전 단계 구현·검증 완료.
키·모델 없이도 동작(결정적 폴백), `EMBED_SERVICE_URL`·LLM 스왑인 시 시맨틱 품질 상승.

| 모듈 | 위치 | 상태 |
|---|---|---|
| M8 임베딩·분류·검색·클러스터·요약 | `src/lib/marketing/embed.ts`, `categories.ts` | ✅ |
| M8 FastAPI 임베딩 사이드카 | `services/embedding/` | ✅ |
| M9 ICE+근거태그 | `src/lib/marketing/ice.ts` | ✅ |
| M9 Anti-Slop 3-pass | `src/lib/marketing/antislop.ts` | ✅ |
| M9 Hook Lab 6유형 | `src/lib/marketing/hooks.ts` | ✅ |
| M9 LMF 카피 엔진 | `src/lib/marketing/lmf.ts` | ✅ |
| M9 Compounding 원장(learning·campaign_log) | `src/lib/hq/store.ts` + `service.ts` | ✅ |
| M10 카드뉴스 HTML | `src/lib/marketing/cardnews.ts` | ✅ |
| M10 릴스 9:16 애니 HTML | `src/lib/marketing/reels.ts` | ✅ |
| M10 스토리보드(검증·정규화·폴백) | `src/lib/marketing/storyboard.ts` | ✅ |
| M10 Remotion 컴포지션 | `services/remotion/` | ✅ |
| M11 오케스트레이션·서비스 | `src/lib/marketing/service.ts` | ✅ |
| M11 API | `src/app/api/hq/marketing/{generate,[id],search}` | ✅ |
| M11 loyadbeta 마케팅 탭 | `loyadbeta CommercePanel.tsx` | ✅ |

**검증**: E2E 스모크 통과 — 생성(훅10·카피6·카드뉴스7·숏폼) → ICE 채점 → 승인/발행 →
campaign_log·learning write-back → 성과 CTR 3.5% → winner 승격, 반려 자산 발행 차단,
시맨틱 검색·분류(뷰티/스킨케어 0.30)·요약 정상.

### 남은 후속(운영자 결정·프로덕션화)
- `EMBED_SERVICE_URL` 사이드카 배포 → 시맨틱 품질 상승(현재 결정적 폴백)
- LLM 스왑인(카피·스토리보드 생성 단계) — 스키마·검증 로직은 유지
- 바이너리 렌더 워커(Remotion) 상시화 + `marketing_assets.renderUrl` 기록
- 라이선스 BGM 트랙·오픈 한글 폰트 확보(상용 배포 전)
- kekemind 모델 HF 라이선스 확인 / 규모 확대 시 Neon pgvector 이관

*계획 → 구현 완료. 위 후속은 외부 키·에셋·배포 결정에 의존.*
