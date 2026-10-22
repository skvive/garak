import { GARMENT_SLOTS, type LookSlots, type DressableItem } from "./types";

export function validateSlots(value: unknown): LookSlots {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("상품 구성을 확인해 주세요.");
  const slots: LookSlots = {};
  for (const [key, slug] of Object.entries(value)) {
    if (!GARMENT_SLOTS.includes(key as typeof GARMENT_SLOTS[number])) throw new Error("잘못된 상품 종류입니다.");
    if (typeof slug !== "string" || !slug.length || slug.length > 160) throw new Error("상품을 다시 선택해 주세요.");
    slots[key as typeof GARMENT_SLOTS[number]] = slug;
  }
  if (slots.dress && (slots.top || slots.bottom)) throw new Error("원피스와 상의·하의는 함께 선택할 수 없습니다.");
  return slots;
}

export function selectItems(slots: LookSlots, catalog: DressableItem[]) {
  return Object.entries(slots).map(([slot, slug]) => {
    const item = catalog.find(i => i.slug === slug && i.slot === slot);
    if (!item) throw new Error("판매 중인 상품을 다시 선택해 주세요.");
    return item;
  });
}
