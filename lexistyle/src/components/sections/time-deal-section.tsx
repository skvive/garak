import { listHomeProducts } from "@/lib/catalog";
import { TimeDeal } from "@/components/sections/time-deal";

/** 서버: 여성의류 PDP 40개 → 타임딜 클라이언트로 전달 */
export async function TimeDealSection() {
  const all = await listHomeProducts(40);
  const onSale = all.filter((p) => p.discountRate > 0).sort((a, b) => b.discountRate - a.discountRate);
  if (!onSale.length) return null;
  return <TimeDeal products={onSale.slice(0, 14)} />;
}
