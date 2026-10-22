# LEXI ↔ CJ 카테고리 그룹 기획

> 정본 코드: `src/lib/catalog/lexi-cj-categories.ts`  
> 원칙: **LEXI 카테고리 = 모집합(그룹)** · **CJ leaf = 자집합(멤버)**  
> HQ Import 칩·필터·스토어 부서 매핑이 이 표를 따른다.

## 1. 모델

```
LEXI 그룹 (포괄)
  └─ CJ category_path[1] leaf 여러 개 (세분)
```

- 스토어프론트 1뎁스: `beauty | fashion | life | kids` (부서)
- HQ/운영 2뎁스: LEXI 그룹 라벨 (메이크업, 여성의류 …)
- CJ 원장: leaf 영문 칩 (Lady Dresses, Lipstick …)

미매핑 CJ leaf(공구·자동차·산업재 등)는 파이프라인에서 **제외**.

## 2. 현재 취급 중 (activeImport = true) — 대시보드 칩 8개

| # | LEXI 그룹 (모집합) | 부서 | CJ leaf 수 | 역할 |
|---|-------------------|------|-----------|------|
| 1 | 메이크업 | beauty | 9 | 색조·네일·가발 |
| 2 | 여성의류 | fashion | 36 | 원피스·탑·팬츠·세트 |
| 3 | 남성의류 | fashion | 10 | 셔츠·후드·수트 등 |
| 4 | 아우터 | fashion | 18 | 자켓·코트·블레이저 |
| 5 | 가방 | fashion | 11 | 백팩·토트·지갑 |
| 6 | 슈즈 | fashion | 11 | 플랫·부츠·스니커 (아동화는 키즈) |
| 7 | 액세서리 | fashion | 31 | 주얼리·모자·시계·벨트 |
| 8 | 키즈 | kids | 17 | 유아동의류·신발·완구 |

### 2.1 메이크업 ← CJ

| CJ leaf (자집합) |
|------------------|
| Lipstick, Eyeshadow, Eyebrow Pencil, False Eyelashes, Makeup Brushes, Makeup Set, Nail Art Kits, Nail Gel, Synthetic Wigs |

### 2.2 여성의류 ← CJ

| CJ leaf (자집합) |
|------------------|
| Lady Dresses, Evening Dresses, Wedding Dresses, Blouses & Shirts, Ladies Short Sleeve, Women's Long-Sleeved Shirts, Women's Short-Sleeved Shirts, Women's Sleeveless Tops, Women's Camis, Skirts, Rompers, Jumpsuits, Suits & Sets, Two-Piece Suits, Women's Three-Piece Sets, Pajama Sets, Stage & Dance Wear, Wide Leg Pants, Woman Shorts, Woman Jeans, Casual Pants, Pants & Capris, Woman Hoodies & Sweatshirts, Sweaters, Women's Flare Pants, Women's Straight-Leg Pants, Women's Cargo Pants, Women's Suit Pants, Harem Pants, Women's Knit Bottoms, Women's Activewear Sets, Women's Sweatsuit Sets, One-Piece Suits, Leather & Suede, Genuine Leather, Sweatpants |

### 2.3 남성의류 ← CJ

| CJ leaf (자집합) |
|------------------|
| Men's Shirts, Men's Long-Sleeved, Man Hoodies & Sweatshirts, Man Jeans, Man Shorts, Men's Sweaters, Men's Suits, Tops & Tees, Men's Ties, Men's Insoles |

### 2.4 아우터 ← CJ

| CJ leaf (자집합) |
|------------------|
| Basic Jacket, Down Jackets, Outerwear & Coats, Women's Casual Jackets, Women's Coats, Women's Outerwear, Women's Padded Jackets, Women's Wool Coats, Woman Trench, Wool & Blend, Women's Blazers, Blazers, Women's Vests, Women's Cardigans, Women's Zip-Up Hoodies, Men's Jackets, Man Trench, Suits & Blazer |

### 2.5 가방 ← CJ

| CJ leaf (자집합) |
|------------------|
| Fashion Backpacks, Crossbody Bags, Shoulder Bags, Totes, Clutches, Evening Bags, Waist Bags, Luggage & Travel Bags, Women's Crossbody Bags, Men's Backpacks, Man Wallets |

### 2.6 슈즈 ← CJ

| CJ leaf (자집합) |
|------------------|
| Casual Shoes, Running Shoes, Formal Shoes, Flats, Woman Boots, Woman Sandals, Woman Slippers, Man Sandals, Man Slippers, Vulcanize Shoes, Pumps |

### 2.7 액세서리 ← CJ

| CJ leaf (자집합) |
|------------------|
| Earrings, Fine Earrings, Necklace & Pendants, Bracelets & Bangles, Rings, Anklets, Brooches, Charms, Fashion Jewelry Sets, 925 Silver Jewelry, Body Jewelry, Belts, Belts & Cummerbunds, Scarves & Wraps, Keychains, Woman Hats & Caps, Baseball Caps, Fedoras, Woman Gloves & Mittens, Socks, Woman Socks, Eyewear & Accessories, Watch Accessories, Quartz Watches, Smart Watches, Dress Watches, Women's Bracelet Watches, Man Prescription Glasses, Woman Prescription Glasses, Lovers' Watches, Dual Display Watches |

### 2.8 키즈 ← CJ

| CJ leaf (자집합) |
|------------------|
| Baby Care, Baby Clothing Sets, Baby Dresses, Baby Rompers, Boy Clothing Sets, Boy Hoodies & Sweatshirts, Girl Accessories, Girl Clothing Sets, Girl Dresses, Girls' Pants, Children's Shoes, Children's Watches, Couple&Parent-Child Sweatshirts·, Action & Toy Figures, Blocks, Stuffed & Plush Animals, RC Helicopters |

> 성인 `Rompers`(여성의류)와 `Baby Rompers`(키즈)는 분리. Pet* 완구는 반려동물 그룹 유지.

## 3. 매핑만 보유 (activeImport = false) — 추후 취급

| LEXI 그룹 | 부서 | CJ 요약 |
|-----------|------|---------|
| 스킨케어 | beauty | Facial Care, Face Masks, Body Care … |
| 헤어케어 | beauty | Curling Iron, Straightening Irons, Headband … |
| 이너웨어 | fashion | Bras, Panties, Bikini Sets, Leggings |
| 홈·리빙 | life | Bedding, Kitchen Storage, Lights … |
| 테크가젯 | life | Earphones, Power Bank, Cases … |
| 반려동물 | life | Pet* leaf 일괄 |

## 4. HQ 필터 계약

| UI | API |
|----|-----|
| 칩 「전체」 | `scope=active` → 취급 7그룹 CJ leaf ANY |
| 칩 「메이크업」 등 | `lexiBucket={key}` → 해당 그룹 cjChips만 |
| 미매핑 CJ | 목록·Import 대상 아님 |

대시보드에서 그룹 칩을 눌렀을 때 **그 그룹 leaf만** 카운트·그리드에 나와야 한다.  
(버그: 라벨만 넘기고 key 매핑이 비면 전체 active 스코프로 떨어질 수 있음 → 칩은 `key`로 선택)

## 5. 운영 규칙

1. 새 CJ leaf 발견 시 → 위 표의 **가장 포괄적인 LEXI 그룹 하나**에만 편입 (중복 소속 금지).
2. 애매하면: 여성/남성 구분 → 의류 vs 아우터(겉옷) vs 액세서리.
3. 코드 변경 시 `lexi-cj-categories.ts`와 이 문서를 같이 갱신.
4. 스토어프론트 노출 부서는 `department` 필드로 결정 (beauty/fashion/…).

## 6. 다음 구현 체크

- [x] 코드 정본 `LEXI_CJ_BUCKETS`
- [ ] HQ 칩 선택을 **bucket key**로 통일 (필터 오류 방지)
- [ ] 그룹별 건수 배지 (칩에 N건)
- [ ] 미매핑 CJ 모니터링 리포트 (crawl 후 orphan leaf)
