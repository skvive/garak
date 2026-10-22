/**
 * Amazon AU 리스팅 콘텐츠 빌더 — CJ 원본(variants·스펙)에서 확인되는 사실만 사용한다.
 * 소재·사이즈·색상은 CJ 데이터에 없으면 비워두고 compliance 경고로 남긴다(지어내기 금지).
 */

export type TypeDef = {
  key: string;
  noun: string;
  group: "apparel" | "jewelry" | "bag" | "accessory" | "lingerie" | "swim";
  spTypeHint: string;
  itemKw: string;
  styling: string;
  search: string[];
};

export const TYPES: Record<string, TypeDef> = {
  dress: { key: "dress", noun: "Dress", group: "apparel", spTypeHint: "DRESS", itemKw: "dresses",
    styling: "Easy to dress up with heels and a clutch, or keep it relaxed with sneakers and a denim jacket.",
    search: ["womens dress", "summer dress", "casual dress", "party dress", "midi dress", "ladies dresses"] },
  skirt: { key: "skirt", noun: "Skirt", group: "apparel", spTypeHint: "SKIRT", itemKw: "skirts",
    styling: "Pair with a fitted tee or tucked-in blouse for day, or add a knit and boots for cooler evenings.",
    search: ["womens skirt", "midi skirt", "casual skirt", "ladies skirts", "summer skirt"] },
  shorts: { key: "shorts", noun: "Shorts", group: "apparel", spTypeHint: "SHORTS", itemKw: "shorts",
    styling: "Wear with a tucked tee or shirt for warm-weather days, weekends and holidays.",
    search: ["womens shorts", "summer shorts", "casual shorts", "ladies shorts", "high waisted shorts"] },
  pants: { key: "pants", noun: "Pants", group: "apparel", spTypeHint: "PANTS", itemKw: "pants",
    styling: "Style with a fitted top and sneakers for everyday wear, or loafers and a blazer for a smarter look.",
    search: ["womens pants", "ladies trousers", "casual pants", "womens trousers", "wide leg pants"] },
  leggings: { key: "leggings", noun: "Leggings", group: "apparel", spTypeHint: "LEGGINGS", itemKw: "leggings",
    styling: "A versatile base for gym sessions, lounging and layered casual outfits.",
    search: ["womens leggings", "gym leggings", "yoga pants", "workout leggings", "stretch leggings"] },
  top: { key: "top", noun: "Top", group: "apparel", spTypeHint: "SHIRT", itemKw: "tops",
    styling: "Layer under a jacket or wear alone with jeans, trousers or a skirt.",
    search: ["womens top", "ladies tops", "casual top", "womens blouse", "summer top"] },
  shirt: { key: "shirt", noun: "Shirt", group: "apparel", spTypeHint: "SHIRT", itemKw: "shirts",
    styling: "Wear tucked or loose with denim, tailored trousers or a skirt.",
    search: ["womens shirt", "ladies shirts", "casual shirt", "womens blouse", "button up shirt"] },
  tee: { key: "tee", noun: "T-Shirt", group: "apparel", spTypeHint: "SHIRT", itemKw: "t-shirts",
    styling: "An everyday layer that works with jeans, skirts and tailored shorts.",
    search: ["womens t shirt", "ladies tee", "casual tee", "graphic tee", "womens tops"] },
  tank: { key: "tank", noun: "Tank Top", group: "apparel", spTypeHint: "SHIRT", itemKw: "tank tops",
    styling: "Wear alone in warm weather or layer under blazers, cardigans and shirts.",
    search: ["womens tank top", "sleeveless top", "ladies vest top", "summer top", "camisole"] },
  hoodie: { key: "hoodie", noun: "Hoodie", group: "apparel", spTypeHint: "SWEATSHIRT", itemKw: "hoodies & sweatshirts",
    styling: "An easy off-duty layer for travel, weekends and cooler days.",
    search: ["womens hoodie", "ladies sweatshirt", "casual hoodie", "womens pullover", "zip hoodie"] },
  sweater: { key: "sweater", noun: "Sweater", group: "apparel", spTypeHint: "SWEATER", itemKw: "sweaters",
    styling: "Layer over shirts and tees through the cooler months.",
    search: ["womens sweater", "knit sweater", "ladies knitwear", "womens jumper", "winter sweater"] },
  cardigan: { key: "cardigan", noun: "Cardigan", group: "apparel", spTypeHint: "SWEATER", itemKw: "cardigans",
    styling: "Wear open over tees and dresses, or buttoned up as a standalone top.",
    search: ["womens cardigan", "knit cardigan", "ladies cardigan", "button cardigan", "womens knitwear"] },
  jacket: { key: "jacket", noun: "Jacket", group: "apparel", spTypeHint: "COAT", itemKw: "jackets & coats",
    styling: "A layering piece that works over tees, shirts and dresses.",
    search: ["womens jacket", "ladies coat", "casual jacket", "lightweight jacket", "womens outerwear"] },
  coat: { key: "coat", noun: "Coat", group: "apparel", spTypeHint: "COAT", itemKw: "jackets & coats",
    styling: "Layer over knitwear and dresses for cooler days.",
    search: ["womens coat", "ladies jacket", "winter coat", "long coat", "womens outerwear"] },
  blazer: { key: "blazer", noun: "Blazer", group: "apparel", spTypeHint: "BLAZER", itemKw: "blazers",
    styling: "Wear with tailored trousers for work or over a dress for evenings out.",
    search: ["womens blazer", "ladies blazer", "work blazer", "casual blazer", "womens suit jacket"] },
  jumpsuit: { key: "jumpsuit", noun: "Jumpsuit", group: "apparel", spTypeHint: "JUMPSUIT", itemKw: "jumpsuits & rompers",
    styling: "A one-piece outfit that needs little more than simple shoes and a bag.",
    search: ["womens jumpsuit", "ladies romper", "denim jumpsuit", "casual jumpsuit", "one piece outfit"] },
  set: { key: "set", noun: "Set", group: "apparel", spTypeHint: "SET", itemKw: "sets",
    styling: "Wear the pieces together as a coordinated outfit, or mix them with other items in your wardrobe.",
    search: ["womens set", "two piece set", "matching set", "ladies outfit set", "co ord set"] },
  coverup: { key: "coverup", noun: "Cover Up", group: "swim", spTypeHint: "COVER_UP", itemKw: "swimwear cover ups",
    styling: "Slip over swimwear for the beach, pool and seaside holidays.",
    search: ["beach cover up", "swimwear cover up", "womens kimono", "pool cover up", "resort wear"] },
  swim: { key: "swim", noun: "Swimsuit", group: "swim", spTypeHint: "SWIMWEAR", itemKw: "swimwear",
    styling: "Designed for the beach, pool and holiday swimming.",
    search: ["womens swimsuit", "swimwear", "beachwear", "bathing suit", "holiday swimwear"] },
  bra: { key: "bra", noun: "Bra", group: "lingerie", spTypeHint: "BRA", itemKw: "bras",
    styling: "A smooth everyday option to wear under tees, tops and dresses.",
    search: ["womens bra", "underwire bra", "push up bra", "seamless bra", "everyday bra"] },
  shapewear: { key: "shapewear", noun: "Shapewear", group: "lingerie", spTypeHint: "SHAPEWEAR", itemKw: "shapewear",
    styling: "Wear under dresses and fitted tops for a smooth line.",
    search: ["womens shapewear", "tummy control", "waist cincher", "body shaper", "smoothing underwear"] },
  necklace: { key: "necklace", noun: "Necklace", group: "jewelry", spTypeHint: "NECKLACE", itemKw: "necklaces",
    styling: "Layer with other chains or wear alone as a finishing touch for day and evening outfits.",
    search: ["womens necklace", "pendant necklace", "layered necklace", "jewellery gift", "chain necklace"] },
  choker: { key: "choker", noun: "Choker Necklace", group: "jewelry", spTypeHint: "NECKLACE", itemKw: "necklaces",
    styling: "Wear alone or layered with longer chains for a statement neckline.",
    search: ["womens choker", "choker necklace", "collar necklace", "fashion jewellery", "layered necklace"] },
  bracelet: { key: "bracelet", noun: "Bracelet", group: "jewelry", spTypeHint: "BRACELET", itemKw: "bracelets",
    styling: "Stack with other bracelets or wear alone for a subtle accent.",
    search: ["womens bracelet", "chain bracelet", "fashion bracelet", "jewellery gift", "bangle"] },
  watch: { key: "watch", noun: "Bracelet Watch", group: "accessory", spTypeHint: "WRISTWATCH", itemKw: "watches",
    styling: "A wrist accessory suited to everyday outfits.",
    search: ["womens watch", "bracelet watch", "ladies wrist watch", "fashion watch", "braided watch"] },
  earrings: { key: "earrings", noun: "Earrings", group: "jewelry", spTypeHint: "EARRINGS", itemKw: "earrings",
    styling: "Easy to wear from day to evening.",
    search: ["womens earrings", "drop earrings", "fashion earrings", "jewellery gift", "dangle earrings"] },
  ring: { key: "ring", noun: "Ring", group: "jewelry", spTypeHint: "RING", itemKw: "rings",
    styling: "Wear alone or stack with other rings.",
    search: ["womens ring", "fashion ring", "open ring", "jewellery gift", "adjustable ring"] },
  backpack: { key: "backpack", noun: "Backpack", group: "bag", spTypeHint: "BACKPACK", itemKw: "backpacks",
    styling: "A compact carry for daily essentials, travel days and casual outfits.",
    search: ["mini backpack", "small backpack", "corduroy backpack", "casual backpack", "womens backpack"] },
  handbag: { key: "handbag", noun: "Bag", group: "bag", spTypeHint: "HANDBAG", itemKw: "handbags",
    styling: "A compact carry for evenings out, events and dressed-up outfits.",
    search: ["womens handbag", "evening bag", "crossbody bag", "clutch bag", "party bag"] },
};

// 제목 기반 유형 판정 — 앞쪽 규칙이 우선
const RULES: Array<[RegExp, string]> = [
  [/jumpsuit|romper/i, "jumpsuit"],
  [/cover[- ]?up/i, "coverup"],
  [/swimsuit|bikini|swimwear/i, "swim"],
  [/\bbra\b/i, "bra"],
  [/shapewear|waist trainer|tummy[- ]control/i, "shapewear"],
  [/bracelet watch|\bwatch\b/i, "watch"],
  [/choker/i, "choker"],
  [/necklace|pendant/i, "necklace"],
  [/bracelet|bangle/i, "bracelet"],
  [/earring/i, "earrings"],
  [/\bring\b/i, "ring"],
  [/backpack/i, "backpack"],
  [/crossbody|clutch|handbag|evening bag|shell bag|\bbag\b/i, "handbag"],
  [/\bdress\b/i, "dress"],
  [/skirt set|two-piece|two piece|\bsuit\b|\bset\b/i, "set"],
  [/\bskirt\b/i, "skirt"],
  [/leggings|yoga pants|shark pants/i, "leggings"],
  [/\bshorts\b/i, "shorts"],
  [/pants|trousers|cargo/i, "pants"],
  [/hoodie|sweatshirt/i, "hoodie"],
  [/cardigan/i, "cardigan"],
  [/sweater|knit/i, "sweater"],
  [/blazer/i, "blazer"],
  [/coat|windbreaker/i, "coat"],
  [/jacket|outerwear/i, "jacket"],
  [/tank|vest|sleeveless|camisole|tube top/i, "tank"],
  [/t-?shirt|\btee\b/i, "tee"],
  [/blouse/i, "top"],
  [/shirt/i, "shirt"],
  [/\btop\b/i, "top"],
];

export function classify(title: string): TypeDef | null {
  for (const [re, key] of RULES) if (re.test(title)) return TYPES[key] ?? null;
  return null;
}

// ---------- CJ 스펙 파싱 ----------
const SPEC_KEYS = [
  "main fabric composition", "lining composition", "fabric name", "fabric", "composition", "material", "inlay material",
  "style category", "style", "design", "colors", "color", "colour", "sizes", "size information", "size chart", "size",
  "fit", "sleeve style", "sleeve type", "sleeve length", "sleeve", "skirt length", "pants length", "pant style", "length",
  "waist style", "waist type", "waist", "piece trendy element", "trendy elements", "trendy element", "combination type",
  "target audience", "suitable for", "occasion", "thickness", "elasticity", "pattern", "neckline", "collar type", "collar",
  "closure", "type", "shape", "craftsmanship", "processing technique", "process", "decoration", "cup style",
  "underwire cup type", "with underwire", "season", "applicable season", "gender", "hem", "pocket", "fashion type",
  "version", "packing list", "product image", "note", "notes", "overview", "specifications", "product information",
];
const SPEC_RE = new RegExp(
  `(?:^|[\\s>])(${[...SPEC_KEYS].sort((a, b) => b.length - a.length).map((k) => k.replace(/\s+/g, "\\s+")).join("|")})\\s*:\\s*`,
  "gi",
);

export function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseSpecs(descriptionHtml: string): Record<string, string> {
  const text = htmlToText(descriptionHtml);
  const marks = [...text.matchAll(SPEC_RE)].map((m) => ({ key: m[1].toLowerCase().replace(/\s+/g, " "), start: m.index!, end: m.index! + m[0].length }));
  const out: Record<string, string> = {};
  for (let i = 0; i < marks.length; i++) {
    const m = marks[i];
    const next = marks[i + 1]?.start ?? text.length;
    let v = text.slice(m.end, next).trim().replace(/[;,]\s*$/, "");
    if (["note", "notes", "packing list", "product image", "overview", "specifications", "product information"].includes(m.key)) continue;
    if (v.length > 160) v = v.slice(0, 160);
    if (v && !out[m.key]) out[m.key] = v;
  }
  return out;
}

const SIZE_RE = /^(XXXS|XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL|6XL|ONE SIZE|FREE SIZE|ONE-SIZE|\d{1,3}(?:\.\d)?)$/i;
export function normSize(s: string) {
  const u = s.trim().toUpperCase();
  if (u === "XXXL") return "3XL";
  if (u === "XXL") return "2XL";
  if (u === "FREE SIZE" || u === "ONE-SIZE") return "One Size";
  if (u === "ONE SIZE") return "One Size";
  return u;
}

export type Variant = {
  vid: string;
  sku: string;
  color: string | null;
  size: string | null;
  stock: number;
  costUsd: number | null;
  weightG: number | null;
  cjImage: string | null;
  sourceCatalogId: number;
};

export function parseVariants(raw: Record<string, any>, catalogId: number): Variant[] {
  const list = (raw.variants ?? raw.productVariants ?? []) as Record<string, any>[];
  return list.map((v, i) => {
    const key = String(v.variantKey ?? "").trim();
    let color: string | null = null;
    let size: string | null = null;
    if (key) {
      const parts = key.split("-").map((p: string) => p.trim()).filter(Boolean);
      const last = parts[parts.length - 1];
      if (parts.length > 1 && SIZE_RE.test(last)) {
        size = normSize(last);
        color = parts.slice(0, -1).join(" ");
      } else if (SIZE_RE.test(key)) {
        size = normSize(key);
      } else {
        color = key;
      }
    }
    if (color && /^[A-Z0-9]{8,}$/.test(color)) color = null; // 스타일코드는 색상이 아님
    if (color) color = color.replace(/\s+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
    const inv = Array.isArray(v.inventories) ? (v.inventories as any[]).reduce((a, x) => a + (Number(x.totalInventory ?? x.inventory) || 0), 0) : Number(v.inventoryNum) || 0;
    return {
      vid: String(v.vid ?? ""),
      sku: `LEXI-${catalogId}-${i + 1}`,
      color,
      size,
      stock: inv,
      costUsd: v.variantSellPrice != null ? Number(v.variantSellPrice) : null,
      weightG: v.variantWeight != null ? Number(v.variantWeight) : null,
      cjImage: v.variantImage ? String(v.variantImage) : null,
      sourceCatalogId: catalogId,
    };
  });
}

// ---------- 제목 정리 ----------
const SPAM = [
  /\bnew\b/gi, /\bhot[- ]?selling\b/gi, /\bpopular\b/gi, /\bamazon\b/gi, /\bcross[- ]?border\b/gi,
  /\beuropean\s*(?:and|&)\s*american[- ]?style\b/gi, /\beuropean\s*(?:and|&)\s*american\b/gi, /\bfor foreign trade\b/gi,
  /\bforeign trade\b/gi, /\bindependent station\b/gi, /\baliexpress\b/gi, /\bwholesale\b/gi, /\b20\d{2}\b/g,
  /\bspot\b/gi, /\bten thousand needle\b/gi, /\bsexy\b/gi, /\bslimming\b/gi, /\byouth[- ]enhancing\b/gi,
  /\bhigh[- ]quality\b/gi, /\bfashionable\b/gi, /\bhot\b/gi, /\bbest[- ]selling\b/gi, /\bexquisite\b/gi,
  /\blight luxury\b/gi, /\bniche\b/gi, /\bori?ginal\b/gi, /\bin stock\b/gi, /\bwith diamond-encrusted\b/gi,
  /\biwatch\b/gi, /\bapple watch\b/gi,
];

export function cleanTitle(raw: string): string {
  let t = raw.replace(/\s+/g, " ").trim();
  for (const re of SPAM) t = t.replace(re, " ");
  t = t.replace(/\b(?:for|of)\s+women'?s?\b/gi, " ").replace(/\bwomen'?s\b/gi, " ").replace(/\bwomens\b/gi, " ").replace(/\bladies\b/gi, " ")
    .replace(/\bwomen\b/gi, " ").replace(/\bwoman\b/gi, " ").replace(/\blady\b/gi, " ").replace(/\bfor\s*$/gi, " ");
  t = t.replace(/[!"“”]+/g, " ").replace(/\s*,\s*/g, ", ").replace(/\s+/g, " ").replace(/^[,\s-]+|[,\s-]+$/g, "");
  // 연속 쉼표/하이픈 정리
  t = t.replace(/,\s*,/g, ",").replace(/\s-\s-/g, " -");
  return t;
}

export function titleCase(s: string) {
  const small = new Set(["and", "or", "with", "for", "of", "in", "on", "to", "the", "a", "an"]);
  return s
    .split(" ")
    .map((w, i) => {
      if (/^[A-Z0-9&+/-]{2,}$/.test(w) && /[A-Z]/.test(w)) return w; // S925, XL 등 유지
      const lw = w.toLowerCase();
      if (i > 0 && small.has(lw)) return lw;
      return lw.replace(/(^|[-/(])([a-z])/g, (_m, a, b) => a + b.toUpperCase());
    })
    .join(" ");
}

const JOIN = (a: string[]) => (a.length <= 1 ? a.join("") : a.length === 2 ? a.join(" and ") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
const clean1 = (s: string) => s.replace(/\s+/g, " ").replace(/[.;]+$/, "").trim();
const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function pickMaterial(specs: Record<string, string>, raw: Record<string, any>, title: string): string | null {
  for (const k of ["main fabric composition", "material", "fabric name", "composition", "fabric", "inlay material"]) {
    const v = specs[k];
    if (v && !/^cloth$/i.test(v) && v.length <= 80) return clean1(v);
  }
  const entry = String(raw.entryNameEn ?? "");
  const m = (entry + " " + title).match(/\b(polyester|cotton|silk|nylon|linen|wool|viscose|rayon|acrylic|spandex|denim|stainless steel|925 silver|sterling silver|alloy|copper|leather)\b/i);
  return m ? cap1(m[1].toLowerCase()) : null;
}

export type ListingCopy = { title: string; bullets: string[]; description: string; searchTerms: string };

export function composeCopy(opts: {
  rawTitle: string;
  type: TypeDef;
  specs: Record<string, string>;
  colors: string[];
  sizes: string[];
  material: string | null;
  asianSizing: boolean;
}): ListingCopy {
  const { type, specs, colors, sizes, material, asianSizing } = opts;
  const base = titleCase(cleanTitle(opts.rawTitle));
  const hasNoun = new RegExp(`\\b${type.noun.replace(/[- ]/g, "[- ]?")}s?\\b`, "i").test(base) || type.key === "set";
  const descriptors: string[] = [];
  for (const k of ["design", "style category", "waist style", "fit", "sleeve style", "skirt length", "pants length", "pattern", "neckline", "collar type", "trendy element", "piece trendy element", "trendy elements"]) {
    const v = specs[k];
    if (v && v.length <= 40 && !/universal|^none$/i.test(v)) {
      for (const part of v.split(/\s*[\/,]\s*/)) if (part.trim()) descriptors.push(lowerFirst(clean1(part)));
    }
  }
  const uniq = [...new Set(descriptors.map((d) => d.toLowerCase()))].slice(0, 4);

  let core = base;
  const words = core.split(" ").filter(Boolean);
  if (words.length < 2 || words.length > 22 || !hasNoun) {
    const lead = uniq.slice(0, 2).map(titleCase).join(" ");
    core = [lead, type.noun].filter(Boolean).join(" ").trim();
  }
  const colorTitle = colors.length === 1 ? ` - ${colors[0]}` : "";
  let title = `LEXI Women's ${core}${colorTitle}`;
  if (type.group === "jewelry" || type.group === "bag" || type.key === "backpack") title = `LEXI ${core}${colorTitle}`;
  if (type.key === "backpack") title = `LEXI ${core}${colorTitle}`;
  title = title.replace(/\s+/g, " ").replace(/\s,/g, ",").trim();
  if (title.length > 190) title = title.slice(0, 190).replace(/\s+\S*$/, "");

  const b: string[] = [];
  // 1) 디자인/핏
  if (uniq.length) b.push(`STYLE DETAILS – Features ${JOIN(uniq)} for an easy, current look.`);
  else b.push(`CURATED STYLE – A LEXI-edited ${type.noun.toLowerCase()} chosen for an easy, wearable look.`);
  // 2) 소재
  if (material) b.push(`FABRIC – ${type.group === "jewelry" || type.group === "bag" ? "Material" : "Made from"}: ${material}. Please check the colour and size options before ordering.`);
  // 3) 색상·사이즈
  const colorPart = colors.length ? `Colour options: ${JOIN(colors)}.` : "";
  const sizePart = sizes.length ? `Sizes: ${sizes.join(", ")}.` : "";
  if (colorPart || sizePart) b.push(`COLOURS & SIZES – ${[colorPart, sizePart].filter(Boolean).join(" ")}`);
  // 4) 사이즈 가이드 (호주 반품 감소용 — CJ 공식 안내 문구에 근거)
  if (asianSizing && type.group !== "jewelry" && type.group !== "bag") {
    b.push("SIZING NOTE – Sizing runs smaller than standard Australian sizing. If you are between sizes, we recommend choosing the larger size.");
  }
  // 5) 스타일링
  b.push(`STYLING – ${type.styling}`);
  const bullets = b.slice(0, 5);
  while (bullets.length < 3) bullets.push(`EVERYDAY WEAR – Part of the LEXI curated edit of ${type.itemKw}.`);

  const specLines = Object.entries({
    Material: material ?? undefined,
    Colours: colors.length ? colors.join(", ") : undefined,
    Sizes: sizes.length ? sizes.join(", ") : undefined,
    Fit: specs["fit"],
    Length: specs["skirt length"] ?? specs["pants length"] ?? specs["length"],
  })
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}.`);
  const description = [
    `${title.replace(/ - [^-]+$/, "")} is part of the LEXI curated womenswear and accessories edit. ${bullets[0].split(" – ")[1] ?? ""}`.trim(),
    specLines.join(" "),
    asianSizing && type.group === "apparel" ? "Sizing guide: measurements follow Asian sizing, which can run one to two sizes smaller than Australian sizes. Please compare with your usual measurements and size up if you are between sizes." : "",
    "Product colours may vary slightly depending on your screen settings.",
  ].filter(Boolean).join("\n\n").slice(0, 1900);

  const titleWords = new Set(title.toLowerCase().split(/[^a-z0-9]+/));
  const search = [...new Set(type.search.flatMap((s) => s.split(" ")))].filter((w) => !titleWords.has(w) && w.length > 2);
  const searchTerms = search.join(" ").slice(0, 240);

  return { title, bullets, description, searchTerms };
}
