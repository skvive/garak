import { listHomeProducts } from "@/lib/catalog";
import { ShopTheLook } from "@/components/sections/shop-the-look";

const PIN_LAYOUT = [
  { x: 38, y: 34 },
  { x: 55, y: 62 },
  { x: 70, y: 48 },
];

/** 서버: 여성의류 PDP 3개로 Shop the Look 구성 */
export async function ShopTheLookSection() {
  const all = await listHomeProducts(40);
  const picks = all.slice(0, 3);
  if (!picks.length) return null;
  const pins = picks.map((product, i) => ({
    ...PIN_LAYOUT[i]!,
    product,
  }));
  return (
    <ShopTheLook
      title="Seoul City Look — 데일리 캐주얼"
      image={picks[0]!.image}
      pins={pins}
    />
  );
}
