# LEXI × linkrcode — CJ PDP 공장과 판매채널 송출 기획

> 상태: 구현 진행 (G1–G5).  
> 관련: `docs/adr-catalog-pdp-export.md`, `docs/lexi-catalog-pdp-pipeline.md`, `docs/hq-lovable-pdp-factory.md`, `docs/lexi-pdp-ruleset.md`  
> 참조 UX: https://linkrcode.ipcow.me/ (3P Loop). Linker IDE·특허 청구항은 이식하지 않는다.

---

## 한 줄 결론

linkrcode.ipcow.me를 **통째로 Cafe24 HTML 업로더로 붙이지 않는다.** 가져올 것은 Prompt→Preview→Lock 루프와 이미지 레시피뿐이다. CJ에서 온 원장은 `catalog_index` → Import → **구조화 PDP(`PdpStructured`)** → `export_jobs`로 쿠팡·Shopify·Amazon AU에 **채널별 투영**한다. SKU마다 다른 자유 HTML은 마켓 API가 깨진다.

**정본 UX:** 샘플 1건으로 페이지 형식(`ConceptSpec`) 잠금 → 선택 N건 천재병렬 동일 기준 자동생성 → SKU 개별 수정 → Export. 상세: `docs/hq-lovable-pdp-factory.md` G0–G5.

첨부된 “linkrcode-studio 이식 완료, 남은 건 factory→Cafe24” 요약은 **절반만 맞다.** HQ `/hq/pipeline/pdp`가 정본 진입점. 골격(시드·잠금·pool)은 있으나 ConceptSpec→HTML·공장 전달·편집 hydrate는 G1–G5에서 닫는다.

---

## 1. 이미 있는 LEXI 파이프라인 (정본)

```
CJ crawl ──► catalog_index (메타·thumb URL만)
               │ 선택 Import
               ▼
         import_jobs + asset_cache (WebP, Blob)
               │
               ▼
     factory / studio/generate
               │  Gemini·template 카피 + (선택) AI 히어로
               ▼
        content_documents  (PdpStructured JSON + 렌더 HTML)
               │
               ▼
          export_jobs ──► ChannelAdapter.publish
                            lexi | coupang | cafe24 | shopify | amazon_au | shopee
```

금지(ADR): 공개 PDP/채널에 CJ 원본 URL, `hq_state`에 카탈로그 전량, Git에 SKU HTML.

코드:

| 구간 | 위치 |
|------|------|
| CJ 인덱스 | `src/lib/catalog/*`, HQ `/hq` 카탈로그 |
| 이미지 | `src/lib/images/generate.ts` openai → fal → mock |
| 카피·렌더 | `src/lib/pdp/generate.ts`, `ruleset.ts` |
| 시드 미리보기 | `POST /api/hq/studio/generate`, `linkrcode-studio.tsx` |
| N건 공장 | `src/lib/factory/engine.ts` `runFactoryBatch` |
| 송출 | `src/lib/export/jobs.ts` + `src/lib/channels/adapters/*` |

Akeneo식 분리: **콜드(카피·에셋·컨셉)** 는 PDP 문서. **핫(가격·재고)** 는 Cafe24/CJ 원장에서 송출 직전에 읽는다. PIM에 재고를 복제하지 않는다.

---

## 2. linkrcode가 실제로 주는 것 / 주지 않는 것

| 가져온다 | 가져오지 않는다 |
|----------|-----------------|
| 3P Loop UI (말하고 바로 보기) | `linker://` IDE, 로컬 JSON DB 전체를 몰 DB로 대체 |
| 디바이스 iframe (1024/768/390) | SKU별 임의 HTML을 채널 본문으로 게시 |
| Dummy 토글, 키 없어도 template | DALL-E/Flux `.ps1`를 Vercel에서 실행 |
| 골든 템플릿 → 공장 핸드오프 | Cafe24 “수동 업로드가 정본”인 워크플로 |

원본 스크립트(`dalle-generate.ps1` 등)는 **로컬 GPU 벤치**용. 프로덕션은 이미 `IMAGE_PROVIDER` + fal/OpenAI + Blob이다.

Cafe24: 몰 디자인 원장은 LEXI, 상품·주문 원장은 Cafe24 (`docs/cafe24/`). 발행은 OAuth 앱 스코프와 `CAFE24_SCOPES`가 맞을 때만.

---

## 3. 외부 사례 (검색 근거)

**PIM → 신디케이션 (정석)**  
Akeneo: 마케팅 정보는 PIM, 가격·재고는 ERP/몰에서 신디케이션으로. 채널은 로케일·필수속성 필터. LEXI의 `content_documents` + `export_jobs`가 이 역할이다.  
https://api.akeneo.com/guides/syndication-connection/step1-who-does-what.html

**헤드리스 멀티채널**  
Saleor `ProductChannelListing`: 채널마다 게시·가격. Medusa region. 우리는 Saleor를 도입하지 않고 **같은 아이디어만** 어댑터에 둔다.

**오픈소스 생성기 (참고, 통째 이식 금지)**

| 프로젝트 | 배움 | LEXI에 쓰지 않는 이유 |
|----------|------|------------------------|
| [p-j-jx/Nono](https://github.com/p-j-jx/Nono) | 한 상품 → Amazon/Shopify/TikTok **포맷별 카피** + TSV/CSV + 금칙어 검사 | 우리가 이미 ruleset·export_jobs 있음. 금칙어 레이어만 차용 |
| [abingyyds/ai-product-page-generator](https://github.com/abingyyds/ai-product-page-generator) | 이미지→섹션 재생성 워크벤치 | 모듈 편집 UX. 저장은 우리 JSON |
| [mellu98/MCP-MASTER](https://github.com/mellu98/MCP-MASTER) | Ali 링크 → Shopify 랜딩 12섹션 | 공급사 스팸·가짜 소셜프루프. PDP ruleset 위반 |
| [JulianCruzet/Orpheus](https://github.com/JulianCruzet/Orpheus) | 채팅으로 Shopify CRUD | 파괴적 publish는 사람 확인. 우리 export 승인과 같음 |
| Shopify Magic / PagePilot 상용 | 설명문·테마 섹션 | 테마 JSON은 Shopify 전용. 쿠팡·아마존에 못 씀 |

**채널 API**

- Shopify Admin Product API — 제목, HTML body, 이미지, variant. 컬렉션 매핑은 별도.  
- 쿠팡 OpenAPI — 카테고리 예측 + 판매자 상품 생성. 인증·고시·옵션 필수. 서명 릴레이 기존 `coupang.ts`.  
- Amazon SP-API — **Product Type Definitions** JSON Schema로 필수 속성 받은 뒤 Listings Items PUT 또는 `JSON_LISTINGS_FEED`. AU는 FE 엔드포인트.  
  https://developer-docs.amazon.com/sp-api/docs/manage-product-listings-guide  
- **Amazon AU는 판매처·파이프라인 마지막 Export 대상**이다. 소싱이 아니다. SP-API는 Seller Central 없이 HQ에서 Export 리스팅·주문·송장을 일괄 관리하려고 붙인다. 상세: `docs/lexi-amazon-au-seller-central-map.md`.  
- 현재 `amazon-au.ts`는 LWA 토큰만 있고 SigV4 Listings **TODO·목업**. 키가 있어도 실리스팅이 안 나간다.

---

## 4. 권장 아키텍처 (Canonical + Projection)

```
                    ConceptSpec (잠금)
                           │
CJ Import ──► CanonicalProduct
              • PdpStructured (공통 카피)
              • assets[] (Blob, CJ URL 없음)
              • conceptId, locale ko/en
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         LEXI PDP     Shopify      Coupang
         renderPdp    body_html    고시·카테고리
                      + tags       예측 JSON
              ▼
         Amazon AU
         productType schema
         + bullet_point (en_AU)
```

**한 번의 생성 ≠ 한 번의 HTML 복붙.** Nono처럼 채널 투영기를 둔다.

| 채널 | 입력 | 출력 | 막아야 할 것 |
|------|------|------|--------------|
| LEXI 몰 | structured + html | 스토어프론트 | 공급사 스팸 단어 |
| Shopify | title, descriptionHtml, images, vendor LEXI | Admin product | collection 미매핑은 명시 |
| Coupang | 한글명, 카테고리코드, 인증, 옵션 | seller-products | 영문 에디토리얼만 넣기 |
| Amazon AU | productType + schema attrs | Listings PUT | `PRODUCT` 만능 타입. 스키마 조회 필수 |
| Cafe24 | 상품 원장 필드 | Cafe24 API | HTML 테마를 몰 스킨에 덮어쓰기 금지 |

가격: 송출 직전 `computeSellPrice` / 채널 통화. 문서에 USD 카피만 고정하지 않음.

---

## 5. linkrcode 기능을 LEXI에 붙이는 방법 (화면)

정본 진입은 **HQ 파이프라인** (`docs/hq-lovable-pdp-factory.md`). `/studio/linkrcode`는 같은 `LinkrcodeStudio` 재사용.

```
HQ /hq/pipeline/pdp
┌ 왼쪽: CJ 검색·Import·체크 N건 ┐┌ 오른쪽: linkrcode 3P          ┐
│ 시드 1건 [미리보기]            ││ 프롬프트 / Dummy / 기기       │
│ 확정 컨셉으로 [공장 N건]       ││ iframe ← studio/generate     │
└ 아래: 문서 편집 · export 채널  ┘│ [컨셉 잠금] [채널 송출]       │
```

시드 미리보기 요청 본문: 사람이 상품명을 다시 치지 않음. 서버가 `getCatalogById`로 title·가격·에셋·카테고리를 채운다. 지금 스튜디오는 빈 폼이라 CJ와 끊겨 있다. **이게 이식의 핵심 갭이다.**

공장: 잠긴 `GoldenTemplate`/`ConceptSpec`만 `POST /api/hq/factory/run`. 레이아웃을 워커가 새로 설계하지 않음.

송출: 문서 승인 후 `export_jobs` 채널 멀티셀렉트. mock 응답을 live로 표시 금지(ADR).

---

## 6. 이미지

프로덕션 경로: `generateProductImage` → sharp WebP → Blob.  
배경 제거는 룩보드와 공유 가능(BiRefNet 워커, 별 문서).  
linkrcode `.ps1`은 로컬 벤치. Render GPU가 있으면 Flux를 fal 슬롯에 맞춘다.

채널 이미지는 **Blob URL만**. CJ CDN 직접 게시 금지.

---

## 7. 페이즈 (G1–G5 = 구현 정본, A–F = 레거시 맵)

| ID | 내용 | 완료 기준 | ←레거시 |
|----|------|-----------|---------|
| **G1** | ConceptSpec(layout/tokens/blockPlan) → HTML 렌더 | 시드 미리보기에서 layout 바꾸면 iframe 변화 | A+P1 |
| **G2** | Gemini-first + voice | 키 있으면 engine gemini | P1 |
| **G3** | 채팅 패치(템플릿 전) + 잠금 전 공장 비활성 | 로컬 re-render | B |
| **G4** | 잠긴 컨셉으로 N건 공장(동일 layout) | 3 SKU 동일 layoutId | C |
| **G5** | 개별 수정 hydrate + export 체크리스트 | 문서 선택 후 실 structured 게이트 | C+P4 |
| D–F | 채널 투영·Amazon live·금칙어 | 기존 syndication D–F | D–F |

비범위: Linker 전체 복제, 카탈로그 전량 자동 생성, Higgsfield 영상, MCP-MASTER식 가짜 리뷰 그리드.

---

## 8. 환경·운영

키는 `.env` / Neon `provider_api_keys`. git·채팅 금지.  
필요 슬롯: `GEMINI_API_KEY`, `OPENAI`/`fal`, 채널별 Coupang HMAC, Shopify domain+token, Amazon LWA+AWS SigV4.  
Dummy 모드에서 export는 `*-MOCK-*` ref만. UI에 mock 배지.

운영 대시보드가 dbd로 분리돼 있어도 **생성 원장·export_jobs는 이 리포/공유 Neon**에 둔다. 화면만 dbd로 옮길 수 있다.

---

## 9. 추천 진행 순서

**G1 → G2∥G5 → G3 → G4.** 샘플 잠금 없이 공장 열지 않음. 채널 키 있는 것부터 Export 스모크.
