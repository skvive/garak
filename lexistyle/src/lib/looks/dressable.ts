import { products, finalPrice, type Product } from "@/lib/dummy-data";
import { deptOfCategorySlug } from "@/lib/catalog/cj-taxonomy";
import type { DressableItem, GarmentSlot, LookSlots, SavedLook } from "./types";

/** 패션 SKU만 슬롯. 뷰티/리빙/키즈는 룩보드 제외 */
const SLOT_BY_SLUG: Record<string, GarmentSlot> = {
  "trench-coat": "outer",
  "oversize-knit": "top",
  "balloon-blouse": "top",
  "wide-slacks": "bottom",
  "mini-bag": "bag",
  "canvas-sneakers": "shoes",
};

export function slotForProduct(p: Product): GarmentSlot | null {
  if (SLOT_BY_SLUG[p.slug]) return SLOT_BY_SLUG[p.slug];
  if (!/women|men|fashion|clothing|shoe|bag|jewel|accessor/.test(p.category) && deptOfCategorySlug(p.category) !== "fashion") return null;
  const n = p.name.toLowerCase();
  if (/luggage|gift bag|decorati|storage|organizer|costume|pet |dog |cat |baby|child|kids|underwear|lingerie|bra\b|속옷|아동|유아/.test(n)) return null;
  if (/\b(dress(?:es)?|jumpsuits?)\b|원피스|점프수트/.test(n)) return "dress";
  if (/coat|trench|jacket|blazer|cardigan|코트|재킷|자켓|가디건/.test(n)) return "outer";
  if (/slacks|pant|skirt|jean|trouser|shorts|바지|팬츠|스커트|슬랙스/.test(n)) return "bottom";
  if (/\b(sneakers?|boots?|heels?|shoes?|sandals?|loafers?|slippers?)\b|신발|슈즈|스니커즈|샌들|부츠/.test(n)) return "shoes";
  if (/bag|tote|가방|백팩|핸드백/.test(n)) return "bag";
  if (/necklace|earring|bracelet|scarf|\bhat\b|목걸이|귀걸이|팔찌|모자|스카프/.test(n)) return "acc";
  if (/knit|blouse|tee|shirt|top|hoodie|sweater|니트|블라우스|셔츠|후드|티셔츠/.test(n)) return "top";
  return null;
}

export function toDressable(p: Product): DressableItem | null {
  const slot = slotForProduct(p);
  if (!slot) return null;
  return {
    slug: p.slug,
    name: p.name,
    brand: /cj\s|cjdropshipping/i.test(p.brand) ? "LEXI" : p.brand,
    price: finalPrice(p),
    discountRate: p.discountRate,
    slot,
    image: p.image,
    cutoutUrl: p.image,
    dressable: true,
  };
}

export function listDressable(all: Product[] = products): DressableItem[] {
  return all.map(toDressable).filter((x): x is DressableItem => x != null);
}

export function dressableBySlug(slug: string, all?: Product[]): DressableItem | null {
  const p = (all ?? products).find((x) => x.slug === slug);
  return p ? toDressable(p) : null;
}

export function itemsInSlot(slot: GarmentSlot, all?: Product[]): DressableItem[] {
  return listDressable(all).filter((i) => i.slot === slot);
}

export function defaultLookSlots(): LookSlots {
  return {
    outer: "trench-coat",
    top: "balloon-blouse",
    bottom: "wide-slacks",
    bag: "mini-bag",
    shoes: "canvas-sneakers",
  };
}

export function seedLook(): SavedLook {
  return {
    id: "today",
    title: "오늘의 룩",
    occasion: "비즈니스 캐주얼",
    slots: defaultLookSlots(),
    updatedAt: new Date().toISOString(),
  };
}

/** 원피스가 있으면 상의·하의 슬롯은 렌더에서 숨김 */
export function effectiveSlots(slots: LookSlots): LookSlots {
  if (slots.dress) {
    const { top: _t, bottom: _b, ...rest } = slots;
    return rest;
  }
  return slots;
}
