/**
 * 가락한상 더미 데이터 — 가락시장 기반 O2O 수산물 통합 플랫폼
 * DB 시더(scripts/seed-dummy.ts)와 프론트 개발 미리보기가 공유하는 원천.
 * 가격 원장은 KRW(원) — 역직구 USD 원장 제거 (docs: 가락한상 쇼핑몰 전환 기획서).
 * 카테고리 slug는 기존 LEXI 택소노미를 유지(부서 매핑 호환)하되 라벨만 가락한상으로 재정의:
 *   beauty=수산 · women-clothing=한 상 · home-garden=축산 · kids=청과 · pet=초장집 · electronics=절임·청
 */

/** 키워드 기반 실사 이미지 (loremflickr — 무료, 안정적) */
const img = (kw: string, seed: number, w = 900) =>
  `https://loremflickr.com/${w}/${w}/${encodeURIComponent(kw)}?lock=${seed}`;

/** 기존 LEXI CJ 카테고리 유니온 유지 (departments.ts 타입 호환) */
export type CjCategory =
  | "women-clothing"
  | "pet"
  | "home-garden"
  | "beauty"
  | "jewelry"
  | "men-clothing"
  | "bags-shoes"
  | "kids"
  | "sports"
  | "electronics"
  | "home-improve"
  | "auto"
  | "phones"
  | "computers";

export type Product = {
  slug: string;
  name: string;
  brand: string;
  category: CjCategory | string;
  price: number; // KRW(원)
  discountRate: number; // 0 | 10 | 20 | 30
  rating: number;
  reviewCount: number;
  image: string;
  badge?: "BEST" | "NEW" | "DEAL";
};

export const products: Product[] = [
  // ========== 수산 (beauty) ==========
  { slug: "bangeo-hoe", name: "제철 대방어회 (1kg, 뱃살 두툼)", brand: "온달수산", category: "beauty", price: 55000, discountRate: 0, rating: 4.9, reviewCount: 2314, image: img("sashimi,fish", 1), badge: "BEST" },
  { slug: "chamdom-hoe", name: "자연산 참돔회 (800g)", brand: "온달수산", category: "beauty", price: 65000, discountRate: 10, rating: 4.8, reviewCount: 986, image: img("sashimi", 2), badge: "NEW" },
  { slug: "gwang-eo", name: "국내산 광어회 (1kg)", brand: "영재수산", category: "beauty", price: 42000, discountRate: 20, rating: 4.7, reviewCount: 1876, image: img("fish,food", 3), badge: "DEAL" },
  { slug: "yeon-eo", name: "노르웨이 생연어회 (600g)", brand: "영재수산", category: "beauty", price: 38000, discountRate: 0, rating: 4.8, reviewCount: 3201, image: img("salmon,sushi", 4), badge: "BEST" },
  { slug: "king-crab-a", name: "러시아 킹크랩 (살수율 A급 2.5kg)", brand: "온달수산", category: "beauty", price: 149000, discountRate: 0, rating: 4.9, reviewCount: 542, image: img("crab,seafood", 5), badge: "BEST" },
  { slug: "daege", name: "영덕 대게 3마리 (1.5kg)", brand: "가락대게", category: "beauty", price: 89000, discountRate: 10, rating: 4.7, reviewCount: 763, image: img("crab", 6) },
  { slug: "jeonbok", name: "완도 활전복 10미 (중)", brand: "남도수산", category: "beauty", price: 59000, discountRate: 0, rating: 4.8, reviewCount: 1290, image: img("abalone,seafood", 7) },
  { slug: "o-jing-eo", name: "동해 산오징어회 (500g)", brand: "동해수산", category: "beauty", price: 27000, discountRate: 30, rating: 4.6, reviewCount: 2108, image: img("squid,food", 8), badge: "DEAL" },
  { slug: "ddak-saeu", name: "제주 딱새우회 (500g)", brand: "제주직송", category: "beauty", price: 34000, discountRate: 0, rating: 4.9, reviewCount: 876, image: img("shrimp,seafood", 9), badge: "NEW" },
  { slug: "garibi", name: "통영 가리비 2kg", brand: "남해수산", category: "beauty", price: 22000, discountRate: 20, rating: 4.7, reviewCount: 1567, image: img("scallop,seafood", 10) },
  { slug: "huinsaeu", name: "흰다리새우 1kg (급냉)", brand: "서해수산", category: "beauty", price: 25000, discountRate: 0, rating: 4.6, reviewCount: 3456, image: img("shrimp", 11) },
  { slug: "uni", name: "성게알(우니) 200g 트레이", brand: "제주직송", category: "beauty", price: 48000, discountRate: 0, rating: 4.9, reviewCount: 634, image: img("seaurchin,uni", 12), badge: "BEST" },
  { slug: "chamchi", name: "참치회 모둠 (특상 500g)", brand: "바다정원", category: "beauty", price: 45000, discountRate: 10, rating: 4.8, reviewCount: 1452, image: img("tuna,sashimi", 13) },
  { slug: "mun-eo", name: "자숙 문어 숙회 (700g)", brand: "동해수산", category: "beauty", price: 39000, discountRate: 0, rating: 4.7, reviewCount: 987, image: img("octopus,food", 14), badge: "NEW" },
  { slug: "bajirak", name: "서산 바지락 1.5kg (해감 완료)", brand: "서해수산", category: "beauty", price: 13000, discountRate: 0, rating: 4.6, reviewCount: 2876, image: img("clam,seafood", 15) },
  { slug: "maeuntang-geori", name: "매운탕거리 모둠 (우럭+미더덕)", brand: "가락한상", category: "beauty", price: 18000, discountRate: 10, rating: 4.7, reviewCount: 765, image: img("fish,soup", 16) },

  // ========== 한 상 (women-clothing) ==========
  { slug: "teheran-premium", name: "테헤란 프리미엄 한 상 (3~4인)", brand: "가락한상", category: "women-clothing", price: 119000, discountRate: 0, rating: 4.9, reviewCount: 428, image: img("sashimi,set", 21), badge: "BEST" },
  { slug: "office-lobster", name: "사무실 랍스터 플레이트 (2~3인)", brand: "가락한상", category: "women-clothing", price: 89000, discountRate: 10, rating: 4.8, reviewCount: 312, image: img("lobster,seafood", 22), badge: "NEW" },
  { slug: "hoe-maeuntang", name: "회+매운탕 한 상 (2인)", brand: "가락한상", category: "women-clothing", price: 69000, discountRate: 0, rating: 4.7, reviewCount: 954, image: img("fish,koreanfood", 23) },
  { slug: "sushi-pack", name: "한 상 가득 수산 초밥 12pcs", brand: "가락한상", category: "women-clothing", price: 16000, discountRate: 0, rating: 4.6, reviewCount: 1890, image: img("sushi", 24), badge: "BEST" },
  { slug: "mulhoe-pack", name: "가락 명품 물회 팩 (싱글)", brand: "가락한상", category: "women-clothing", price: 14000, discountRate: 20, rating: 4.7, reviewCount: 2210, image: img("korean,colddish", 25), badge: "DEAL" },
  { slug: "homakase-sub", name: "홈마카세 정기구독 (월 2회)", brand: "가락한상", category: "women-clothing", price: 99000, discountRate: 0, rating: 4.9, reviewCount: 265, image: img("omakase,seafood", 26), badge: "NEW" },
  { slug: "fri-hoesik", name: "금요 사무실 회식 한 상 (4~6인)", brand: "가락한상", category: "women-clothing", price: 159000, discountRate: 0, rating: 4.8, reviewCount: 387, image: img("party,food", 27) },
  { slug: "gamtae-ssam", name: "감태 쌈 세트 (회와 함께)", brand: "초장집 마루", category: "women-clothing", price: 9000, discountRate: 0, rating: 4.8, reviewCount: 1234, image: img("seaweed,korean", 28) },

  // ========== 축산 (home-garden) ==========
  { slug: "hanwoo-yukhoe", name: "1++ 한우 육회 (200g)", brand: "가락축산", category: "home-garden", price: 42000, discountRate: 0, rating: 4.9, reviewCount: 678, image: img("beef,tartare", 31), badge: "BEST" },
  { slug: "chadol", name: "매운탕용 한우 차돌박이 (300g)", brand: "가락축산", category: "home-garden", price: 29000, discountRate: 10, rating: 4.8, reviewCount: 890, image: img("beef,brisket", 32) },
  { slug: "so-galbi", name: "한우 소갈비 찜용 (1kg)", brand: "가락축산", category: "home-garden", price: 59000, discountRate: 0, rating: 4.7, reviewCount: 432, image: img("beef,ribs", 33) },
  { slug: "samgyeop", name: "제주 흑돼지 삼겹살 (600g)", brand: "제주직송", category: "home-garden", price: 27000, discountRate: 20, rating: 4.7, reviewCount: 1567, image: img("pork,bbq", 34), badge: "DEAL" },
  { slug: "deungsim", name: "1++ 한우 등심 스테이크 (300g)", brand: "가락축산", category: "home-garden", price: 64000, discountRate: 0, rating: 4.9, reviewCount: 345, image: img("beef,steak", 35), badge: "NEW" },
  { slug: "yuk-sashimi", name: "한우 육사시미 (250g)", brand: "가락축산", category: "home-garden", price: 38000, discountRate: 0, rating: 4.8, reviewCount: 567, image: img("beef,sashimi", 36) },

  // ========== 청과 (kids) ==========
  { slug: "ssam-mo-dum", name: "모둠 쌈채소 팩 (회 전용)", brand: "가락청과", category: "kids", price: 8000, discountRate: 0, rating: 4.8, reviewCount: 2345, image: img("vegetable,lettuce", 41), badge: "BEST" },
  { slug: "sonjil-yachae", name: "매운탕용 손질 야채 팩", brand: "가락청과", category: "kids", price: 7000, discountRate: 0, rating: 4.7, reviewCount: 1876, image: img("vegetable,cooking", 42) },
  { slug: "shine-muscat", name: "샤인머스캣 2송이 (특)", brand: "가락청과", category: "kids", price: 35000, discountRate: 10, rating: 4.9, reviewCount: 987, image: img("grape,fruit", 43), badge: "NEW" },
  { slug: "ttalgi", name: "설향 딸기 1kg (특)", brand: "가락청과", category: "kids", price: 22000, discountRate: 0, rating: 4.8, reviewCount: 1456, image: img("strawberry,fruit", 44), badge: "BEST" },
  { slug: "gamgyul", name: "제주 노지 감귤 5kg", brand: "제주직송", category: "kids", price: 19000, discountRate: 30, rating: 4.6, reviewCount: 3210, image: img("tangerine,fruit", 45), badge: "DEAL" },
  { slug: "maeuntang-yachae", name: "매운탕 야채 모둠 (무+미나리)", brand: "가락청과", category: "kids", price: 6000, discountRate: 0, rating: 4.7, reviewCount: 876, image: img("radish,vegetable", 46) },

  // ========== 초장집 (pet) ==========
  { slug: "makjang", name: "초장집 특제 막장 (300g)", brand: "초장집 마루", category: "pet", price: 9000, discountRate: 0, rating: 4.9, reviewCount: 1345, image: img("korean,sauce", 51), badge: "BEST" },
  { slug: "corndog-cheese", name: "콘치즈 세트 (회 곁들임)", brand: "초장집 마루", category: "pet", price: 12000, discountRate: 10, rating: 4.7, reviewCount: 654, image: img("cheese,corn", 52) },
  { slug: "saeng-wasabi", name: "생와사비 (40g)", brand: "초장집 마루", category: "pet", price: 8000, discountRate: 0, rating: 4.8, reviewCount: 987, image: img("wasabi", 53) },
  { slug: "maeuntang-sauce", name: "매운탕 양념장 (4인분)", brand: "초장집 마루", category: "pet", price: 10000, discountRate: 0, rating: 4.7, reviewCount: 765, image: img("korean,sauce,spicy", 54) },
  { slug: "chojang", name: "회 초장 소스 (300g)", brand: "초장집 마루", category: "pet", price: 7000, discountRate: 20, rating: 4.8, reviewCount: 1567, image: img("sauce,dip", 55) },
  { slug: "highball-set", name: "수제 하이볼 시럽 세트", brand: "초장집 마루", category: "pet", price: 15000, discountRate: 0, rating: 4.6, reviewCount: 432, image: img("cocktail,drink", 56), badge: "NEW" },

  // ========== 절임·청 (electronics) ==========
  { slug: "maesil-cheong", name: "수제 매실청 (1kg)", brand: "초장집 마루", category: "electronics", price: 18000, discountRate: 0, rating: 4.8, reviewCount: 543, image: img("plum,syrup", 61) },
  { slug: "cheonggyul-cheong", name: "제주 청귤청 (600g)", brand: "제주직송", category: "electronics", price: 16000, discountRate: 10, rating: 4.7, reviewCount: 321, image: img("citrus,syrup", 62), badge: "NEW" },
];

export const bySlug = (slug: string) => products.find((p) => p.slug === slug);
export const finalPrice = (p: Product) =>
  +(p.price * (1 - p.discountRate / 100)).toFixed(0);

export const heroSlides = [
  {
    id: "garak-morning",
    eyebrow: "가락시장 새벽 경매",
    headline: "오늘 새벽\n가락시장에서\n잡아 올린 신선함",
    sub: "당일 경매 시세 그대로 — 반경 10km, 3시간 안에 도착",
    cta: "오늘의 시세 보기",
    href: "/best",
    image: img("fish,market", 71, 1200),
    imagePortrait: img("fish,market", 71, 900),
  },
  {
    id: "garak-hansang",
    eyebrow: "가락한상 시그니처",
    headline: "수산·축산·청과\n한 상에 담다",
    sub: "회부터 매운탕 거리, 쌈채소, 후식 과일까지 한 번에",
    cta: "복합 한 상 보기",
    href: "/category/fashion",
    image: img("sashimi,set", 72, 1200),
    imagePortrait: img("sashimi,set", 72, 900),
  },
];

export const categoryChips = [
  { label: "활어회", href: "/category/beauty", image: img("sashimi", 81, 300) },
  { label: "킹크랩", href: "/category/beauty", image: img("crab", 82, 300) },
  { label: "한우 육회", href: "/category/life", image: img("beef", 83, 300) },
  { label: "쌈채소", href: "/category/kids", image: img("lettuce", 84, 300) },
  { label: "제철 과일", href: "/category/kids", image: img("fruit", 85, 300) },
  { label: "복합 한 상", href: "/category/fashion", image: img("sushi,set", 86, 300) },
  { label: "초장집 밀키트", href: "/category/others", image: img("korean,sauce", 87, 300) },
];

export const timeDealSlugs = [
  "gwang-eo",
  "o-jing-eo",
  "samgyeop",
  "gamgyul",
  "mulhoe-pack",
  "chojang",
  "bangeo-hoe",
  "chadol",
];

export const shopTheLook = {
  image: img("sashimi,party", 91, 1200),
  title: "오늘의 한 상 — 금요 사무실 회식 차림",
  pins: [
    { x: 22, y: 35, slug: "bangeo-hoe" },
    { x: 55, y: 28, slug: "hanwoo-yukhoe" },
    { x: 78, y: 52, slug: "ssam-mo-dum" },
    { x: 40, y: 72, slug: "makjang" },
  ],
};

export const brandSpotlight = {
  name: "온달수산",
  tagline: "가락시장 수산동에서 30년 — 당일 경매의 최상급만 골라냅니다",
  story:
    "매일 새벽 2시 경매장에 가장 먼저 나가 그날 가장 선도 좋은 물량을 확보합니다. 회 뜨기 전 저울 사진을 그대로 보내드리는 캠 캡처 인증제로 중량을 약속합니다.",
  image: img("fishmarket", 92, 1200),
  productSlugs: ["bangeo-hoe", "chamdom-hoe", "king-crab-a", "uni"],
};

export const ugcPosts = [
  { id: "u1", handle: "@hansang_meokbang", image: img("sashimi,table", 101, 500), tags: 2 },
  { id: "u2", handle: "@office_party", image: img("seafood,party", 102, 500), tags: 1 },
  { id: "u3", handle: "@garak_lover", image: img("crab,dinner", 103, 500), tags: 3 },
  { id: "u4", handle: "@home_omakase", image: img("omakase,seafood", 104, 500), tags: 1 },
  { id: "u5", handle: "@fresh_everyday", image: img("fish,fresh", 105, 500), tags: 2 },
  { id: "u6", handle: "@hansang_table", image: img("koreanfood,table", 106, 500), tags: 1 },
];

/** 배송권역·배송비 표 (가락한상 당일 배송 기준) */
export const dutyTable: Record<string, { label: string; freeUnder: number; rate: number; shipping: number }> = {
  GANGNAM: { label: "강남·서초 (당일 3시간)", freeUnder: 30000, rate: 0.0, shipping: 4000 },
  SONGPANG: { label: "송파·강동 (당일 3시간)", freeUnder: 30000, rate: 0.0, shipping: 4000 },
  WIRYE: { label: "위례·하남 (당일)", freeUnder: 30000, rate: 0.0, shipping: 4500 },
  GYEONGGI: { label: "기타 수도권 (익일 새벽)", freeUnder: 50000, rate: 0.0, shipping: 6000 },
  JEJU: { label: "제주 (항공)", freeUnder: 0, rate: 0.0, shipping: 9000 },
};

/** 상품 메타 — 원산지·살수율 등급·크기 옵션·품절 (5대 벤치마크 디자인 반영) */
export const productMeta: Record<string, { origin?: string; fatGrade?: string; sizes?: string; soldout?: boolean }> = {
  "bangeo-hoe": { origin: "제주·모슬포", sizes: "2인분 · 4인분" },
  "chamdom-hoe": { origin: "남해 자연산" },
  "gwang-eo": { origin: "국내 양식" },
  "yeon-eo": { origin: "노르웨이", sizes: "300g · 500g · 1kg" },
  "king-crab-a": { origin: "러시아", fatGrade: "살수율 A급", sizes: "2.5kg · 3.5kg" },
  "daege": { origin: "영덕", fatGrade: "살수율 A급" },
  "jeonbok": { origin: "완도" },
  "o-jing-eo": { origin: "동해" },
  "ddak-saeu": { origin: "제주", soldout: false },
  "garibi": { origin: "통영" },
  "huinsaeu": { origin: "서해" },
  "uni": { origin: "제주", soldout: true },
  "chamchi": { origin: "원양" },
  "mun-eo": { origin: "동해" },
  "bajirak": { origin: "서산" },
  "maeuntang-geori": { origin: "국내 연안" },
  "hanwoo-yukhoe": { origin: "한우 1++" },
  "chadol": { origin: "한우 1++" },
  "so-galbi": { origin: "한우" },
  "samgyeop": { origin: "제주 흑돼지", sizes: "600g · 1kg" },
  "deungsim": { origin: "한우 1++" },
  "yuk-sashimi": { origin: "한우" },
  "ssam-mo-dum": { origin: "국내산" },
  "shine-muscat": { origin: "상주", sizes: "2송이 · 4송이" },
  "ttalgi": { origin: "논산", sizes: "1kg · 2kg" },
  "gamgyul": { origin: "제주", sizes: "5kg · 10kg", soldout: true },
  "mulhoe-pack": { sizes: "싱글 · 더블" },
  "sushi-pack": { sizes: "12pcs · 24pcs" },
};




