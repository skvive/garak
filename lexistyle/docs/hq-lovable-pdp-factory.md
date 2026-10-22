# HQ 러버블형 상품페이지 — 컨셉 확정 후 천재병렬 공장

PDP를 Lovable처럼 **말로 디자인하고 바로 보여주고**, 컨셉이 잠기면 **같은 규칙으로 N장을 동시에** 만든다.
자유 HTML을 SKU마다 뽑지 않는다. 채널 송출이 깨진다.

참조 UX: [Linker 웹 컴패니언](https://linkrcode.ipcow.me/) 3P Loop (Prompt → Preview → Publish), [대시보드](https://linkrcode.ipcow.me/dashboard).
이미 이식된 코어: `/studio/linkrcode`, `POST /api/hq/studio/generate`, `GoldenTemplate`, `runFactoryBatch`.
CJ→채널 송출 전체 그림: [lexi-linkrcode-pdp-syndication.md](./lexi-linkrcode-pdp-syndication.md).
마케팅 3막 프롬프트·목업: [lexi-pdp-marketing-prompt-rules.md](./lexi-pdp-marketing-prompt-rules.md).

## 한 줄 결정

`/hq/pipeline/pdp`는 **목록 → 스튜디오 → Export** 세로 파이프라인이다. 페이지 스타일 기본값은 **SAMPLE3**.

## UI 정본 흐름 (필수)

```
1. 상품 목록 (상단)     — 다중선택 · 전체선택 → 「스튜디오로 보내기」
2. 스튜디오 (중간)      — 대기열 · 시드 1건 SAMPLE3 미리보기 → 「완료 · 문서 저장」
3. Export (하단)        — 완료 문서 선택 → 채널 체크 → 「Export 보내기」
```

골든 템플릿 잠금 후 N건 공장(`factory/run`)은 스튜디오 STEP 3에 그대로 둔다.

## 정본 운영 흐름 (필수)

```
1. 샘플(시드) 1건으로 페이지 형식 확정  → ConceptSpec 잠금 (골든 템플릿) · SAMPLE3
2. 선택 N건에 동일 ConceptSpec으로 천재병렬 자동 생성  → factory/run (동시성 5)
3. SKU별 개별 수정 (제목·CTA·FAQ…)  → content_documents 버전
4. 채널 Export  → export_jobs + ChannelAdapter
```

지침: `docs/lexi-sample3-pdp-style.md` · `docs/lexi1-pdp-generation-rules.md` · `docs/lexi-pdp-marketing-prompt-rules.md`

레이아웃·토큰·블록 순서는 **잠긴 샘플만** 설계한다. 워커는 카피·이미지·문서 저장만 한다.  
카탈로그 전량 자동 생성 금지 — 공장 대상은 사람이 체크한 N건만.

## 지금 깨진 점

| 화면 | 실제 | 러버블 기대 |
|------|------|-------------|
| HQ PDP 「상품페이지 생성」 | 선택 N건 → JSON 카피 → 고정 블록 HTML. 미리보기 없음 | 대화 → 즉시 화면 |
| 「같은규칙 일괄편집」 | CTA/톤 문자열 패치 | 잠긴 컨셉을 N건에 적용 |
| 엔진 `template` / `openai` | 키 없으면 template. 우선순위는 OpenAI 카피 | Gemini Flash로 **컨셉+카피**, 이미지는 별 키 |
| `/studio/linkrcode` | 3P는 있음. 폼 필드. HQ 선택 목록과 단절 | HQ에서 시드 고르고 채팅 |

Linker를 통째 복제하지 않는다. 가져올 것은 **한 시야에서 말하고 보는 루프**와 **확정본 핸드오프**뿐이다.

## 왜 자유 생성(HTML/React)을 안 하나

Lovable은 페이지 자체를 코드로 만든다. LEXI PDP는 Cafe24·Coupang·Shopify·Amazon AU로 **필드 송출**해야 한다 (`content_documents` + `export_jobs`, ADR `docs/adr-catalog-pdp-export.md`).

상품마다 다른 DOM이면 송출 매핑·관세 CTA·한글 타이포 규칙이 무너진다.
대신 **레이아웃 프리셋 + 토큰 + 카피 JSON + 이미지 레시피**로 보이게 바꾼다. 미리보기는 진짜 HTML이고, 저장물은 구조화 문서다.

## ConceptSpec (공장 입력)

`GoldenTemplate`을 이 계약으로 채운다. LLM은 이 JSON만 쓴다.

```
ConceptSpec
  layoutId     editorial-fullbleed | lookbook-split | catalog-compact
  tokens       paper, ink, accent, radius, heroRatio   (LEXI 토큰만)
  blockPlan    hero → gallery → usp → story → spec → faq → cta  (순서·생략)
  voice        성수 에디토리얼 / 클린 미니멀 / 룩북 …
  copyRuleset  lexi-pdp-ruleset-v1 + voice
  imageRecipe  generate, style, backgroundPolicy
  locale       ko | en
  seedCatalogId
```

금지: 임의 CSS 파일, SKU별 페이지 컴포넌트, 인증·임상 허위, 공급처 스팸 카피.

## 화면 (`/hq/pipeline/pdp`)

기존 목록/그리드/검색/Import는 왼쪽. 오른쪽이 스튜디오.

```
┌ 시드 1 + 대상 N 선택 ┐┌ 채팅 (자연어) + 엔진 칩 ┐
│ 목록 / 그리드        ││ gemini-flash · 이미지 키 │
│ 체크 = 공장 대상     ││ Dummy / Real            │
└──────────────────────┘│ 데스크탑·태블릿·모바일 미리보기
                        │ [컨셉 확정] [같은 컨셉으로 N건 생성]
                        └ 공장 진행: ok / fail / skip
```

버튼 재정의

- **상품페이지 생성** → 시드 1건을 스튜디오에 올리고 첫 미리보기 (카탈로그 제목·가격·에셋 주입)
- **같은규칙 일괄편집** → 확정 `ConceptSpec`으로 선택 N건 `factory/run` (동시성 5)
- 편집 패널의 제목/CTA 저장·채널 송출은 유지 (버전 원장)

`/studio/linkrcode`는 같은 컴포넌트를 재사용. HQ가 정본 진입점.

## 엔진·키

핫패스는 빠르고 싼 모델. 검증·송출은 기존 파이프라인.

| 역할 | 기본 | env |
|------|------|-----|
| 컨셉 + 카피 JSON | Gemini Flash (`gemini-2.0-flash`, 가능하면 `gemini-2.5-flash`) | `GEMINI_API_KEY`, `LEXI_PDP_MODEL` |
| 히어로 이미지 | 오케스트레이터 wan → openai → fal → mock | `WAN_API_KEY` / `IMAGE_PROVIDER=wan` · [docs/lexi-wan-maas.md](./lexi-wan-maas.md) |
| 키 없음 | `engine: template` + Dummy 이미지. 화면이 멈추지 않음 | — |

HQ 시스템 화면에 키 슬롯 상태를 점으로 표시한다 (값 본문은 안 보여줌).
컨셉 엔진 기본값을 **Gemini**로 둔다. 지금은 `generatePdpText`가 OpenAI를 먼저 탄다 — P1에서 뒤집는다.

## 루프

1. **Prompt** — 한글 한 줄. 예: 「성수 에디토리얼, 크림 페이퍼, 풀블리드 히어로, CTA는 장바구니」. 시드 상품 메타는 서버가 붙인다.
2. **Preview** — `ConceptSpec` + `PdpStructured` → 기존 `renderPdp`. iframe 3종. Dummy 토글.
3. **Iterate** — 「히어로를 더 크게」「accent를 잉크로」= spec 패치 후 재렌더. 카탈로그 재생성 없음.
4. **Lock** — `POST /api/hq/factory/templates` = 골든 컨셉. 잠기기 전 공장은 막는다.
5. **Publish/Factory** — 선택 catalogId에 워커 풀(상한 5). 아이템당: 이미지 레시피 → 카피 → 문서 저장. 재시도·스킵 기존 `runFactoryBatch`.
6. **Export** — 지금과 동일. 컨셉은 문서 `body.conceptId`만 남긴다.

## 천재병렬

오케스트레이터(HQ 요청 1개)가 배치를 만들고, 워커는 SKU 단위로만 돈다. 레이아웃 설계는 워커에게 안 맡긴다.

- 동시성 기본 5, 상한 8 (Gemini·이미지 쿼터)
- 시드 미리보기는 공장과 별 요청
- 실패 SKU만 재실행, 성공 건은 `skipExisting`
- 진행 UI: 큐 / 생성중 / 미리보기가능 / 실패사유
- 분산원장: 문서 생성·컨셉 잠금은 listing 스트림에 봉인 (기존 `audit`)

## 페이즈 G0–G5 (구현 정본)

| ID | 산출 | 완료 기준 | 상태 |
|----|------|-----------|------|
| **G0** | 본 문서·syndication에 샘플→공장→개별→Export 정본 | 흐름 문구 일치 | 완료 |
| **G1** | layoutId·tokens·blockPlan이 `renderPdp` HTML에 반영 | 같은 structured, spec만 바꿔 미리보기 변화 | 완료 |
| **G2** | Gemini-first + voice/copyRuleset → 카피 톤 | `engine: gemini` 기본(키 있을 때) | 완료 |
| **G3** | 템플릿 없이 채팅 → ConceptSpec 패치 → re-render | 「히어로 더 크게」시 iframe만 갱신 | 완료 |
| **G4** | 잠긴 conceptSpec을 factory N건에 전달·동일 layout | 3 SKU 동일 layoutId, 제목만 다름 | 완료 |
| **G5** | 문서 선택 hydrate + Export 체크리스트 실데이터 | PATCH 후 export 게이트 ready | 완료 |

레거시 P0–P4 / A–F는 위 G1–G5에 흡수. P0 골격(`HqPdpPipelinePage`, 잠금 게이트, pool)은 이미 있음.  
**잠금 전 공장 금지**는 유지. G1 없이 G4(공장) 열지 않음.

## 명시적 비범위

- Lovable/Linker 전체 복제, `linker://` IDE 핸드오프
- SKU별 커스텀 React 페이지
- Higgsfield 영상 (나중에 마케팅 에셋)
- 카탈로그 전량 자동 생성 (선택은 사람)

## 검증

- Dummy: 키 없이 시드 미리보기 + template 엔진 표시
- Real: Gemini 키로 컨셉 JSON이 layoutId/tokens를 포함하는지
- 공장: 서로 다른 3 SKU, 동일 layoutId, 제목만 다름
- 회귀: 기존 제목 저장·채널 송출
- 한글: 자간 0, 본문 14/최소 12, line-height 1.6, keep-all
