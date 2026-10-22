# LEXI SAMPLE3 PDP 생산 인수인계

작성일: 2026-09-10 (KST)  
대상: Cursor / Grok에서 이 저장소를 열고 이어서 작업할 담당자

## Cursor / Grok 시작 프롬프트

저장소를 연 뒤 아래 문장을 그대로 전달한다.

```text
docs/cursor-grok-sample3-handoff.md와 AGENTS.md를 먼저 모두 읽어라.
SAMPLE3 Fashion Publisher 스킬과 .clinerules/sample3-pdp.mdc를 따른다.
현재 완료된 1·3·4·5·6·7번은 건드리지 말고, 2번은 보류한 채 8번 상품부터 진행한다.
원본 의상 일치를 최우선으로 하며, 상품당 AI 히어로 1장만 생성하고 S2/S3/OG는 Sharp 크롭한다.
S1 히어로는 자연스러운 무드 배경 + headroom(머리 위 여백)을 반드시 적용하고,
scripts/verify-hero-headroom.mjs 자동 검증을 통과한 뒤에만 크롭·게시한다.
원본과 다르면 게시하지 말고, 각 완료 건은 style.lexid.site 실제 주소에서 검증한 후에만 다음 상품으로 넘어가라.
토큰·.env·자격증명은 절대 출력하거나 커밋하지 마라.
```

## 목표

`https://style.lexid.site/ko/category/fashion`의 1페이지 상품 40개를 순서대로 SAMPLE3 상품 상세 페이지로 전환한다.

핵심은 **원본 상품과 화보 의상이 정확히 일치하는 것**이다. 일반적인 패션 화보를 새로 만드는 작업이 아니다. 원본의 실루엣, 색상, 원단 느낌, 넥라인, 기장, 프린트, 리본/셔링 등 핵심 구조를 유지해야 한다.

## 완료 현황

| 순서 | 원본 상품명 | 라이브 주소 | 상태 |
| --- | --- | --- | --- |
| 1 | Yellow Polka-Dot Linen Blouse For Women Lace-Trimmed V-Neck Commuter-Style Designer Top | `https://style.lexid.site/ko/product/yellow-polka-dot-linen-blouse-for-women-lace-tri-2608250355321611800` | 완료 |
| 2 | Neck-tied Sequined Dress For Women | - | 보류 — 원본의 깊은 V넥 이브닝 드레스 특성상 생성 결과 불일치/안전 차단. 억지로 게시 금지. |
| 3 | Plaid Long Skirt Bow-tie Shoulder Straps And Ruffled Waistline Dress | `https://style.lexid.site/ko/product/plaid-long-skirt-bow-tie-shoulder-straps-and-ruf-2608250611591625500` | 완료 |
| 4 | Black Slim-fit Knitted Vest Dress | `https://style.lexid.site/ko/product/black-slim-fit-knitted-vest-dress-2608250621381604600` | 완료 |
| 5 | V-neck Long-sleeve Figure-flattering Fishtail Dress For Women | `https://style.lexid.site/product/v-neck-long-sleeve-figure-flattering-fishtail-dr-2608250711581618100` | 완료 (로컬 반영, 배포 전) |
| 6 | Peacock Blue Deep V-Neck Ruffled Dress | `https://style.lexid.site/product/peacock-blue-deep-v-neck-ruffled-dress-2608250726261630800` | 완료 (로컬 반영, v2 히어로, 배포 전) |
| 7 | Medieval Retro Gothic Halloween Hooded Dress | `https://style.lexid.site/product/medieval-retro-gothic-halloween-hooded-dress-2608260717371602600` | 완료 (로컬 반영, v2 자연배경·headroom 통과, 배포 전) |
| 8 | Long-sleeve Cardigan Dress, European And American Floral Design | `https://style.lexid.site/product/long-sleeve-cardigan-dress-european-and-american-2608260732581632100` | 완료 (로컬 반영, 가든 플로럴 카디건 원피스, 배포 전) |
| 9 | Long Elegant A-line Sheath Skirt | `https://style.lexid.site/product/long-elegant-a-line-sheath-skirt-with-a-wrinkle--2608260808051628400` | 완료 (엘레건트 A라인 시스 스커트, 배포 전) |
| 10 | Womens Casual Resort-style Floral-print Dress | `https://style.lexid.site/product/womens-casual-resort-style-floral-print-dress-2608270211281603900` | 완료 (리조트 플로럴 원피스, 배포 전) |
| 11 | American-style Short Sleeve Pure Cotton T-shirt | `https://style.lexid.site/product/american-style-short-sleeve-pure-cotton-t-shirt-2608260803481627400` | 완료 (아메리칸 코튼 티셔츠, 배치 레지스트리, 배포 전) |
| 12 | Lace-trimmed Strap Top And Figure-hugging Sheath Mini Skirt Set | `https://style.lexid.site/product/lace-trimmed-strap-top-and-figure-hugging-sheath-2608260626521622100` | 완료 (레이스 트림 시스 슬립 셋업, 배치 레지스트리, 배포 전) |
| 13 | Straight-leg Yamamoto Pants | `https://style.lexid.site/product/straight-leg-yamamoto-pants-suitable-for-commuti-2608250300051614300` | 완료 (야마모토 스트레이트 팬츠, 배치, 배포 전) |
| 14 | Long-sleeve Mid-length Sheath Dress | `https://style.lexid.site/product/long-sleeve-mid-length-sheath-dress-elegant-prof-2608250155431628800` | 완료 (미디 시스 드레스, 배치, 배포 전) |
| 15 | European And American Minimalist Fitted Long-sleeve Dress | `https://style.lexid.site/product/european-and-american-style-minimalist-fitted-lo-2608270311121634700` | 완료 (미니멀 핏 긴팔 드레스, 배치, 배포 전) |
| 16 | Slimming Relaxed-fit Chic Top | `https://style.lexid.site/product/slimming-relaxed-fit-chic-top-for-women-2608250920081605100` | 완료 (슬리밍 릴렉스 탑, 배치, 배포 전) |
| 17 | Fashionable Casual Shorts Set | `https://style.lexid.site/product/fashionable-casual-shorts-set-for-summer-womens--2608250836281602800` | 완료 (서머 캐주얼 쇼츠 셋업, 배치, 배포 전) |
| 18 | Spliced Skirt Set Two-piece Outfit | `https://style.lexid.site/product/spliced-skirt-set-women-s-two-piece-outfit-2608260955071635100` | 완료 (스플라이스 투피스 셋업, 배치, 배포 전) |
| 19 | Backless Lace-panel Slim-fit Strap Long Dress | `https://style.lexid.site/product/backless-lace-panel-sexy-slim-fit-solid-color-st-2608250842111611100` | 완료 (백리스 레이스 롱 드레스, 배치, 배포 전) |
| 20 | Long-sleeved Chiffon Dress With A Small Floral Print | `https://style.lexid.site/product/long-sleeved-chiffon-dress-with-a-small-floral-p-2608250904531606000` | 완료 (잔꽃 시폰 미디 드레스, 배치, 배포 전) |
| 21 | Seaside Vacation Strapless Striped Backless Dress | `https://style.lexid.site/product/seaside-vacation-strapless-striped-backless-dres-2608250618041627100` | 완료 (스트라이프 백리스 원피스, 배치, 배포 전) |
| 22 | Womens Plus-size Casual Floral Shirt | `https://style.lexid.site/product/womens-plus-size-casual-floral-shirt-2608250802291627000` | 완료 (플로럴 프린트 셔츠, 배치, 배포 전) |
| 23 | Ruffled Floral Tassel Lace Vintage Dress | `https://style.lexid.site/product/ruffled-floral-tassel-lace-vintage-dress-2608260844301615800` | 완료 (빈티지 러플 플로럴 드레스, 배치, 배포 전) |
| 24 | Womens Loose Long Sleeved Sweatshirt | `https://style.lexid.site/product/women-s-loose-solid-color-long-sleeved-sweatshir-2608260738341621700` | 완료 (루즈 롱 슬리브 스웨트셔츠, 배치, 배포 전) |
| 25 | Girls Blue Strappy Dress | `https://style.lexid.site/product/girls-blue-strappy-dress-in-spice-girl-style-2608270551421639300` | 완료 (스파이스 걸 블루 스트랩 드레스, 배치, 배포 전) |
| 26 | Women's Dress | `https://style.lexid.site/product/women-s-dress-2608250927361634800` | 완료 (데일리 미니 드레스, 배치, 배포 전) |
| 27 | Turn-down Collar Lantern Sleeves Midi Denim Dress | `https://style.lexid.site/product/turn-down-collar-lantern-long-sleeves-single-bre-2608250744211606300` | 완료 (턴다운 카라 랜턴 슬리브 원피스, 배치, 배포 전) |
| 28 | French-style Vintage Red Floral-print Dress | `https://style.lexid.site/product/french-style-vintage-red-floral-print-dress-2608250627381634700` | 완료 (프렌치 빈티지 레드 플로럴 원피스, 배치, 배포 전) |
| 29 | Womens Lightweight Sun Protective Blouse | `https://style.lexid.site/product/womens-versatile-lightweight-sun-protective-blou-2608260827031636700` | 완료 (라이트 선프로텍트 블라우스, 배치, 배포 전) |
| 30 | Pure Black V-neck Long-sleeve Knit Dress | `https://style.lexid.site/product/pure-and-alluring-black-v-neck-long-sleeve-knit--2608250740481600900` | 완료 (블랙 V넥 니트 드레스, 배치, 배포 전) |
| 31 | Niche Design Slim Fit Slimming Top | `https://style.lexid.site/product/niche-design-slim-fit-slimming-top-2608250916341615600` | 완료 (슬리밍 핏 니트 탑, 배치, 배포 전) |
| 32 | New Stylish Waist-cinching Blouse With Lace-up Short Skirt | `https://style.lexid.site/product/new-stylish-age-reducing-waist-cinching-blouse-w-2608250932591621400` | 완료 (라체업 웨이스트 블라우스, 배치, 배포 전) |
| 33 | Retro Leopard Print Sweatpants | `https://style.lexid.site/product/retro-leopard-print-star-patch-embroidered-sweat-2608250852261620900` | 완료 (레오파드 패치 스웨트팬츠, 배치, 배포 전) |
| 34 | Womens Short A-line Dress | `https://style.lexid.site/product/womens-short-a-line-dress-with-long-sleeves-and--2608250833301609000` | 완료 (A라인 클럽 쇼트 원피스, 배치, 배포 전) |
| 35 | Sexy Printed Backless Two-piece Swimsuit | - | 자산 생성 완료 — 로컬 DB products 미등록(404). DB 반영 후 노출 |
| 36 | Crossover V-neck Pleated Long-sleeve T-shirt | - | 자산 생성 완료 — 로컬 DB products 미등록(404). DB 반영 후 노출 |
| 37 | Womens Matte Knit-panel Satin Maxi Dress | `https://style.lexid.site/product/womens-matte-knit-panel-satin-maxi-dress-2608260631541617200` | 완료 (매트 니트 새틴 맥시 드레스, 배치, 배포 전) |
| 38 | Womens Solid Color Round Neck Sleeveless Swing Dress | - | 자산 생성 완료 — 로컬 DB products 미등록(404). DB 반영 후 노출 |
| 39 | Womens Casual V-neck Three-quarter Sleeve Set | - | 자산 생성 완료 — 로컬 DB products 미등록(404). DB 반영 후 노출 |
| 40 | Lace Flower Knitted Sweater | - | 자산 생성 완료 — 로컬 DB products 미등록(404). DB 반영 후 노출 |

2번은 건너뛰고 9~40번으로 진행했다. 2번은 원본 보존형 편집 모델을 사용할 수 있을 때만 재시도한다.
35·36·38·39·40번은 배치 자산(public/pdp, sample3-batch-overrides.ts)은 만들어 두었으나 로컬 DB `products`에 미등록이라 `/product/[slug]` 404 — 상품 import가 완료되면 자동으로 SAMPLE3가 적용된다.

## 확정 생성 규칙 (SAMPLE3)

1. 상품마다 배경이 있는 **전신 히어로 1장만** AI 생성한다.
2. S2(소재/디테일), S3(실루엣), OG(공유용)는 히어로에서 Sharp로 크롭한다. 별도 생성 금지.
3. 생성 입력은 반드시 두 참조를 함께 쓴다.
   - 원본 썸네일: 의상 설계도. 복제해야 할 대상.
   - 선택한 AMBA 얼굴 이미지: 같은 모델의 얼굴/헤어 정체성 고정.
4. 히어로는 머리부터 신발, 옷단까지 잘리지 않아야 한다.
5. 원본과 색상·넥라인·기장·프린트·구조가 다르면 결과물을 저장/게시하지 않는다.
6. 고객 페이지에 `CJ`, `CJ Dropshipping`, 원가, 내부 생성 규칙을 노출하지 않는다. 고객용 소싱 표기는 `LEXI 소싱`만 사용한다.
7. 상세 페이지의 H1/SEO/OG에는 한국어 마케팅명, 원본 영문명은 `DETAILS > Internal name`에만 넣는다.
8. AMBA 소개, WHY LEXI, STORY, STYLING, DETAILS, FAQ, CTA 및 아래 브랜드 문구를 포함한다.

```text
LEXI IS RPCOW.
Radiant Presence, Captivating Outfit for your Wardrobe.
```

## 비용 및 용량 정책

- 생성 비용: 상품당 AI 생성은 1회만. 크롭 3장은 로컬 Sharp 처리.
- 자동 이미지 공급자 우선순위 코드는 `src/lib/images/generate.ts`에 있다. 현재 자동 선택은 `ComfyUI → Wan → OpenAI → fal → mock`이다.
- 비용 우선 운영은 `IMAGE_PROVIDER=wan`을 기본으로 하고, 원본 일치 실패 상품만 상위 편집 모델을 예외 사용한다.
- 배포물은 WebP만 남긴다. 생성 원본 PNG는 절대 `public/`에 남기지 않는다.
- 히어로 권장: 960×1200 WebP, quality 75~80. S2: 720×720, S3: 960×1200, OG: 1200×630.
- 기존 PNG 약 17MB를 제거했고 현재 페이지 자산은 WebP만으로 제공한다.

## 현재 구현 위치

```text
src/lib/pdp/sample3-overrides.ts        # 현재 1·3·4번 SAMPLE3 오버라이드
src/lib/pdp/storefront.ts                # override 우선 PDP 해석
src/app/[lng]/product/[slug]/page.tsx    # 메타데이터/구조화 데이터
public/pdp/yellow-polka-blouse/          # 1번 WebP 자산
public/pdp/plaid-ribbon-maxi-dress/      # 3번 WebP 자산
public/pdp/black-knit-midi-dress/        # 4번 WebP 자산
src/lib/images/generate.ts               # 자동 생성 공급자 선택과 최적화 저장
src/lib/pdp/marketing-images.ts          # 마케팅 이미지 생성 흐름
```

원본을 임시로 받을 때만 아래처럼 `tmp/pdp-source/`를 사용한다. 이 경로의 원본은 고객 페이지나 Git에 포함하지 않는다.

```text
tmp/pdp-source/
```

## 8번 상품 시작 정보

원본 URL:

```text
https://cf.cjdropshipping.com/quick/product/682fd259-098e-4479-afb0-1411dea0ca7d.jpg
```

원본 특징: 롱슬리브 카디건 원피스. 유럽·미국풍 플로럴 디자인. 원단의 패턴과 카디건 실루엣을 유지해야 한다. 머리·신발·옷단이 보이는 전신 결과가 필요하다.

상품 URL:

```text
https://style.lexid.site/product/long-sleeve-cardigan-dress-european-and-american-2608260732581632100
```

## 작업 절차

1. 패션 카테고리에서 다음 상품의 실제 slug와 원본 이미지를 확인한다.
2. 원본을 참조 전용 `tmp/pdp-source/`에 내려받고, AMBA 캐스트 중 의상 무드에 맞는 얼굴을 한 명 고른다 (meta.json 정본 이름 사용).
3. 원본 + AMBA 얼굴을 참조로 히어로 1장을 생성한다. **자연스러운 무드 배경** + **HEADROOM ≥15%** 프롬프트 필수.
4. **자동 검증**: `node scripts/verify-hero-headroom.mjs tmp/pdp-source/<sku>-hero.png` — PASS(0)만 크롭 진행, FAIL(1)이면 재생성.
5. 생성 결과를 눈으로 검수한다. 원본 불일치면 폐기하고 게시하지 않는다.
6. WebP 4종을 만든다. 예시:

```js
const sharp = require("sharp");
const p = "public/pdp/<sku>/";
const hero = p + "hero-v1.png"; // 작업 중에만 존재, 변환 뒤 삭제

Promise.all([
  sharp(hero).resize(960, 1200, { fit: "cover" }).webp({ quality: 78, effort: 6 }).toFile(p + "hero-v1.webp"),
  sharp(hero).extract({ left: 265, top: 190, width: 560, height: 620 }).resize(720, 720, { fit: "cover" }).webp({ quality: 78, effort: 6 }).toFile(p + "detail-v1.webp"),
  sharp(hero).extract({ left: 130, top: 80, width: 850, height: 1060 }).resize(960, 1200, { fit: "cover" }).webp({ quality: 75, effort: 6 }).toFile(p + "silhouette-v1.webp"),
  sharp(hero).extract({ left: 70, top: 100, width: 960, height: 505 }).resize(1200, 630, { fit: "cover" }).webp({ quality: 80, effort: 6 }).toFile(p + "og-v1.webp"),
]);
```

크롭 좌표는 의상마다 바꾼다. 변환이 끝나면 `hero-v1.png`을 포함한 모든 PNG를 `public/`에서 삭제한다.

6. `sample3-overrides.ts`에 prefix, asset URL, `PdpStructured`, HTML을 추가한다. 현행 3·4번 패턴을 따른다.
7. 검증:

```text
npx tsc --noEmit
vercel --prod --yes
```

8. `style.lexid.site`의 실제 상품 주소에서 다음을 확인한다.
   - 한국어 H1과 전신 히어로
   - 파생 이미지 2장
   - AMBA 이름
   - WHY LEXI / DETAILS / FAQ / CTA
   - Internal name은 DETAILS에만 존재
   - 고객 노출에 CJ 용어가 없음

## 배포 및 Git 주의

- 현재 배포는 Vercel CLI `vercel --prod --yes`로 진행했다.
- Git remote는 `shinkangteam/lexistyle`이다.
- 로컬 DB가 기본이다. Neon에 직접 개발 데이터를 쓰지 않는다.
- 사용자가 커밋/푸시를 요구할 때만 아래 순서를 지킨다.

```text
npm run db:sync:neon:dry
npm run db:sync:neon
git add <작업 파일만>
git commit
git push
```

- 토큰, `.env` 내용, 개인 경로의 자격증명 파일은 이 문서나 채팅에 절대 복사하지 않는다.

## 자동 재개 작업

Codex 앱에 활성화된 heartbeat 자동화가 있다.

```text
LEXI SAMPLE3 사용량 초기화 후 재개
```

이미지 생성 사용 가능량이 돌아오면 5번부터 이어서 하도록 설정되어 있다. Cursor/Grok에서는 해당 자동화가 공유되지 않으므로 이 문서를 기준으로 수동 재개한다.
