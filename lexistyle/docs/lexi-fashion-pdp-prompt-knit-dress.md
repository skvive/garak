# 패션 PDP 프롬프트 기획 — 배색 니트 미니 원피스

> 레퍼런스: 쿠팡 `설렘 배색 브이넥 슬림핏 니트 미니 원피스 HES-1010556`  
> 소스 파이프라인: CJ Dropshipping 의류 히어로 → AI 화보 재생성 → LEXI 구조화 PDP  
> 목업: `docs/pdp-marketing-mocks/pdp-mock-knit-dress-s{1,2,3}-*.png`

---

## 1. 쿠팡 레퍼런스 구성·디자인 관찰

| 구역 | 관찰 | LEXI로 가져올 것 / 버릴 것 |
|------|------|---------------------------|
| 상단 갤러리 | 흰 배경 전신·썸네일 스트립, 모델 착용샷 | **가져옴:** 전신 실루엣 고정. **버림:** 스튜디오 흰벽·공급사 워터마크 느낌 |
| 타이틀 | SEO 키워드 나열 + SKU 코드 | **가져옴:** 속성(브이넥·슬림·니트·미니). **버림:** SKU·키워드 스팸 |
| 가격/배송 밴드 | 할인가·로켓/무료배송·적립 | **가져옴:** 신뢰 밴드(배송·반품) 위치. **버림:** 쿠팡 전용 뱃지 복제 |
| 옵션 | 사이즈 / 색상=상세참조 | **가져옴:** 사이즈 선택 UX. **버림:** “상세참조”만으로 색 숨기기 → 화보에 색 명시 |
| 하단 | 위탁·개인정보·추천상품 | **버림:** 법률 블록을 히어로 직후 배치하지 않음. 추천은 Export 후 채널 몫 |

시각 DNA(이 상품): **블랙 × 핑크 × 크림 가로 배색**, 깊은 V넥, 슬림 니트, 미니 기장, 롱슬리브.  
감정 키워드: 설렘 · 데이트 · 하객 전 캐주얼 · K-fashion 에디토리얼.

---

## 2. 이미지 3막 (CJ 히어로 → 화보 재생성)

공통 잠금:
- Preserve exact color-block order and proportions from CJ reference (black / soft pink / cream).
- Same neckline, sleeve length, hem length. Do not invent a different SKU.
- No text, logos, watermarks, marketplace badges, fake star ratings.

### S1 Hero — 후킹
**EN image prompt**
```
Hero fashion editorial of {title}. Woman wearing slim-fit V-neck color-block knit mini dress
(black, soft pink, cream horizontal stripes) matching CJ reference silhouette.
Soft morning window light, cream paper mood, shallow DOF, K-fashion magazine cover,
no text, no logo, photorealistic, 3:4.
```

### S2 Detail — 소재·핏
**EN image prompt**
```
Detail lookbook of the same color-block knit mini dress: rib texture, V-neck depth, stripe seams.
Half-body or fabric-forward, soft stone or cafe interior, lifestyle light,
preserve stripe sequence from reference, no text, photorealistic, 3:4.
```

### S3 Desire — 구매 욕구
**EN image prompt**
```
Full-length campaign walk of the same dress outdoors, warm sunset rim light,
confident romantic mood that invites “wear tonight”, cream-ink palette,
no on-screen text, no review UI, photorealistic, 3:4.
```

---

## 3. 카피 프롬프트 — 한국어 / English / Bahasa Melayu

시스템 롤(공통):  
You are a senior fashion PDP copywriter for LEXI editorial commerce. Output structured JSON only. Never invent certifications, fabric % unless in SourceSeed. No fake reviews.

### 3-A. Korean (`locale: ko`)

```
SourceSeed: {title, categoryPath, price, sourceImageUrls}
Voice: 성수 에디토리얼 · 설렘 · 과장 없는 감각어

Write PdpStructured in Korean:
- title: 속성만 남긴 짧은 상품명 (SKU/HES 코드 제거)
- subtitle: 로망 1문장
- pain: 일상 결핍 1문장 (예: “흰 티·청바지로만 채운 주말, 조금 특별해지고 싶을 때”)
- desire: 착용 후 감정 1문장
- usps[3]: 핏 / 배색 / 활용 장면 — 검증 가능한 표현만
- story: 2~4문장, 공급사 HTML 금지
- faq[2]: 사이즈·세탁 또는 배송
- ctaLabel: 장바구니 담기 | 지금 입기

Tone: 한글 본문 14px 감각, 이모지·보라 그라데이션 멘트 금지.
```

예시 톤(참고, 생성기가 채움):
- subtitle: “가로 배색 한 줄로 완성되는 설렘 실루엣”
- usps: “브이넥으로 얼굴선 정리”, “블랙·핑크·크림 대비로 사진발”, “카페·약속·가벼운 하객 전”

### 3-B. English (`locale: en`)

```
SourceSeed: {title, categoryPath, price, sourceImageUrls}
Voice: editorial K-fashion, warm, precise, no hype numbers

Write PdpStructured in English:
- title: clean product name without SKU codes
- subtitle: one romantic line about color-block knit energy
- pain: one everyday wardrobe gap (weekend basics feel flat)
- desire: one feeling after wearing
- usps[3]: fit / color-block impact / outfit occasions — only claims grounded in SourceSeed
- story: 2–4 sentences, no supplier HTML paste
- faq[2]: sizing or care / shipping
- ctaLabel: Add to bag | Wear it tonight

Ban: fake ratings, clinical claims, purple-gradient marketing speak.
```

### 3-C. Bahasa Melayu (`locale: ms`)

```
SourceSeed: {title, categoryPath, price, sourceImageUrls}
Suara: editorial K-fashion, mesra, indah, tanpa keterlaluan

Tulis PdpStructured dalam Bahasa Melayu:
- title: nama produk ringkas tanpa kod SKU
- subtitle: satu ayat romantik tentang baju rajut color-block
- pain: satu jurang gaya harian (weekend rasa terlalu biasa)
- desire: satu perasaan selepas memakai
- usps[3]: potongan / blok warna / situasi pakai — hanya fakta dari SourceSeed
- story: 2–4 ayat, jangan tampal HTML pembekal
- faq[2]: saiz/penjagaan atau penghantaran
- ctaLabel: Tambah ke beg | Pakai malam ini

Larangan: rating palsu, tuntutan klinikal, emoji berlebihan.
```

---

## 4. ConceptSpec 권장값

```json
{
  "layoutId": "editorial-fullbleed",
  "voice": "성수 에디토리얼 · knit color-block",
  "blockPlan": ["hero", "gallery", "usp", "story", "spec", "faq", "cta"],
  "locale": "ko",
  "imageRecipe": {
    "generate": true,
    "style": "color-block knit mini dress lookbook, black pink cream, V-neck slim fit",
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

## 5. 실행 순서 (HQ)

1. CJ Import → SourceSeed에 원본 히어로 URL  
2. Wan/이미지 엔진으로 S1–S3 재생성 (위 EN 이미지 프롬프트)  
3. `generatePdpText`에 locale `ko` | `en` | `ms` 각각 호출  
4. `renderPdp` + 잠금 → 공장 N건 동일 ConceptSpec

검증: 배색 순서 일치 · 텍스트 인프레임 없음 · 가짜 리뷰 없음 · 3언어 카피 키 동일 스키마.
