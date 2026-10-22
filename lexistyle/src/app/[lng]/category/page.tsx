/**
 * 카테고리 픽커 — 상위 부서 + 그 아래 CJ 하위 카테고리(DB 정본).
 */
import { CategoryPicker } from "@/components/commerce/category-picker";
import { getCategoryTree } from "@/lib/catalog/category-tree";

export const dynamic = "force-dynamic";

export default async function CategoryPickerPage({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = await params;
  const tree = await getCategoryTree();
  return <CategoryPicker tree={tree} lng={lng} />;
}
