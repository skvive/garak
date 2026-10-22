/** LEXI 룩보드 계약 — docs/lexi-mobile-alta-vto-plan.md */

export const GARMENT_SLOTS = [
  "outer",
  "top",
  "bottom",
  "dress",
  "shoes",
  "bag",
  "acc",
] as const;

export type GarmentSlot = (typeof GARMENT_SLOTS)[number];

export const SLOT_LABEL: Record<GarmentSlot, string> = {
  outer: "아우터",
  top: "상의",
  bottom: "하의",
  dress: "원피스",
  shoes: "슈즈",
  bag: "가방",
  acc: "액세서리",
};

export type DressableItem = {
  slug: string;
  name: string;
  brand: string;
  price: number;
  discountRate: number;
  slot: GarmentSlot;
  image: string;
  /** 알파 PNG. 워커 전엔 원본 image와 동일 */
  cutoutUrl: string;
  dressable: true;
};

export type LookSlots = Partial<Record<GarmentSlot, string>>;

export type SavedLook = {
  id: string;
  title: string;
  occasion: string;
  slots: LookSlots;
  updatedAt: string;
};

export type AvatarState = {
  status: "none" | "ready" | "dummy";
  /** 공개 불가 가정. 더미는 스톡 전신 */
  imageUrl: string | null;
  consentAt: string | null;
  disclaimer: string;
};

export type VtoJob = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  provider: "wan";
  token?: string;
  outputUrl: string | null;
  error: string | null;
  disclaimer: string;
};

export const FIT_DISCLAIMER =
  "참고 이미지입니다. 핏·색은 실물과 다를 수 있습니다. 실측 피팅이 아닙니다.";
