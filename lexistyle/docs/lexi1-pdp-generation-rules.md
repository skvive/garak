# LEXI1 — 하트 자수 티 제품 DNA

> **Product ID:** `LEXI1`  
> **페이지 스타일:** **SAMPLE3** ([lexi-sample3-pdp-style.md](./lexi-sample3-pdp-style.md)) — 레이아웃·OG·카피 분량의 정본  
> **상세 기획:** [lexi-fashion-pdp-prompt-heart-tee.md](./lexi-fashion-pdp-prompt-heart-tee.md)  
> **코드 시드:** `src/lib/hq/seeds/lexi1-heart-tee.ts` → `sample3ConceptSpec(...)`  
> **라이브:** https://lexistyle.vercel.app/sample3

에이전트는 **패션 베이직 티**를 만들 때 LEXI1 DNA + SAMPLE3 페이지 문법을 함께 쓴다.  
다른 카테고리/SKU는 DNA만 새로 쓰고 **페이지는 SAMPLE3를 재사용**한다.

## 제품 DNA (LEXI1만)

1. 블랙 코튼 반팔 · 라운드넥 · 기본핏 · 통기·데일리
2. 좌측 가슴 미니 핑크 하트 자수 (+ 히어로 권장: 하트 위 소형 `LEXI` 워드마크)
3. 보이스: 담백한 설렘 · heart tee
4. 목업: `pdp-mock-lexi-heart-tee-s{1,2,3}-*.png` · 브랜드 히어로 `sample3/assets/s1-hero-brand.jpg`

## 페이지·카피·OG

SAMPLE3 정본을 따른다. 요약:

- 블록: brand → hero → gallery → brand-mark → usp → story → styling → spec → faq → cta
- ~1.5× 분량 · FAQ 3 · 스타일링 노트 3 · CTA에 LEXI
- OG 1200×630 필수 · 3막 이미지 · 가짜 리뷰 금지

## HQ 적용

`/hq/pipeline/pdp`: 목록 → 스튜디오로 보내기 → SAMPLE3 생성·저장 → Export.

```ts
import { lexi1ConceptSpec, LEXI1_PRODUCT, LEXI1_ID } from "@/lib/hq/seeds/lexi1-heart-tee";
import { sample3ConceptSpec, SAMPLE3_STYLE_ID } from "@/lib/hq/seeds/sample3-style";
import { defaultConceptSpec } from "@/lib/pdp/concept-spec";

const concept = defaultConceptSpec(catalogId, title); // HQ 기본 = SAMPLE3
const lexi1 = lexi1ConceptSpec(catalogId); // LEXI1 DNA + SAMPLE3 page

// 다른 SKU 예:
const other = sample3ConceptSpec({
  rulesetId: "LEXI-KNIT-1",
  title: "…",
  formHint: "knit mini dress …",
});
```

## 미리보기

`npx tsx scripts/make-lexi1-pdp.ts` → `public/sample3/`  
`npx tsx scripts/lexi1-brand-mockups.ts` → OG + 가슴 시안  
로컬: http://127.0.0.1:8768/ · 배포: https://lexistyle.vercel.app/sample3
