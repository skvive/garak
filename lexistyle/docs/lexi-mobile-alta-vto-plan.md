# LEXI 모바일 — 아바타·룩보드·가상피팅 기획서

> 상태: 페이즈 1–4 스토어프론트 착수 (컷아웃 워커는 원본 image 폴백).  
> 출처 UX: Mobbin 큐레이션 **Alta iOS Aug 2026** (364장). Alta 로고·카피·아이콘은 이식하지 않는다. 구조·동작만 LEXI로 재창작.  
> 기존 커머스 IA: `docs/lexi-mobile-ui-spec.md` (쿠팡 밀도). 본 문서는 **스타일링 레이어**다.  
> 스크린샷 원본은 리포에 커밋하지 않는다 (`tmp-alta-ios/` gitignore).

---

## 한 줄 결론

Alta는 쇼핑몰이 아니라 **디지털 클로젯 + 룩 큐레이션 + 아바타 피팅** 앱이다. LEXI는 그 루프를 **판매 SKU에 붙인 에디토리얼 커머스**로 이식한다. 즉시 쓸 수 있는 것은 **배경 제거 룩보드(인형옷입히기)** 이고, 얼굴 아바타·실사 피팅은 **유료 API + 쿼터**로만 연다. 브라우저에서 GPU 디퓨전을 돌리지 않는다.

---

## 1. Alta가 실제로 하는 일 (화면 전수 요약)

364장은 온보딩~헬프까지 한 앱의 플로우다. 핵심 루프는 아래 8단이다.

| 단계 | 대표 화면(파일 번호) | 동작 | LEXI 대응 |
|------|----------------------|------|-----------|
| 스플래시 | 0 | 워드마크만, 여백 | 기존 LEXI 스플래시 유지 |
| 소셜 로그인 | 1–2 | Google/Apple, **이름+프로필사진** 스코프 | Neon Auth에 얼굴 업로드는 **별도 동의** (소셜 썸네일은 저해상·저작권 리스크) |
| 취향 | 5, 10 | 이름, Womenswear/Menswear 멀티셀렉트 | 기존 카테고리 선호 + 사이즈 프로파일과 합침 |
| 클로젯 적재 | 40, 200 | 상품 사진, 브랜드/카테고리, **Prettify**, 실패 토스트, **배경 제거 진행 시트** | Import/PDP 에셋에 cutout 파이프라인 |
| 페이스 가이드 | 55 | 단독 얼굴 / 단체금지 | `/account/avatar` 촬영 가이드 |
| 홈 룩보드 | 20, 110 | 날씨·인사, 장면 라벨(Office / Client Meeting), **컷아웃 아이템을 몸 실루엣처럼 세로 배치**, 주간 플래너, Ask Alta | 홈 섹션 `오늘의 룩` + PDP 코디 |
| 클로젯 그리드 | 80, 90 | 3열 컷아웃, 칩 필터, 룩에 담기 선택 모드 | 위시+구매+카탈로그 SKU를 `dressable` 자산으로 |
| 아바타 CTA | 120, 130, 250 | **Create Avatar**, 배경 스와치, 공유, **Try on me**, 타인 피팅 피드 | PDP 고정 CTA + 결과 시트. 가짜 리뷰/가짜 소셜은 PDP ruleset 위반 |

부가: Crisp 헬프(170)에서 **아바타를 보상 재화**로 언급. LEXI는 크레딧을 보상으로 쓰지 말고 **생성 쿼터**로만 다룬다.

하단 탭(Alta): Home / Closet / **중앙 +** / Search / Profile.  
LEXI 현재 탭: 홈 / 카테고리 / 검색 / 장바구니 / 마이 (`bottom-tab-bar.tsx`). **장바구니를 빼지 않는다.** 룩 빌더는 중앙 FAB이 아니라 PDP·마이·홈 섹션에서 연다.

---

## 2. 두 가지 시각 모드 (반드시 분리)

사용자가 본 “인형옷입히기”는 Alta 홈에서 **이미 컷아웃된 옷을 레이어로 쌓는 것**이다. 디퓨전 피팅과는 비용·지연·리스크가 다르다.

```
모드 A  룩보드 (Paper layout)     모드 B  실사 피팅 (VTO)
──────                           ──────
입력: SKU cutout PNG             입력: 아바타 전신 + 의류 이미지
연산: CSS/Canvas 레이어          연산: 디퓨전/상용 Try-On API
지연: <100ms                     지연: 5–55s
비용: 컷아웃 1회                 비용: 생성당 과금
정직성: "배치 미리보기"          정직성: "생성 이미지 · 실측 아님"
실패: 레이어만 깨짐              실패: 얼굴 붕괴, 로고 소실, 포즈 왜곡
```

**1차는 A만 출시.** → **수정(2026-08):** 컷아웃 없이 A를 내면 히어로 콜라주가 되어 실패 UX다.  
홈 `오늘의 룩`은 **착장 합성 이미지(모드 B 결과/캐시)** 를 기본으로 하고, A는 알파 PNG 준비 후에만 전신 보드로 연다.  
상세: [lexi-today-look-ai-outfit-plan.md](./lexi-today-look-ai-outfit-plan.md).

B는 쿼터·워터마크·면책 카피 후에 연다. A 없이 B만 열면 PDP가 매번 대기 스피너가 되어 전환이 죽는다. → 홈은 **시드/캐시 착장**으로 즉시 보여주고, 재생성만 비동기로 돌린다.

---

## 3. 기술 스택 조사 (2025–2026)와 LEXI 선택

### 3.1 의류 컷아웃 (모드 A의 전제)

| 옵션 | 역할 | 채택 |
|------|------|------|
| **BiRefNet** (SOTA 오픈소스 배경제거) | 카탈로그/유저 업로드 배치 | **Import 워커 정본.** Render GPU 또는 로컬 배치. 유리/메쉬/크롬은 검수 플래그 |
| rembg / ISNet | 가벼운 폴백 | 더미 모드·로컬 전용 |
| remove.bg 등 SaaS | 빠르지만 장당 비용 | 피크 오버플로만 |

Alta의 “Removing the background…” / “Failed to prettify photo”는 이 단계의 UX다.

### 3.2 정체성 아바타 (얼굴 → 전신 앵커)

| 옵션 | 입력 | 비고 |
|------|------|------|
| **InstantID** (플러그인, 1장) | 얼굴 1장 | 오픈소스, SDXL 계열. 셀프호스팅은 GPU 필수 |
| PhotoMaker / IP-Adapter-FaceID | 1–수장 | InstantID 대비 텍스트 제어 약함 |
| **Higgsfield Soul ID** | 10장+ 권장 | 일관성 높음. 이미 Higgsfield MCP 존재하나 **키·크레딧·약관** 별도. 몰 고객 PII를 타사에 넣으려면 DPA |
| FASHN Face-to-Model | 얼굴→모델샷 | 패션 특화 API |

**추천:** 고객 경로 기본은 **1장 InstantID급 API(Replicate/FASHN Face-to-Model)** + 전신 템플릿 3종(정면 스탠딩). Soul ID는 스튜디오/인플루언서 고퀄 트랙.

소셜 프로필 사진을 무단으로 아바타 학습에 쓰지 않는다. Alta 온보딩의 Google 프로필 스코프는 **표시용**이고, 피팅용은 55번 화면처럼 **명시 업로드**.

### 3.3 의류를 몸에 입히기 (모드 B)

| 옵션 | 강점 | LEXI 판단 |
|------|------|-----------|
| **FASHN tryon-max** (2026-01, REST, Next 예제 있음) | 플랫/고스트/착용샷 모두, 신발·가방, 1k–4k, 폴링 API | **프로덕션 1순위.** Vercel 서버에서 GPU 없음 |
| FASHN tryon-v1.6 | 5–17s | 미리보기 해상도 |
| **CatVTON** (ICLR 2025) | 사람+옷 concat, ~8GB, 마스크 프리 변형 | 연구/내부 벤치. 고객 트래픽에 직접 서빙 비권장 |
| **CatV2TON** (이미지+비디오) | 숏폼 피팅 | Phase 4+ |
| IDM-VTON | 텍스처 충실 | 로고/프린트 소실 이슈 문서화됨. 벤치 대조군 |
| OOTDiffusion / OutfitAnyone | 오픈소스 대안 | 유지보수 부담 |
| Kling / 범용 I2I | 빠르지만 옷 정체성 약함 | 패션 PDP 부적합 |

**자가호스팅 CatVTON을 고객 경로에 두지 않는 이유:** Neon+Vercel 몰은 GPU가 없고, 동시성·큐·NSFW·초상권 가드가 상용 API보다 비싸다. 오픈소스는 **품질 게이트·오프라인 평가**에 쓴다.

### 3.4 레이어 합성 (모드 A 구현체)

디퓨전 없이:

- 카테고리별 앵커 박스: outer / top / bottom / dress / shoes / bag / acc
- 컷아웃 PNG를 고정 전신 실루엣(또는 아바타 마스크) 위에 `object-fit` + z-index
- 주간 플래너(110)는 1차에서 **저장 룩 썸네일 7칸**만. 날씨 API는 선택

이 방식이 Alta 홈(20, 110)의 “인형옷”에 해당한다.

---

## 4. LEXI 정보구조 (기존 탭을 깨지 않음)

```
홈
  ├ 에디토리얼 히어로 (현행)
  └ [신규] 오늘의 룩  — 모드 A 보드 + 「내 몸에 입혀보기」→ B (로그인·쿼터)

카테고리 / 검색 / 장바구니     변경 없음 (커머스 밀도 스펙 우선)

PDP
  ├ 현행 블록 (hero, usp, gallery, spec, faq, cta)  docs/lexi-pdp-ruleset.md
  ├ [신규] 룩보드에 담기 (모드 A, 즉시)
  └ [신규] 내 아바타에 입히기 (모드 B, 비동기 잡)

마이
  ├ 현행 주문/위시/설정
  ├ [신규] 내 아바타 (얼굴 가이드, 재생성, 삭제)
  ├ [신규] 내 룩북 (저장 룩, 공유 링크)
  └ [신규] 피팅 크레딧 (잔여/사용 내역 — 허위 리워드 금지)
```

중앙 `+` 탭은 넣지 않는다. 장바구니 전환과 충돌한다. 룩 추가는 PDP와 위시에서.

---

## 5. 화면 기획 (LEXI 카피, Alta 구조만)

### 5.1 아바타 온보딩

1. 가이드: 정면, 단독, 강한 역광 금지, 선글라스 비권장.  
2. 카메라/앨범. EXIF 위치 제거.  
3. 생성 중: 얼굴 블러 프리뷰 + “정체성 고정 중 · 실측 피팅 아님”.  
4. 결과 3후보 → 하나 채택. 원본은 private blob, 공개 URL 금지.  
5. 삭제: 아바타·파생 피팅 전부 파기.

### 5.2 룩 빌더 (모드 A)

- 캔버스: 전신 실루엣 또는 채택 아바타 정지컷.  
- 하단 칩: 상의/하의/원피스/아우터/슈즈/가방.  
- 그리드: 컷아웃 + 브랜드 + 가격(tabular-nums).  
- 슬롯당 1 SKU. 원피스는 top+bottom 잠금.  
- CTA: 룩 저장 / 구성 SKU 장바구니 담기 / (있으면) 실사 피팅.

### 5.3 PDP 「내 몸에」

- 1차: 룩보드에 해당 카테고리 슬롯으로 삽입.  
- 2차: 잡 생성 → 폴링 → 결과 시트(배경 스와치는 에디토리얼 3종만: 한지 톤, 먹, 스튜디오 그레이). Alta 레오파드 배경은 브랜드 불일치로 불채택.  
- 피드(250)는 **실사용자 동의분**만. 시드/더미를 “방금 전” 소셜로 위장 금지 (`pdp/ruleset.ts`).

### 5.4 실패·대기

Alta 40번 토스트를 차용: “사진을 다듬지 못했습니다. 다시 시도하세요.”  
LEXI: 재시도 1회 + 컷아웃 없이 원본 사용 폴백(모드 A만). 모드 B 실패 시 룩보드로 강등.

한글: 자간 0, 본문 14px, line-height 1.6+, `word-break: keep-all`, 제목 `text-wrap: balance`, 이탤릭 남용 금지. Alta 영문 이탤릭 헤드라인은 한글에서 굵기·색으로 대체.

---

## 6. 데이터·API (구현 시 초안)

더미 `DATABASE_URL` 없이도 계정 없이 **게스트 실루엣 + 시드 컷아웃 6벌**로 모드 A 동작.

제안 테이블(이름만, 스키마 push는 승인 후):

- `user_avatars`: userId, sourceHash, modelUrl, status, provider, consentAt  
- `garment_cutouts`: productId, assetId, pngUrl, categorySlot, qualityScore  
- `looks`: userId, title, occasion, itemIds[], layoutJson, coverUrl  
- `vto_jobs`: lookId or productId, avatarId, providerJobId, status, outputUrl, error  

API:

- `POST /api/looks` `GET /api/looks/:id`  
- `POST /api/avatar` 업로드 → 잡  
- `POST /api/vto/run` provider 추상화 (`fashn` | `replicate-catvton` 내부전용)  
- `GET /api/vto/jobs/:id`  
- Import 훅: 상품 이미지 확정 시 cutout 큐

시크릿: `FASHN_API_KEY` 등 `.env` / Neon `provider_api_keys`. 채팅·git 금지. 키는 lexiwiki 슬롯 조회 패턴.

---

## 7. 가드 (커머스·법·브랜드)

- 카피: “참고 이미지입니다. 핏·색은 실물과 다를 수 있습니다.”  
- 생체/얼굴: 명시 동의, 목적 한정, 제3자 모델 학습 옵트아웃.  
- 미성년 얼굴 업로드 차단(기존 계정 정책과 정합).  
- 생성물 워터마크 옵션(무료 쿼터).  
- 공급사 스팸 단어·가짜 리뷰 카운트 금지 (기존 PDP 룰).  
- Alta/Mobbin 에셋을 스토어프론트에 넣지 않음.

---

## 8. 페이즈

| 페이즈 | 범위 | 성공 기준 |
|--------|------|-----------|
| **0 기획** | 본 문서 | 승인 |
| **1 컷아웃** | Import/시드에 BiRefNet 또는 수동 PNG, `dressable` 플래그 | 패션 SKU 80%+ 알파 PNG |
| **2 룩보드** | `/looks/new`, 홈 섹션, PDP 담기, 장바구니 일괄 | 모바일 390폭에서 슬롯 교체·저장 |
| **3 아바타** | 가이드+1장 생성+마이 | 얼굴 식별 가능, 삭제 동작 |
| **4 VTO** | FASHN tryon-max, 쿼터, 잡 UI | 의류 1장 p95 < 45s, 로고 소실 시 룩보드 안내 |
| **5 소셜·영상** | 동의 피드, CatV2TON 숏폼 | 별도 승인 |

병렬 가능: 1과 2의 UI 셸. 3은 1 없이 템플릿 바디로 가능하나 품질 낮음.

비범위 1차: 주간 캘린더 자동화, Crisp 아바타 보상, Alta식 중앙 + 탭, 자체 GPU 서빙.

---

## 9. 비용·인프라

- Vercel: UI·잡 상태만. 장시간 GPU 금지.  
- Render: BiRefNet 배치 워커(에페메럴 디스크 → 결과는 Neon/객체스토리지).  
- 상용 VTO: 장당 과금 가정, 유저당 일 3 / 월 20 기본안(요금 확정 후 조정).  
- dummy 모드: API 호출 없이 고정 시드 피팅 이미지. 배너로 구분.

---

## 10. 벤치 프로토콜 (오픈소스 vs API)

출시 전 내부 20룩(상의/하의/원피스/아우터/슈즈) × 3바디:

1. FASHN tryon-max 1k  
2. CatVTON HuggingFace Space 또는 로컬  
3. IDM-VTON 대조  

채점: 옷 실루엣, 프린트 가독, 손/얼굴 붕괴, 아시아 피부·체형. **승자는 점수표로만.** 추측으로 모델 고정하지 않음.

레퍼런스:

- CatVTON https://github.com/Zheng-Chong/CatVTON  
- CatV2TON https://github.com/Zheng-Chong/CatV2TON  
- Awesome-Try-On-Models https://github.com/Zheng-Chong/Awesome-Try-On-Models  
- InstantID https://instantid.github.io/  
- FASHN API https://docs.fashn.ai/api-reference/tryon-max  
- FASHN Next 예제 https://github.com/fashn-AI/tryon-nextjs-app  
- 오픈소스 4종 비교(2025) https://fashn.ai/blog/comparing-the-top-4-open-source-virtual-try-on-viton-models  

---

## 11. 기존 LEXI와의 정합

| 현행 | 본 기획 |
|------|---------|
| 5탭 커머스 | 유지. 룩은 탭을 뺏지 않음 |
| PDP Gemini 블록 | 피팅 블록은 별 컴포넌트. 생성 카피를 ruleset에 “실측 아님” 강제 |
| HQ 카탈로그·CJ | 컷아웃은 몰 에셋. 공급사 원본 HTML 금지 |
| Studio/dbd | 룩 커버를 에디토리얼 히어로로 쓰는 건 Studio 소유. 고객 얼굴은 몰만 |

---

## 12. 다음 승인 한 가지

**페이즈 1–2(컷아웃 + 룩보드)만 구현**하는 것을 권한다. 아바타·FASHN은 키·약관·쿼터 숫자 확정 후 페이즈 3–4.

구현 착수는 이 문서 승인 후.
