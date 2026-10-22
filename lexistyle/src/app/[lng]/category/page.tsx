/**
 * 카테고리 픽커 — 상위 부서 + 그 아래 CJ 하위 카테고리(DB 정본).
 * 더미 모드(DB 없음)에서는 부서 그리드 폴백을 렌더링한다.
 */
import { CategoryPicker } from "@/components/commerce/category-picker";
import { getCategoryTree } from "@/lib/catalog/category-tree";
import { departments } from "@/lib/departments";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CategoryPickerPage({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = await params;
  const tree = await getCategoryTree();
  const hasTree = tree.some((d) => d.total > 0);
  if (hasTree) return <CategoryPicker tree={tree} lng={lng} />;

  // 가락한상 더미 폴백 — 부서 그리드
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-12">
      <h1 className="font-display text-[24px] font-semibold">카테고리</h1>
      <p className="mt-1 text-[12px] text-dim">가락시장 수산·축산·청과 — 부서별로 둘러보세요</p>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {departments.map((d) => (
          <Link
            key={d.slug}
            href={`/category/${d.slug}`}
            className="rounded-xl border border-line bg-fog/50 p-4 transition-colors hover:bg-fog"
          >
            <p className="text-[15px] font-bold text-ink">{d.label}</p>
            <p className="mt-0.5 text-[11px] text-dim">{d.en}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
