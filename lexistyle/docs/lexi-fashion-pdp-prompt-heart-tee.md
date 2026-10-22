# LEXI1 패션 PDP 벤치마크 — 하트 자수 반팔 티

> **Ruleset:** `LEXI1` (정본 요약: [lexi1-pdp-generation-rules.md](./lexi1-pdp-generation-rules.md))  
> 레퍼런스: 쿠팡 `ELLE PARIS 여성용 통기성 하트 자수 반팔 티셔츠`  
> 브랜드 치환: **ELLE PARIS → LEXI** (로고·상표 복제 금지, 카피·보이스만 LEXI)  
> 파이프라인: CJ 의류 히어로 → AI 화보 재생성 → LEXI 구조화 PDP  
> 목업: `docs/pdp-marketing-mocks/pdp-mock-lexi-heart-tee-s{1,2,3}-*.png`

---

## 1. 쿠팡(ELLE PARIS) 구성·디자인 관찰

| 구역 | 관찰 | LEXI로 가져올 것 / 버릴 것 |
|------|------|---------------------------|
| 브랜드 칩 | `ELLEPARIS` 브레드크럼·브랜드명 | **가져옴:** 브랜드 1급 신호. **치환:** 전면 **LEXI**. ELLE 로고/워드마크 금지 |
| 갤러리 | 흰 스튜디오 배경, 블랙 라운드넥 반팔 + **핑크 하트 자수** 포인트 | **가져옴:** 실루엣·하트 자수 위치. **버림:** 밋밋한 흰벽 → 화보 배경 |
| 타이틀 | 브랜드 + 기능어(통기성·하트자수·반팔) | **가져옴:** 속성. **버림:** 타 브랜드명 |
| 소셜프루프 | 리뷰 수·“한 달간 1,000명+” | **버림:** 숫자 복제·허위 실적. **가져옴:** 신뢰 슬롯 자리만(배송/케어 FAQ) |
| 가격 밴드 | 와우할인가·쿠픽·로켓배송 | **가져옴:** 가격+배송 밴드 위치. **버림:** 쿠팡 전용 뱃지 |
| 옵션 | 사이즈 L / 색상 BLACK | **가져옴:** 사이즈·컬러 선택. 화보에 블랙 명확히 |
| 스펙 | 기본핏·2023·여름용·블랙계열 | **가져옴:** 핏·시즌. 출시연도는 SourceSeed에 있을 때만 |

시각 DNA: **블랙 코튼 반팔 · 라운드넥 · 좌측 가슴 미니 핑크 하트 자수 · 통기·데일리**.  
감정: 담백한 설렘 · 데일리 로맨스 · “작은 하트 하나”.

---

## 2. 이미지 3막 (CJ 히어로 → LEXI 화보)

공통 잠금:
- Match silhouette from CJ/Coupang reference: black SS tee, crew neck, tiny pink heart embroidery left chest.
- Do **not** render ELLE / Coupang / supplier logos. No “LEXI” lettering on garment (brand lives in copy).
- No text, watermarks, fake stars, marketplace badges.

### S1 Hero
```
Hero fashion editorial for LEXI. Woman wearing black short-sleeve crew-neck tee
with tiny soft-pink heart embroidery on left chest (match CJ reference).
Soft morning window light, cream paper mood, K-fashion magazine, no text, no logo, 3:4.
```

### S2 Detail
```
Macro/detail of the same black cotton tee: pink heart embroidery stitch, fabric breathability feel,
soft folds on cream surface or half-body, lifestyle light, no logos, no text, 3:4.
```

### S3 Desire
```
Full lifestyle walk in the same black heart-embroidery tee, warm sunset, easy daily romance,
purchase desire without urgency gimmicks, cream-ink palette, no on-screen text, 3:4.
```

---

## 3. 카피 프롬프트 — ko / en / ms (브랜드 = LEXI)

시스템 롤: Senior fashion PDP copywriter for **LEXI** editorial commerce. JSON only. Never claim ELLE affiliation. No fake reviews/sales counts.

### 3-A. Korean
```
Brand: LEXI (never ELLE PARIS)
SourceSeed: {title without competitor brand, categoryPath, price, sourceImageUrls}
Voice: 성수 에디토리얼 · 담백한 설렘

Write PdpStructured in Korean:
- title: "LEXI 하트 자수 통기 반팔 티" 형태 (경쟁 브랜드명 제거)
- subtitle: 작은 하트 포인트의 로망 1문장
- pain: 민무늬 검정 티만 반복될 때의 결핍 1문장
- desire: 착용 후 감정 1문장
- usps[3]: 통기·하트자수·데일리 활용 — SourceSeed에 있는 사실만
- story: 2~4문장, LEXI 큐레이션 톤
- faq[2]: 사이즈/세탁 또는 배송
- ctaLabel: 장바구니 담기
```

톤 예시:
- subtitle: “검정 티 위에 앉힌, 아주 작은 설렘”
- usps: “여름 통기 코튼 감”, “핑크 하트 자수 포인트”, “데님·스커트에 바로”

### 3-B. English
```
Brand: LEXI only
SourceSeed: {cleaned title, categoryPath, price, sourceImageUrls}
Voice: quiet K-fashion romance, precise

Write PdpStructured in English:
- title: clean LEXI product name (heart embroidery breathable tee)
- subtitle: one line about a tiny heart on everyday black
- pain: basics feel flat
- desire: soft confidence after wearing
- usps[3]: breathability / embroidery detail / outfit range — SourceSeed only
- story: 2–4 sentences as LEXI curation
- faq[2]: size/care or shipping
- ctaLabel: Add to bag
Ban: competitor brand names, fake ratings, sales counts.
```

### 3-C. Bahasa Melayu
```
Jenama: LEXI sahaja
SourceSeed: {title bersih, categoryPath, price, sourceImageUrls}
Suara: editorial K-fashion, lembut, indah

Tulis PdpStructured dalam Bahasa Melayu:
- title: nama produk LEXI (tee sulaman hati, bernafas)
- subtitle: satu ayat tentang hati kecil pada tee hitam harian
- pain: baju asas rasa membosankan
- desire: keyakinan lembut selepas pakai
- usps[3]: nafas/fabrik · sulaman hati · gaya harian — fakta SourceSeed sahaja
- story: 2–4 ayat kurasi LEXI
- faq[2]: saiz/penjagaan atau penghantaran
- ctaLabel: Tambah ke beg
Larangan: nama jenama pesaing, rating palsu, angka jualan palsu.
```

---

## 4. ConceptSpec

```json
{
  "layoutId": "editorial-fullbleed",
  "voice": "LEXI · 담백한 설렘 · heart tee",
  "blockPlan": ["hero", "gallery", "usp", "story", "spec", "faq", "cta"],
  "locale": "ko",
  "brand": "LEXI",
  "imageRecipe": {
    "generate": true,
    "style": "black crew tee tiny pink heart embroidery, breathable summer, LEXI editorial",
    "backgroundPolicy": "replace",
    "plan": [
      { "role": "hero", "size": "portrait" },
      { "role": "macro", "size": "portrait" },
      { "role": "trust", "size": "portrait" }
    ]
  }
}
```

---

## 5. 벤치마크 vs LEXI 차별

| ELLE PARIS(쿠팡) | LEXI |
|------------------|------|
| 브랜드 라이선스 티 + 저가 볼륨 | 에디토리얼 화보 + 큐레이션 카피 |
| 흰 스튜디오·할인 배지 과다 | paper/ink 배경 · 배지 최소화 |
| 소셜프루프 숫자 | FAQ·소재 감각으로 신뢰 |
| 타이틀에 브랜드 키워드 스팸 | 짧은 LEXI 타이틀 + subtitle 로망 |

검증: 하트 자수 위치 일치 · ELLE 표기 0 · 가짜 리뷰 0 · ko/en/ms 스키마 동일.
