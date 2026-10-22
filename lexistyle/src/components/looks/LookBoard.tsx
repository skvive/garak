"use client";

/**
 * 모드 A 페이퍼 보드 — 알파 컷아웃이 있을 때만 전신 레이어로 쓴다.
 * 히어로 JPG 폴백 콜라주는 UX상 금지에 가깝다 → TodayLook은 compose 이미지를 우선.
 * @see docs/lexi-today-look-ai-outfit-plan.md
 */
import {
  FIT_DISCLAIMER,
  GARMENT_SLOTS,
  SLOT_LABEL,
  type DressableItem,
  type GarmentSlot,
  type SavedLook,
} from "@/lib/looks/types";
import { effectiveSlots } from "@/lib/looks/dressable";

const Z: Record<GarmentSlot, number> = {
  shoes: 1,
  bottom: 2,
  top: 3,
  dress: 4,
  outer: 5,
  bag: 6,
  acc: 7,
};

const POS: Record<GarmentSlot, string> = {
  outer: "top-[6%] left-[18%] w-[64%] h-[52%]",
  top: "top-[12%] left-[26%] w-[48%] h-[26%]",
  bottom: "top-[36%] left-[28%] w-[44%] h-[36%]",
  dress: "top-[12%] left-[24%] w-[52%] h-[55%]",
  shoes: "bottom-[6%] left-[32%] w-[36%] h-[14%]",
  bag: "top-[38%] right-[8%] w-[28%] h-[22%]",
  acc: "top-[8%] right-[18%] w-[20%] h-[12%]",
};

function Silhouette() {
  return (
    <svg
      viewBox="0 0 200 440"
      className="pointer-events-none absolute inset-0 h-full w-full text-line"
      aria-hidden
    >
      <g fill="currentColor" opacity="0.45">
        <ellipse cx="100" cy="42" rx="22" ry="26" />
        <rect x="92" y="64" width="16" height="18" rx="6" />
        <path d="M62 88c0-6 8-12 38-12s38 6 38 12l8 92c1 14-8 22-22 24l-8 118H84L76 204c-14-2-23-10-22-24z" />
        <path d="M78 322h18l6 96H72z" />
        <path d="M104 322h18l12 96H110z" />
      </g>
    </svg>
  );
}

function hasRealCutout(item: DressableItem): boolean {
  return Boolean(item.cutoutUrl && item.cutoutUrl !== item.image);
}

export function LookBoard({
  look,
  items,
  onPickSlot,
}: {
  look: SavedLook;
  items: DressableItem[];
  onPickSlot?: (slot: GarmentSlot) => void;
}) {
  const bySlug = new Map(items.map((i) => [i.slug, i]));
  const filled = effectiveSlots(look.slots);
  const layerItems = GARMENT_SLOTS.map((slot) => {
    const slug = filled[slot];
    if (!slug) return null;
    const item = bySlug.get(slug);
    if (!item || !hasRealCutout(item)) return null;
    return { slot, item };
  }).filter(Boolean) as { slot: GarmentSlot; item: DressableItem }[];

  const collageUnsafe = layerItems.length === 0;

  return (
    <div className="tracking-normal" style={{ wordBreak: "keep-all" }}>
      <div className="relative mx-auto h-[440px] max-w-sm overflow-hidden rounded-2xl bg-fog">
        {collageUnsafe ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-[14px] font-bold leading-relaxed text-ink">AI 착장으로 미리보기</p>
            <p className="text-[13px] leading-relaxed text-dim">
              컷아웃 준비 전에는 제품 사진을 몸에 겹치지 않습니다. 홈의 착장 이미지 또는 「내 몸에
              입혀보기」를 사용하세요.
            </p>
          </div>
        ) : (
          <>
            <Silhouette />
            {layerItems.map(({ slot, item }) => (
              <img
                key={slot}
                src={item.cutoutUrl}
                alt={item.name}
                className={`absolute object-contain mix-blend-multiply drop-shadow ${POS[slot]}`}
                style={{ zIndex: Z[slot] }}
              />
            ))}
          </>
        )}
      </div>

      <div className="mx-auto mt-3 flex max-w-sm flex-wrap justify-center gap-1.5">
        {GARMENT_SLOTS.map((slot) => {
          const slug = look.slots[slot];
          const empty = !slug;
          return (
            <button
              key={slot}
              type="button"
              onClick={() => onPickSlot?.(slot)}
              className={`rounded-full border px-2.5 py-1 text-[12px] leading-relaxed ${
                empty ? "border-line bg-paper text-dim" : "border-ink/15 bg-paper text-ink"
              }`}
            >
              {empty ? `${SLOT_LABEL[slot]} · 비움` : SLOT_LABEL[slot]}
            </button>
          );
        })}
      </div>

      <p className="mx-auto mt-3 max-w-sm text-[12px] leading-relaxed text-dim">{FIT_DISCLAIMER}</p>
    </div>
  );
}
