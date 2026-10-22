# LEXI 마케팅 PDP — 프롬프트·생성 규칙 (v1)

> 정본: HQ `/hq/pipeline/pdp` + `ConceptSpec` + `renderPdp`  
> 시안 목업(글로우 세럼 30ml): `docs/pdp-marketing-mocks/`  
> 기존 무결성: `docs/lexi-pdp-ruleset.md` — **가짜 리뷰·허위 인증 금지**는 유지

---

## 한 줄 원칙

CJ(또는 카탈로그) **원본 제목 + 원본 히어로/갤러리**를 시드로 삼아,  
이미지를 **재생성(리라이트)** 하고 카피는 **로망·결핍·베네핏·신뢰** 3막으로 쓴다.  
자유 HTML이 아니라 **구조화 JSON + 이미지 레시피 3장**이 산출물이다.

페이지 문법·모델·언어·상품명 규칙은 **SAMPLE3 정본**을 따른다:  
`docs/lexi-sample3-pdp-style.md` → **「상품페이지 생성지침」**  
(동일 모델 얼굴 3장 · 이미지 텍스트 EN · 본문 locale · CJ=`titleInternal` / 마케팅=`titleMarketing`).

---

## 시안 목업에서 뽑은 시각 규칙 (글로우 세럼 3컷)

| # | 파일 | 역할 | 관찰된 규칙 |
|---|------|------|-------------|
| S1 | `pdp-mock-glow-s1-hero.png` | 히어로·후킹 | 제품이 **영웅급 전경**. 대리석·아침광·물결로 **수분·광채** 암시. 라벨 텍스트 없음. 금/로즈골드 포인트. 얕은 심도. |
| S2 | `pdp-mock-glow-s2-benefit.png` | 베네핏·제형 | **매크로 1방울**이 주인공. 이슬·잎으로 순수·고농축 암시. 제품 병 전체가 없어도 됨. 초록×골드 대비. |
| S3 | `pdp-mock-glow-s3-trust-cta.png` | 신뢰·CTA | **선물 언박싱** 무드 + 하단 **아이콘 스트립 + CTA 밴드**. 별점 숫자·리뷰 수 등 **가독 허위 수치 금지**(보케·빛만 허용). |

공통 금지(이미지): 워터마크, 읽히는 영문/한글 라벨, 공급사 로고, 마켓플레이스 스톡 워터마크, CJ CDN URL 그대로 게시.

---

## 입력 계약 (소스 반영 — 필수)

생성 전 서버/스튜디오가 반드시 채운다.

```
SourceSeed
  catalogId
  titleInternal     ← CJ/카탈로그 원제 그대로 (스펙 테이블 Internal name)
  titleMarketing    ← LEXI 재작성 외부 노출명 (locale, H1/SEO)
  categoryPath
  price + currency
  sellerName?
  sourceImageUrls[] ← Import/Blob 또는 thumb (CJ 원본 URL은 생성 프롬프트 참조만, 게시 금지)
  modelCast         ← gender + look/nationality; S1 face lock for S2/S3
  locale: ko | en | ms | …
```

이미지 프롬프트에는 항상 포함한다:

1. **Product identity:** `{title}` + 용량/형태 추정(병·튜브·박스 등 — 소스 이미지에서 읽은 형태 우선)  
2. **Reference lock:** “match product silhouette and material from reference photo; do not invent a different SKU”  
3. **LEXI 토큰:** paper `#faf9f7`, ink `#1a1a1a`, accent `#e85d4c` (소량)  
4. **No text in frame**

---

## 3막 구조 (마케팅 섹션 = 생성 규칙)

### Act 1 — Hero & Hook (`hero` + 히어로 이미지 S1)

| 슬롯 | 규칙 | 글로우 세럼 업그레이드 예시 |
|------|------|---------------------------|
| Pain | 타겟의 **일상 결핍 1문장** (과장 금지, 임상 수치 금지) | “푸석하게 무너진 오늘 아침, 메이크업으로만 가리실 건가요?” |
| Desire | **로망 1문장** (광채·결·수분 등 카테고리 언어) | “단 한 방울로 깨어나는 본연의 맑은 빛” |
| Visual | S1 레시피: 소스 제품 + 프리미엄 표면 + 아침광 + 수분 힌트 | 대리석 화장대·물결·골드 캡 |

이미지 프롬프트 템플릿:

```
Hero product photo of {title}. Preserve bottle/shape from source reference.
Luxury morning light, marble vanity, soft water ripples suggesting moisture,
{category} editorial commerce, cream paper mood, gold accent metal if present on source,
no label text, no logo, photorealistic, 4:5.
```

### Act 2 — Benefit & Detail (`usp`×3 + `story` + 매크로 이미지 S2)

| 슬롯 | 규칙 |
|------|------|
| Macro visual | 제형·성분 **감각**을 보여 줌 (병 전체 불필요) |
| USP ×3 | 각 1줄. **검증 가능한 표현만**. 소스에 없는 성분·인증 금지 |
| Story | 2~4문장. 공급사 HTML 복붙 금지 |

이미지 프롬프트 템플릿:

```
Macro beauty still of {title} texture: single luminous droplet / fabric weave / cream swirl
matching color of source product liquid or surface. Dewy leaves or clean studio props,
shallow depth of field, no bottle label text, square, commercial K-beauty.
```

USP 작성 규칙:

- ✅ “끈적임 적은 윤광 텍스처”, “데일리로 바르기 쉬운 산뜻한 마무리”  
- ❌ “EWG 그린 등급”, “재구매율 1위”, “리뷰 5,000건” (소스 `rawMeta`/인증 필드에 **실데이터 있을 때만** 허용)

### Act 3 — Trust & CTA (`faq`×2 + `cta` + 신뢰 이미지 S3)

| 슬롯 | 규칙 |
|------|------|
| Trust visual | 선물·개봉·안심 무드. **숫자 배지 텍스트 렌더 금지** |
| FAQ | 반품/관세 또는 사용·보관 — LEXI 표준 |
| CTA | 행동 동사 + 혜택 언어. 채널 송출 가능 길이 |
| Urgency | “선착순·1+1” 등은 **운영 프로모션 플래그가 true일 때만** |

이미지 프롬프트 템플릿:

```
Unboxing lifestyle of {title} in open gift box with satin lining,
soft peach-cream bokeh sparkle (no readable stars or numbers),
editorial commerce, space at bottom third for UI overlay, no text in photo.
```

CTA 예시(검증됨): `장바구니 담기` / `내 피부에 수분 광채 채우기`  
긴급 띠는 UI 레이어로만 (이미지에 구우지 않음).

---

## 카피 JSON 스키마 (공장 입력)

`PdpStructured` 확장 힌트 — 본문은 기존 필드에 매핑:

| 마케팅 슬롯 | JSON 필드 |
|-------------|-----------|
| Pain + Desire | `subtitle` = Desire 요약; `descriptionHtml` 첫 `<p>` = Pain→Desire |
| Benefit bullets | `usps[0..2]` |
| Trust FAQ | `faq[0..1]` |
| CTA | `ctaLabel` |
| SEO | `seoKeywords` ← 카테고리·브랜드 LEXI만 |

`ConceptSpec.imageRecipe`는 **장당 3레시피**로 확장:

```
imagePlan: [
  { role: "hero",   promptTemplate: "S1...", size: "portrait" },
  { role: "macro",  promptTemplate: "S2...", size: "square" },
  { role: "trust",  promptTemplate: "S3...", size: "landscape" }
]
```

생성 후 `assetUrls = [hero, macro, trust]` → gallery는 1·2 인덱스.

---

## 마케팅 심리 체크리스트 (프롬프트에 넣되 허위는 차단)

1. **Pain → Desire** (Act1)  
2. **Proof by texture** (Act2 매크로)  
3. **Risk reversal** (FAQ·저자극 등은 검증 시에만)  
4. **CTA clarity** (버튼 1개)  
5. **Scarcity** (프로모션 플래그 있을 때만)

---

## 금지 (기존 ruleset과 합침)

- cheap / wholesale / dropshipping / hot sale / free shipping  
- 가짜 리뷰 수·순위·임상 %  
- 소스에 없는 인증·성분 단정  
- CJ 원본 URL을 공개 PDP/채널에 게시  
- 이미지 속 읽히는 프로모션 문구

---

## HQ 적용 순서

1. 시드 선택 → `SourceSeed` 주입  
2. `generateMarketingAssets`로 imagePlan 3장 (studio·factory 공용; 실패 시 mock·소스 thumb 폴백, PDP는 계속)  
3. Gemini/template 카피 → `PdpStructured`  
4. `renderPdp` + `editorial-fullbleed` (기본)  
5. 잠금 → 공장 N건 (동일 `ConceptSpec` · 동일 3-shot 스타일 레시피, SKU 제목만 치환)

검증: Dummy로 시드 1건 → HTML에 hero/macro/trust 최대 3 URL · USP 3 · FAQ 2 · CTA.  
공장: 잠긴 템플릿 `imageRecipe.generate` 시 N건 각각 3-shot 시도.

---

## 글로우 세럼 시안 카피 (무결성 업그레이드본)

원안 대비 **가짜 수치·미검증 인증 제거**, 구조만 유지.

- Act1 Desire: “단 한 방울로 깨어나는 본연의 맑은 빛”  
- Act2 USP: 수분감 / 윤광 텍스처 / 데일리 순한 사용감 *(성분명은 소스 확인 후)*  
- Act3 CTA: “내 피부에 수분 광채 채우기”  
- FAQ: 반품·관세 표준  

시안 이미지: `docs/pdp-marketing-mocks/pdp-mock-glow-s{1,2,3}-*.png`
