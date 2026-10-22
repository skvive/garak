/**
 * LEXI 운영 카테고리(14) ↔ CJ Dropshipping leaf 칩 매핑.
 * HQ 칩/Import 스코프의 단일 정본. 미등록 CJ 카테고리는 파이프라인에서 제외.
 */
export type LexiDept = "beauty" | "fashion" | "life" | "kids" | "others";

export type LexiCjBucket = {
  key: string;
  label: string;
  department: LexiDept;
  /** 지금 상품 취급·Import 대상 */
  activeImport: boolean;
  /** catalog_index.category_path[1] 과 매칭 */
  cjChips: string[];
};

export const LEXI_CJ_BUCKETS: LexiCjBucket[] = [
  {
    key: "skincare",
    label: "스킨케어",
    department: "beauty",
    activeImport: false,
    cjChips: [
      "Facial Care",
      "Face Masks",
      "Face Skin Care Tools",
      "Electric Face Cleanser",
      "Essential Oil",
      "Body Care",
    ],
  },
  {
    key: "makeup",
    label: "메이크업",
    department: "beauty",
    activeImport: true,
    cjChips: [
      "Lipstick",
      "Eyeshadow",
      "Eyebrow Pencil",
      "False Eyelashes",
      "Makeup Brushes",
      "Makeup Set",
      "Nail Art Kits",
      "Nail Gel",
      "Synthetic Wigs",
    ],
  },
  {
    key: "haircare",
    label: "헤어케어",
    department: "beauty",
    activeImport: false,
    cjChips: ["Curling Iron", "Straightening Irons", "Headband & Hair Band & Hairpin"],
  },
  {
    key: "women",
    label: "여성의류",
    department: "fashion",
    activeImport: true,
    cjChips: [
      "Lady Dresses",
      "Evening Dresses",
      "Wedding Dresses",
      "Blouses & Shirts",
      "Ladies Short Sleeve",
      "Women's Long-Sleeved Shirts",
      "Women's Short-Sleeved Shirts",
      "Women's Sleeveless Tops",
      "Women's Camis",
      "Skirts",
      "Rompers",
      "Jumpsuits",
      "Suits & Sets",
      "Two-Piece Suits",
      "Women's Three-Piece Sets",
      "Pajama Sets",
      "Stage & Dance Wear",
      "Wide Leg Pants",
      "Woman Shorts",
      "Woman Jeans",
      "Casual Pants",
      "Pants & Capris",
      "Woman Hoodies & Sweatshirts",
      "Sweaters",
      "Women's Flare Pants",
      "Women's Straight-Leg Pants",
      "Women's Cargo Pants",
      "Women's Suit Pants",
      "Harem Pants",
      "Women's Knit Bottoms",
      "Women's Activewear Sets",
      "Women's Sweatsuit Sets",
      "One-Piece Suits",
      "Leather & Suede",
      "Genuine Leather",
      "Sweatpants",
    ],
  },
  {
    key: "men",
    label: "남성의류",
    department: "fashion",
    activeImport: true,
    cjChips: [
      "Men's Shirts",
      "Men's Long-Sleeved",
      "Man Hoodies & Sweatshirts",
      "Man Jeans",
      "Man Shorts",
      "Men's Sweaters",
      "Men's Suits",
      "Tops & Tees",
      "Men's Ties",
      "Men's Insoles",
      "Men's Hats & Caps",
      "Men's Socks",
    ],
  },
  {
    key: "outer",
    label: "아우터",
    department: "fashion",
    activeImport: true,
    cjChips: [
      "Basic Jacket",
      "Down Jackets",
      "Outerwear & Coats",
      "Women's Casual Jackets",
      "Women's Coats",
      "Women's Outerwear",
      "Women's Padded Jackets",
      "Women's Wool Coats",
      "Woman Trench",
      "Wool & Blend",
      "Women's Blazers",
      "Blazers",
      "Women's Vests",
      "Women's Cardigans",
      "Women's Zip-Up Hoodies",
      "Men's Jackets",
      "Man Trench",
      "Suits & Blazer",
    ],
  },
  {
    key: "bags",
    label: "가방",
    department: "fashion",
    activeImport: true,
    cjChips: [
      "Fashion Backpacks",
      "Crossbody Bags",
      "Shoulder Bags",
      "Totes",
      "Clutches",
      "Evening Bags",
      "Waist Bags",
      "Luggage & Travel Bags",
      "Women's Crossbody Bags",
      "Men's Backpacks",
      "Man Wallets",
    ],
  },
  {
    key: "shoes",
    label: "슈즈",
    department: "fashion",
    activeImport: true,
    cjChips: [
      "Casual Shoes",
      "Running Shoes",
      "Formal Shoes",
      "Flats",
      "Woman Boots",
      "Woman Sandals",
      "Woman Slippers",
      "Man Sandals",
      "Man Slippers",
      "Vulcanize Shoes",
      "Pumps",
    ],
  },
  {
    key: "accessories",
    label: "액세서리",
    department: "fashion",
    activeImport: true,
    cjChips: [
      "Earrings",
      "Fine Earrings",
      "Necklace & Pendants",
      "Bracelets & Bangles",
      "Rings",
      "Anklets",
      "Brooches",
      "Charms",
      "Fashion Jewelry Sets",
      "925 Silver Jewelry",
      "Body Jewelry",
      "Belts",
      "Belts & Cummerbunds",
      "Scarves & Wraps",
      "Keychains",
      "Woman Hats & Caps",
      "Baseball Caps",
      "Fedoras",
      "Woman Gloves & Mittens",
      "Socks",
      "Woman Socks",
      "Eyewear & Accessories",
      "Watch Accessories",
      "Quartz Watches",
      "Smart Watches",
      "Dress Watches",
      "Women's Bracelet Watches",
      "Man Prescription Glasses",
      "Woman Prescription Glasses",
      "Lovers' Watches",
      "Dual Display Watches",
    ],
  },
  {
    key: "underwear",
    label: "이너웨어",
    department: "fashion",
    activeImport: false,
    cjChips: ["Bras", "Panties", "Bikini Sets", "Leggings"],
  },
  {
    key: "home",
    label: "홈리빙",
    department: "life",
    activeImport: false,
    cjChips: [
      "Bedding Sets",
      "Pillows",
      "Cushion Covers",
      "Curtains",
      "Towels",
      "Mirrors",
      "Decor Paintings",
      "Decorative Flowers & Wreaths",
      "Furniture",
      "Bathroom Storage",
      "Clothing & Wardrobe Storage",
      "Home Office Storage",
      "Kitchen Storage",
      "Storage Bags & Cases & Boxes",
      "Storage Bottles & Jars",
      "Dinnerware",
      "Drinkware",
      "Cooking Tools",
      "Kitchen Knives & Accessories",
      "Ceiling Lights",
      "Chandeliers",
      "Pendant Lights",
      "Wall Lamps",
      "Night Lights",
      "LED Spotlights",
      "Solar Lamps",
      "Event & Party Supplies",
      "Christmas Decoration Supplies",
    ],
  },
  {
    key: "etc",
    label: "기타잡화",
    department: "life",
    activeImport: false,
    cjChips: [
      "Office & School Supplies",
      "Other Exterior Accessories",
      "Home Electronic Accessories",
      "Car Stickers",
      "Swimming Goggles",
      "Wedding Hair Jewelry",
      "Sports & Entertainment",
      "Camping & Hiking",
      "Fishing",
      "Cycling",
      "Golf",
      "Automobiles & Motorcycles",
      "Interior Accessories",
      "Exterior Accessories",
      "Tools & Equipment",
      "Measurement & Analysis Instruments",
    ],
  },
  {
    key: "tech",
    label: "테크가젯",
    department: "life",
    activeImport: false,
    cjChips: [
      "Earphones & Headphones",
      "Speakers",
      "Power Bank",
      "Charger",
      "Cables",
      "Digital Cables",
      "Smart Wearable Accessories",
      "Holders & Stands",
      "Tablet Accessories",
      "Cases For iPhone 8 & 8 Plus",
      "Silicone Cases",
      "Leather Cases",
      "Waterptoof Cases",
      "Memory Cards",
      "Microphones",
      "Action Cameras",
      "Camcorders",
      "Gamepads",
    ],
  },
  {
    key: "pets",
    label: "반려동물",
    department: "life",
    activeImport: false,
    cjChips: [
      "Pet Bags",
      "Pet Bowls",
      "Pet Chase Toys",
      "Pet Chew Toys",
      "Pet Clothing Sets",
      "Pet Clothings",
      "Pet Collars",
      "Pet Drinking Tools",
      "Pet Feeding Tools",
      "Pet Functional Clothings",
      "Pet Furniture Tools",
      "Pet Hair Accessories",
      "Pet Hair Removers & Combs",
      "Pet Harnesses",
      "Pet Houses & Cages",
      "Pet Jumpsuits",
      "Pet Leashes",
      "Pet Mats",
      "Pet Nail Polishers",
      "Pet Nests",
      "Pet Plush Toys",
      "Pet Shower Products",
      "Pet Snacks",
      "Pet Sweaters",
      "Pet Tops",
      "Pet Toy Set",
      "Pet Training and Educational Toys",
      "Pet Tunnel Toys",
      "Cat Scratching Posts",
      "Dog Stairs & Steps",
      "Dog Training Pads & Diapers",
      "Barking Control Equipments",
    ],
  },
  {
    key: "kids",
    label: "키즈",
    department: "kids",
    /** 취급 그룹 — Baby/Boy/Girl/Children·완구 leaf 전부 이 모집합으로 */
    activeImport: true,
    cjChips: [
      "Baby Care",
      "Baby Clothing Sets",
      "Baby Dresses",
      "Baby Rompers",
      "Boy Clothing Sets",
      "Boy Hoodies & Sweatshirts",
      "Girl Accessories",
      "Girl Clothing Sets",
      "Girl Dresses",
      "Girls' Pants",
      "Children's Shoes",
      "Children's Watches",
      "Boys Bags",
      "Girls Bags",
      "Backpacks & Carriers",
      "Couple&Parent-Child Sweatshirts·",
      "Action & Toy Figures",
      "Blocks",
      "Stuffed & Plush Animals",
      "RC Helicopters",
    ],
  },
  {
    key: "unmapped",
    label: "미분류",
    department: "others",
    activeImport: false,
    /** catch-all — mapCategorySlug 폴백. 매칭된 leaf는 여기 넣지 않음 */
    cjChips: [],
  },
];

const chipToBucket = new Map<string, LexiCjBucket>();
for (const b of LEXI_CJ_BUCKETS) {
  for (const chip of b.cjChips) chipToBucket.set(chip, b);
}

export function allMappedCjChips(): string[] {
  return LEXI_CJ_BUCKETS.flatMap((b) => b.cjChips);
}

export function activeImportCjChips(): string[] {
  return LEXI_CJ_BUCKETS.filter((b) => b.activeImport).flatMap((b) => b.cjChips);
}

export function bucketByKey(key: string): LexiCjBucket | undefined {
  return LEXI_CJ_BUCKETS.find((b) => b.key === key);
}

export function bucketForCjChip(chip: string | null | undefined): LexiCjBucket | undefined {
  if (!chip) return undefined;
  return chipToBucket.get(chip);
}

export function chipsForBucketKey(key: string): string[] {
  return bucketByKey(key)?.cjChips ?? [];
}

/**
 * catalog 검색용 CJ leaf 필터.
 * - null: 제한 없음
 * - string[]: ANY 매칭 (빈 배열이면 결과 없음)
 */
export function resolveCjChipFilter(opts: {
  supplier?: string;
  category?: string;
  lexiBucket?: string;
  scope?: "active" | "mapped" | "all";
}): string[] | null {
  if (opts.lexiBucket) {
    const chips = chipsForBucketKey(opts.lexiBucket);
    return chips.length ? chips : [];
  }
  if (opts.category) {
    // LEXI 라벨 또는 CJ leaf
    const byLabel = LEXI_CJ_BUCKETS.find((b) => b.label === opts.category);
    if (byLabel) return byLabel.cjChips;
    return [opts.category];
  }
  const scope = opts.scope ?? (opts.supplier === "cjdropshipping" ? "active" : "all");
  if (scope === "all") return null;
  if (scope === "mapped") return allMappedCjChips();
  return activeImportCjChips();
}

/** CJ categoryPath → 스토어프론트 카테고리 슬러그 (LEXI 버킷 key 우선) */
export function mapCategorySlug(path: string[] | null | undefined): string {
  const leaf = path?.[0];
  const bucket = bucketForCjChip(leaf);
  if (bucket) return bucket.key;

  const joined = (path ?? []).join(" ").toLowerCase();
  if (/beauty|cosmetic|skin|makeup|hair|nail/.test(joined)) return "makeup";
  if (/kid|baby|toy|child/.test(joined)) return "kids";
  if (/shoe|sneaker|boot|sandal|slipper/.test(joined)) return "shoes";
  if (/bag|backpack|tote|wallet|clutch/.test(joined)) return "bags";
  if (/jacket|coat|blazer|trench|outer|cardigan/.test(joined)) return "outer";
  if (/accessor|jewel|earring|necklace|bracelet|ring|hat|sock|scarf|watch/.test(joined))
    return "accessories";
  if (/\bmen\b|mens|man\b|male/.test(joined)) return "men";
  if (/women|woman|lady|dress|skirt|blouse/.test(joined)) return "women";
  if (/fashion|apparel|cloth|shirt|pant/.test(joined)) return "women";
  if (/pet\b|pets|dog|cat/.test(joined)) return "pets";
  if (/earphone|headphone|speaker|charger|cable|gadget|phone|tablet|camera/.test(joined))
    return "tech";
  if (/home|life|garden|kitchen|bedding|decor|furniture|storage/.test(joined)) return "home";
  if (/sport|swim|golf|camp|fish|cycl|outdoor|office|school|stationery/.test(joined)) return "etc";
  if (/auto|car\b|motor|vehicle/.test(joined)) return "etc";
  return "unmapped";
}

/** 카테고리 슬러그 → 부서 (beauty/fashion/life/kids/others) */
export function departmentOfCategorySlug(slug: string): LexiDept | "sourced" {
  const bucket = bucketByKey(slug);
  if (bucket) return bucket.department;
  if (slug === "beauty" || slug === "fashion" || slug === "life" || slug === "kids" || slug === "others")
    return slug;
  if (slug === "sourced" || slug === "unmapped") return "others";
  return "others";
}

export function bucketsForDepartment(dept: LexiDept): LexiCjBucket[] {
  return LEXI_CJ_BUCKETS.filter((b) => b.department === dept);
}

/**
 * 스토어프론트 진열 하위칩 — 카탈로그 매칭 보고서 정본 (6,019건 기준).
 * 표에 없는 버킷은 노출하지 않음.
 */
export const STOREFRONT_BUCKET_ORDER: Record<LexiDept, readonly string[]> = {
  beauty: ["makeup", "skincare", "haircare"],
  fashion: ["accessories", "women", "bags", "shoes", "underwear", "outer", "men"],
  life: ["home", "etc", "tech", "pets"],
  kids: [],
  /** 보고서 미정(unmapped) — 하위칩 없이 전체만 */
  others: [],
};

export function storefrontBucketsForDepartment(dept: LexiDept): LexiCjBucket[] {
  const keys = STOREFRONT_BUCKET_ORDER[dept];
  const byKey = new Map(LEXI_CJ_BUCKETS.map((b) => [b.key, b]));
  return keys.map((k) => byKey.get(k)).filter((b): b is LexiCjBucket => Boolean(b));
}

/** 부서에 속한 LEXI 버킷 key 목록 */
export function bucketKeysForDepartment(dept: LexiDept): string[] {
  return LEXI_CJ_BUCKETS.filter((b) => b.department === dept).map((b) => b.key);
}

export const CATEGORY_NAMES: Record<string, string> = {
  beauty: "Beauty",
  fashion: "Fashion",
  life: "Life",
  kids: "Kids",
  others: "Others",
  sourced: "Sourced",
  unmapped: "미분류",
  ...Object.fromEntries(LEXI_CJ_BUCKETS.map((b) => [b.key, b.label])),
};
