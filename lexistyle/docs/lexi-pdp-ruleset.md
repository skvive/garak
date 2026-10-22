# LEXI PDP Ruleset v1

See code: `src/lib/pdp/ruleset.ts`  
Marketing 3-act prompts: `docs/lexi-pdp-marketing-prompt-rules.md`, `src/lib/pdp/marketing-prompt.ts`  
Mocks: `docs/pdp-marketing-mocks/`

## SAMPLE3 page style (canonical for new PDPs)

에디토리얼 풀페이지(브랜드 노출 · 1.5× 카피 · OG · 스타일링 노트)는  
**[lexi-sample3-pdp-style.md](./lexi-sample3-pdp-style.md)** + `src/lib/hq/seeds/sample3-style.ts` 가 정본이다.  
라이브 레퍼런스: https://lexistyle.vercel.app/sample3  
제품 DNA 예: LEXI1 (`docs/lexi1-pdp-generation-rules.md`).

## Required blocks
- hero, usp (3), gallery, spec-table, faq (2), cta
- **SAMPLE3 확장:** brand, brand-mark, story, styling; faq **3**; OG 1200×630
- Marketing mapping: Act1→subtitle/description · Act2→usps · Act3→faq/cta + imagePlan hero/macro/trust

## Brand rules
- No supplier spam (cheap/wholesale/dropshipping/hot sale/free shipping)
- No invented certifications or fake review counts
- Optimized asset URLs only (never CJ origin URLs on public PDP)
- Image prompts must include source product title; no readable text in generated frames
- Provider: Gemini (`GEMINI_API_KEY`) with template fallback
- Studio generateImage: up to 3 marketing shots (hero/macro/trust); failures soft-fallback