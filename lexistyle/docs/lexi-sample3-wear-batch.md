# LEXI SAMPLE3 여성패션 착용샷 PDP 배치 (ComfyUI FLUX)

생성일: 2026-09-06

## 방식
AMBA 캐스트 화보(face seed) → **ComfyUI 로컬 FLUX.1 schnell img2img** → 여성패션 상품 착용샷 PDP.
로컬 GPU 사용, 유료 API/크레딧 무차감.

- S1 Hero = 캐스트 화보 기반 img2img(denoise .72) → 모델이 상품을 입은 전신 편집샷
- S2 Macro = CJ 상품 이미지 기반 img2img(.68) → 원단·디테일 클로즈업
- S3 Desire = S1 결과 기반 img2img(.58) → 같은 얼굴·착장 라이프스타일
- OG = S1 기반 1200×630

## 산출물 (public/sample3/mock-*)

| catalog | mock | AMBA 모델 | 판매가 |
|---|---|---|---|
| #36 | mock-fashionable-and-sexy-sequined-halter-51617700 | 이자벨라(0445) | $45.9 |
| #42 | mock-backless-lace-panel-sexy-slim-fit-so-11611100 | 소피아(0422) | $37.9 |
| #43 | mock-womens-outdoor-casual-commuter-dress-51624700 | 디야(0431) | $35.9 |
| #48 | mock-womens-short-a-line-dress-with-long--01609000 | 유나(0384) | $35.9 |
| #52 | mock-sexy-chic-slim-fit-sheath-skirt-with-71605700 | 보람(0393) | $43.9 |
| #71 | mock-womens-plus-size-casual-floral-shirt-91627000 | 누르(0437) | $33.9 |
| #92 | mock-retro-belted-waist-defined-maxi-skir-21608600 | 징화(0399) | $43.9 |
| #95 | mock-peacock-blue-deep-v-neck-ruffled-dre-61630800 | 미오(0408) | $43.9 |
| #18 | mock-new-stylish-age-reducing-waist-cinch-91621400 | 아마야(0434) | $37.9 |

## 스크립트
- `scripts/gen-amba-wear-batch.mjs` — 배치 생성 (CAND_IDS / LOW_MEM 지원)
- `scripts/gen-amba-wear-mock.mjs` — 단건 생성
- `scripts/optimize-mock-images.mjs` — WebP 4:5/1:1 크롭 + quality 70 (~40% 용량 절감)

## 배포
- PR #17 머지 (main 59e26e2) · GitHub 연동 Vercel 프로덕션 배포 트리거