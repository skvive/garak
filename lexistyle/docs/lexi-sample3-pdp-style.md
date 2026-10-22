# SAMPLE3 — LEXI 에디토리얼 상품페이지 스타일 (정본)

> **Style ID:** `SAMPLE3`  
> **Agent skill:** `.cursor/skills/lexi-sample3-pdp/SKILL.md` (+ `spec-table.md`)  
> **Cursor rule:** `.cursor/rules/sample3-pdp.mdc`  
> **Live reference:** https://lexistyle.vercel.app/sample3  
> **코드:** `src/lib/hq/seeds/sample3-style.ts`  
> **제품 시드 예시:** LEXI1 하트티 (`docs/lexi1-pdp-generation-rules.md`)

에이전트가 상품페이지를 만들 때 **스킬을 먼저 읽고**, 이 문서의 레이아웃·카피·OG·브랜드 노출을 따른다.  
제품 DNA(실루엣·자수·컬러)만 SKU별로 바꾸고, 페이지 문법은 SAMPLE3를 고정한다.

## 역할 분리

| 층 | ID | 역할 |
|----|-----|------|
| 페이지 스타일 | **SAMPLE3** | 레이아웃·토큰·블록·OG·브랜드 노출·1.5× 카피 |
| 제품 DNA | 예: **LEXI1** | 하트티 형태·이미지 프롬프트·목업 경로 |

## 불변 원칙 (모든 상품 공통)

1. 브랜드는 **LEXI**만. 경쟁 브랜드명·로고·가짜 인증 금지.
2. 토큰: `paper #faf9f7` · `ink #1a1a1a` · `accent #e85d4c` · `cream #ebe6dc` · radius `14px` · hero `4/5`.
3. 레이아웃: `editorial-fullbleed`. 퍼플 그라데이션·이모지 불릿 금지. 한글 자간 조정 금지.
4. 블록 순서(고정):
   `brand` → `hero` → `gallery` → `brand-mark`(시안 비교, 선택) → `usp` → `story` → `styling` → `spec` → `faq` → `cta`
5. 이미지 3막: S1 Hero / S2 Detail(macro) / S3 Desire(trust). **별점·가격 스티커·허위 배지 금지.**
6. 카피 ~**1.5×**: 리드 1문장 + 스토리 2단락 + USP 3 + 스타일링 노트 3 + FAQ 3 + 브랜드 노트 1 + CTA에 LEXI.
7. locale `ko` | `en` | `ms` (및 스토어 지원 언어) **동일 스키마**. 가짜 리뷰/구매수/% 날조 금지.
8. **게시 시 OG 필수:** 1200×630 크림 페이퍼 카드 — `LEXI.` 워드마크 + 제품 히어로 + **영문 마케팅 타이틀**(이미지 베이크).  
   - 생성: `npx tsx scripts/generate-lexi-og.ts`  
   - sample3: `/sample3/og.jpg` · 사이트 기본: `/og/lexi-default.jpg`  
   - 스토어 PDP: `buildProductMetadata` (`src/lib/seo/og.ts`) → `/product/[slug]` `generateMetadata`  
   - **페이지 본문에 SHARE · OG 섹션으로 표기** (`sample3OgPreviewHtml` / `renderDesignDoc` og 블록)  
   - `og:image` + Twitter `summary_large_image`.

---

## 상품페이지 생성지침 (SAMPLE3 · 필수)

### A. 화보 모델 — 동일 얼굴 락 + 가상 프로필

| 규칙 | 내용 |
|------|------|
| 1인 1얼굴 | **한 SKU의 S1·S2·S3는 같은 모델 얼굴**로 진행한다. |
| 얼굴 시드 | S1 Hero를 얼굴 정본으로 확정 → S2/S3 생성 시 **S1을 reference**로 넣어 identity 유지. |
| 성별·국적 | 카테고리·실루엣에 맞게 남자/여자·국적을 **SKU당 1회** 선택 후 3장 고정. |
| S2 예외 | 순수 원단·봉제 매크로만이면 얼굴 생략 가능. **얼굴이 보이면** S1과 동일 얼굴이어야 한다. |
| 금지 | 장마다 다른 모델로 교체, 인종·연령을 샷마다 바꾸기. |

#### 고객 페이지 표기 — 가상 프로필 (필수)

페이지의 「이 상품의 화보 모델」에는 생성 과정·Face lock·원본 썸네일 안내를 **쓰지 않는다.**  
대신 **가상의 앰버서더 프로필**을 붙인다.

| 필드 | 규칙 |
|------|------|
| 이름 | 가상 예명 (locale 표기 가능, 예: `서아린 · Seo Arin`) |
| 성별 | 남성 / 여성 |
| 국적 | 실제 국가명 (예: 대한민국, 일본, 미국) |
| 관심사 | 상품·룩과 맞는 관심사 2~3개 |
| 소속사 | 고정 **`AMBA` (AI Ambassador)** |

내부 생성 메모(Face lock, 의상 continuity)는 `meta.json` / HQ에만 두고 스토어프론트에는 노출하지 않는다.

#### 캐스트 라이브러리

```
public/casts/amba/{id}_{eth}_{nat}_{sex}_{age}/face.webp + meta.json
```

- 임포트: `npm run casts:import-amba` (lookbook-1000 `status=done`)
- 런타임 선택: `src/lib/pdp/amba-casts.ts` (`pickAmbaCast` → `toModelCast`)
- PDP `modelCast.faceSeed` = cast `publicPath` 또는 `./face.webp`

### B. 언어 분리 — 이미지 vs 본문

| 영역 | 언어 | 예시 |
|------|------|------|
| **이미지에 들어가는 텍스트** | **English only** | 갤러리 figcaption (`Hero` / `Detail` / `Desire`), 이미지 위 칩·라벨, OG 카드에 구운 타이틀, brand-mark 시안 라벨 |
| **페이지 본문 카피** | **locale** (`ko`/`en`/`ms`/…) | H1 마케팅명, subtitle, lead, USP, story, styling, FAQ, brand-note, CTA |
| **섹션 kicker** | English (UI 라벨) | `WHY LEXI` · `STORY` · `STYLING` · `DETAILS` · `FAQ` · `SHARE · OG` |
| **eyebrow** | English | `LEXI CURATED · …` |

> 본문(HTML/JSON 카피)은 나라별 언어. 픽셀에 구워 넣는 글자·이미지 오버레이 표기는 영어.

### C. 상품명 — 내부(CJ) vs 외부(마케팅)

| 필드 | 출처 | 어디에 쓰나 |
|------|------|-------------|
| **Internal name** (`titleInternal`) | CJ/카탈로그 **원제 그대로** | `DETAILS` 스펙 테이블 행 `Internal name` (운영·소싱 추적) |
| **Marketing name** (`titleMarketing`) | LEXI가 **간결·센스 있게 재생성** | H1, OG·SEO title(메타), 카드 리스트, CTA 주변 노출명 |

규칙:

1. CJ 원제(긴 영문·스팸 단어 포함)를 **고객향 H1에 그대로 쓰지 않는다.**
2. 마케팅명은 한 줄·읽기 쉬운 길이(권장 ko 8~18자 / en 2~6 words). 과장·가짜 인증 금지.
3. 스펙 테이블 최소 행:

```
Brand          | LEXI
Product        | {titleMarketing}     ← 외부 노출명
Internal name  | {CJ original title}  ← 내부 원제 (테이블 전용)
Fit / Color / Season | …
```

고객 페이지에 **Ruleset / face-lock / cost 공식 / externalId / og:image 배선 설명**을 넣지 않는다.

브랜드 노트(고정):

```
LEXI IS RPCOW.
Radiant Presence, Captivating Outfit for your Wardrobe.
```

4. locale마다 `titleMarketing`을 번역·로컬라이즈하되, **Internal name은 CJ 원문 고정**(보통 영문 공급사 타이틀).

### D. 생성 순서 (체크)

1. CJ 썸네일로 **제품 실루엣·프린트·색** 확인  
2. 모델 성별·국적 선택 → S1 생성 → **얼굴 락**  
3. S1 reference로 S2·S3 생성 (동일 착장 continuity)  
4. `titleMarketing` 작성(locale) + `titleInternal` = CJ 원제  
5. 본문 카피 locale / 이미지·figcaption·OG 베이크 텍스트 English  
6. SAMPLE3 블록 조립 → sharp WebP → 게시

## 브랜드 노출

- 상단 워드마크 `LEXI.` (accent period)
- brand-strip: `LEXI · …` / `Curated by LEXI`
- 제품에 맞는 **소형 브랜드 마크**(자수·택·프린트) — 시안 2~3장 생성 후 1장 히어로 채택
- CTA: locale 예) `LEXI 장바구니 담기` / `Add to LEXI bag`
- 하단 © LEXI

## 카피 프롬프트 골격

```
Voice: quiet editorial romance / 담백한 설렘 / LEXI Curated
Names: titleInternal=CJ raw; titleMarketing=short senseful rewrite (locale)
Act1 Hook: eyebrow EN (LEXI CURATED · …) + subtitle locale + lead locale
Act2 Benefit: usps×3 + styling notes×3 (locale)
Act3 Trust: faq×3 + brand-note 1줄 + cta with LEXI (locale)
Image labels / OG bake text: English only
```

## 이미지·OG 프롬프트 골격

```
Hero/Macro/Trust: SAME model face identity (lock to S1 reference); same garment continuity;
  cream-paper / cafe-window / soft plaza lifestyle; K-fashion magazine;
  no price/star stickers; no competitor logos; brand atmosphere LEXI.
  Any baked-in caption text on the bitmap must be English (prefer none except OG).

OG (landscape 1200×630): cream paper (#faf9f7), large "LEXI." top-left with coral period,
  product hero crop (same model), English marketing title at bottom,
  no fake stars/prices/watermarks/purple.
```

---

## 이미지 최적화 규격 (All SKU 공통)

모든 상품페이지 이미지는 아래 규격으로 생성한다. **웹 최적화**(모니터 해상도 기준, 장당 40~300KB)를
원칙으로 하며, 원본 화질 유지보다 로딩 속도 우선.

| 역할 | 포맷 | 해상도 | 비율 | WebP Quality | 목표 용량 |
|------|------|--------|------|-------------|----------|
| Hero (S1) | WebP | 960×1200 | 4:5 portrait | 78 | 50~150KB |
| Macro (S2) | WebP | 720×720 | 1:1 square | 78 | 40~120KB |
| Trust (S3) | WebP | 960×1200 | 4:5 portrait | 75 | 50~150KB |
| OG card | WebP | 1200×630 | 1.91:1 | 80 | 60~200KB |
| Gallery extra | WebP | max 960px long side | 가변 | 75 | 40~150KB |

### 이미지 생성 우선순위

| 순위 | 방법 | 조건 | 비용 |
|------|------|------|------|
| **1원칙** | CJ 원본 → sharp WebP 리사이즈 | CJ 썸네일/갤러리 존재 | **무료** (로컬 CPU) |
| **2원칙** | ComfyUI 로컬 T2I (FLUX.1 schnell) | `flux1-schnell-fp8.safetensors` in checkpoints | **무료** (로컬 GPU) |
| **3원칙** | Cursor 이미지 생성기 | 2원칙 불가 시 | 무료 or 유료 (환경 의존) |
| **4원칙** | OpenRouter API (유료) | 사용자 명시 허락 시에만 | 유료 (가성비 모델) |

### sharp 최적화 파라미터 (코드 기준)

```typescript
// src/lib/catalog/assets.ts (상품 자산 저장)
const SIZES = { thumb: 160, card: 480, pdp: 1200 };
// WebP quality: thumb=70, card/catalog=78

// scripts/gen-one-comfy-sample3-pdp.ts (PDP 페이지 이미지)
const IMAGE_SPECS = {
  hero:  { width: 960, height: 1200, fit: "inside", quality: 78 },
  macro: { width: 720, height: 720,  fit: "inside", quality: 78 },
};

// sharp 체인
sharp(buf)
  .rotate()                                 // EXIF orientation 자동 보정
  .resize(w, h, { fit: "inside" })          // longest side 기준, 확대 허용
  .webp({ quality: 78, alphaQuality: 80, effort: 4 })
  .toBuffer({ resolveWithObject: true });
```

### UX 고려

- **용량 < 40KB**도 OK — 썸네일 급은 아니며 모니터에서 선명하게 보이는 범위
- 이미지가 300KB 초과 시 quality를 75→70으로 낮춤
- OG 이미지는 반드시 1200×630 고정 (SNS 공유 미리보기 품질 유지)
- CJ 원본 URL을 그대로 PDP에 게시하지 않음 — 항상 sharp 처리 후 저장

## 새 상품 작업 체크리스트

1. HQ `/hq/pipeline/pdp`: 상품 목록에서 선택 → 스튜디오로 보내기
2. `titleInternal`(CJ 원제) 고정 + `titleMarketing`(locale) 재작성
3. 모델 성별·국적 선택 → S1 얼굴 락 → S1 reference로 S2·S3 (동일 얼굴)
4. 제품 DNA 시드 → `sample3ConceptSpec({ formHint, title: titleMarketing, imagePlan })`
5. 본문 locale / 이미지·figcaption·OG 베이크 English 확인
6. DETAILS 테이블에 Internal name 행 포함 → 「완료 · 문서 저장」 → Export
7. OG(영문 마케팅 타이틀) + 메타 배선 → 배포 URL 확인
8. 이 문서 + AGENTS.md 사실과 어긋나면 문서 먼저 갱신

## 스크립트

| 목적 | 명령 |
|------|------|
| LEXI1 라이브 페이지 재생성 | `npx tsx scripts/make-lexi1-pdp.ts` |
| OG + 가슴 브랜드 시안 | `npx tsx scripts/lexi1-brand-mockups.ts` |
| 로컬 서빙 | `node scripts/serve-lexi1-pdp.mjs` → :8768 |

## 참조 구현

- Live: `/sample3` · `public/sample3/`
- Seed style: `src/lib/hq/seeds/sample3-style.ts`
- Heart-tee DNA: `src/lib/hq/seeds/lexi1-heart-tee.ts`
