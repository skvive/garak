import { ProductsPanel } from "@/components/admin/products-panel";
import { CoupangPanel } from "@/components/hq/CoupangPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "HQ · 상품" };

export default async function HqProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const { channel } = await searchParams;
  return (
    <div>
      <h1 className="mb-4 font-display text-[24px] font-semibold">상품 원장</h1>
      {channel === "coupang" ? <CoupangPanel /> : <ProductsPanel />}
    </div>
  );
}
