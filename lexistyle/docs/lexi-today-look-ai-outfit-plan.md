# 오늘의 룩 — AI 착장 합성 개선 기획 (천재기획)

> **문제 스크린:** 실루엣 위에 제품 히어로 JPG를 CSS로 겹친 콜라주  
> **목표 UX:** LEXI 모델 캐릭터가 **슬롯 아이템을 실제로 입은** 단일 AI 이미지  
> **라이브 레퍼런스(룩보드):** 홈 `오늘의 룩` · `/looks`  
> **관련:** `docs/lexi-mobile-alta-vto-plan.md` (모드 A 페이퍼 vs 모드 B VTO)

---

## 1. 진단 (왜 이상하게 나왔나)

| 현재 | 기대 |
|------|------|
| `LookBoard` = **모드 A** CSS 레이어 | **모드 B** 디퓨전 착장 1장 |
| `cutoutUrl = p.image` (원본 히어로) | 알파 PNG 컷아웃 또는 생성기 입력 전용 크롭 |
| 홈은 `LookBoard`만 렌더 | 홈 기본 = **착장 결과 이미지** |
| `TryOnPanel`은 `/looks` 등 별도 | 슬롯 확정 → 자동/원탭 착장 생성 |

코드 증거:

- `src/lib/looks/dressable.ts` — `cutoutUrl: p.image` (컷아웃 미구현 폴백)
- `src/components/looks/LookBoard.tsx` — 슬롯별 `absolute` + `object-contain` 겹침
- `src/components/looks/TodayLookSection.tsx` — LookBoard만, VTO 미연결

**결론:** 기획서의 “1차는 모드 A”가 **컷아웃 없이** 출시되어, 히어로 사진이 인형옷처럼 붙었다. 사용자 기대는 처음부터 모드 B(캐릭터 착장)였다.

---

## 2. 목표 경험 (한 화면)

```
[ LEXI 모델 · 비즈니스 캐주얼 ]
   └── 단일 전신/니샷 이미지
       · 연청 트렌치 · 코랄 슬랙스 · 레드 미니백 · 스니커즈
       · 한 인물, 한 조명, 한 배경
[ 칩: 아우터 상의 하의 … ]  ← 슬롯 편집 진입
[ 다시 입혀보기 ]  [ 슬롯 보드 ]  [ 내 아바타 ]
면책: 참고 이미지 · 실측 피팅 아님
```

금지: 실루엣 위 직사플 콜라주(컷아웃 준비 전).  
허용: 슬롯 편집용 **미니 보드**(썸네일 그리드) — 전신 미리보기와 분리.

---

## 3. 파이프라인 (착장 엔진)

```
슬롯 JSON (outer/top/bottom/shoes/bag/…)
        │
        ▼
① SlotBrief   각 히어로 → 의류 속성 추출
              (카테고리, 색, 소재, 실루엣, 금지: 배경·모델 얼굴 복제)
        │
        ▼
② OutfitPrompt  occasion + SlotBrief[] → 단일 프롬프트
              “one East-Asian woman wearing ALL items together…”
        │
        ▼
③ Render      Wan / FASHN multi-garment / Higgsfield
              입력: 모델 앵커(더미 LEXI 캐릭터 or 유저 아바타) + 의류 refs
        │
        ▼
④ Cache       lookId + slots hash → composedUrl (Neon/R2)
        │
        ▼
⑤ UI          TodayLook = composedUrl 우선
              실패 시: 썸네일 그리드 + “다시 생성” (콜라주 전신 금지)
```

### 3.1 SlotBrief (분석 계약)

```ts
type SlotBrief = {
  slot: GarmentSlot;
  slug: string;
  colorWords: string[];      // "powder blue", "coral"
  garmentType: string;       // "trench coat", "wide slacks"
  materialHint?: string;
  heroUrl: string;           // 분석·ref 입력용
  doNotCopy: "background" | "model_face" | "scene"; // 프롬프트 제약
};
```

히어로가 **모델 착용샷**이면: “extract garment only — do not reproduce the original model or landmark background.”

### 3.2 생성 프롬프트 골격 (SAMPLE3 톤)

```
LEXI lookbook, one continuous fashion photograph.
Same East-Asian female LEXI campaign model, full body or 3/4, cream/fog editorial.
She is WEARING simultaneously:
- [outer brief]
- [top brief]
- [bottom brief]
- [shoes brief]
- holding/wearing [bag brief]
Occasion: business casual. Soft daylight plaza or cafe exterior.
No collage, no floating product cutouts, no silhouette mannequin overlay,
no on-image text, no competitor logos.
```

### 3.3 제공자 우선순위

| 순위 | 엔진 | 비고 |
|------|------|------|
| 1 | FASHN tryon (의류 1장씩 누적) 또는 multi | `FASHN_API_KEY` 있을 때 |
| 2 | Wan edit/T2I + 슬롯 브리프 | 이미 `WAN_*` 운영 중 |
| 3 | 사전 생성 캐시 목업 | 더미/오프라인 · 오늘 룩 시드 |

브라우저 디퓨전 금지 (기존 기획 유지).

---

## 4. UX 상태 머신

| 상태 | 화면 |
|------|------|
| `idle` / 캐시 hit | 착장 이미지 |
| `composing` | 스켈레톤 + “룩 입히는 중…” |
| `ready` | 이미지 + 슬롯 칩 |
| `failed` | 슬롯 썸네일 그리드 + 재시도 (전신 콜라주 금지) |
| `edit` | `/looks` 슬롯 피커 → 저장 시 compose 무효화·재생성 |

홈 CTA:

- **다시 입혀보기** → compose API
- **슬롯 바꿔보기** → `/looks`
- **내 아바타** → `/account/avatar` (있으면 모델 앵커로 사용)

---

## 5. 구현 페이즈

### P0 — 정직성 (즉시) ✅ 본 작업

- 홈 기본 뷰를 **착장 목업/캐시 이미지**로 전환
- 컷아웃 없는 전신 CSS 콜라주 숨김
- 면책 카피 유지

### P1 — Compose API

- `POST /api/looks/compose` `{ slots }` → `{ jobId }`
- `GET /api/looks/compose/:id`
- slots hash 캐시

### P2 — SlotBrief 추출

- 비전(짧은 LLM/비전) 또는 카탈로그 메타로 color/type 채움
- 히어로 ref는 “garment only” 지시

### P3 — 아바타 앵커

- 유저 아바타 ready면 모델 입력으로 교체
- 없으면 LEXI 캠페인 더미 모델 고정

### P4 — 컷아웃 워커 (모드 A 부활)

- BiRefNet 배치 후, **편집용 미니보드**에만 컷아웃 레이어 허용

---

## 6. 목업 산출물

| 파일 | 용도 |
|------|------|
| `public/looks/mockups/today-look-compose-a.jpg` | 비즈니스 캐주얼 착장 A (주간 카페) |
| `public/looks/mockups/today-look-compose-b.jpg` | 동일 아이템 · 포즈/배경 변형 B |

시드 룩과 정렬: 연청 트렌치 · 코랄/살몬 와이드 슬랙스 · 레드 미니백 · 캔버스 스니커즈.

---

## 7. 성공 기준

1. 홈에서 한 인물이 전 아이템을 **입고** 보인다 (콜라주 아님).
2. 슬롯 변경 후 재생성하면 캐시 키가 바뀐다.
3. 실패 시 전신 히어로 겹침으로 폴백하지 않는다.
4. SAMPLE3/에디토리얼 토큰(ink/paper/fog)과 면책 카피 유지.

---

## 8. 비범위

- HQ 파이프라인·Cafe24 원장 변경 없음
- 실측 사이즈 피팅 주장 금지
- 얼굴 PII를 동의 없이 타사 학습 금지
