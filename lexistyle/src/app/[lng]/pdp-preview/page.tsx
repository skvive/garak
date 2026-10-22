import { localStore } from "@/lib/local-store";
import Link from "next/link";
import { ProductPagination } from "@/components/commerce/product-pagination";
import { paginateSlice, parsePageParam, STOREFRONT_PAGE_SIZE } from "@/lib/catalog/pagination";

export const dynamic = "force-dynamic";
export const metadata = { title: "PDP 프리뷰" };

function getPreviewData() {
  const s = localStore();
  const docs = ((s.pdpDocs ?? []) as any[]).sort((a: any, b: any) => a.id - b.id);
  const catalog: Record<string | number, any> = ((s.catalog ?? []) as any[]).reduce((acc: any, r: any) => {
    acc[r.id] = r;
    return acc;
  }, {});
  return { docs, catalog };
}

function catLabel(cat: string[]) {
  if (!cat?.length) return "";
  const map: Record<string, string> = {
    "women-clothing": "여성의류",
    dresses: "드레스",
    tops: "상의",
    outerwear: "아우터",
    bottoms: "하의",
    knitwear: "니트",
    sets: "셋업",
    sweatshirts: "스웨트셔츠",
    activewear: "액티브",
    accessories: "악세서리",
  };
  return cat.map((c) => map[c] ?? c).join(" > ");
}

export default async function PdpPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageRaw } = await searchParams;
  const page = parsePageParam(pageRaw);
  const { docs, catalog } = getPreviewData();
  const result = paginateSlice(docs, page, STOREFRONT_PAGE_SIZE);

  return (
    <main style={{ maxWidth: 1400, margin: "0 auto", padding: 24, fontFamily: "Pretendard, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>PDP 프리뷰</h1>
      <p style={{ color: "#6e6e73", marginBottom: 24, fontSize: 14 }}>
        생성된 {result.total.toLocaleString()}개 상품페이지 · 페이지당 {STOREFRONT_PAGE_SIZE}개
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {result.items.map((d: any) => {
          const body = d.body ?? {};
          const blocks = body.designDoc?.blocks ?? [];
          const blockTypes = blocks.map((b: any) => b.type).join(", ");
          const cat = (catalog[d.catalogId] as any)?.categoryPath ?? [];
          const price = (catalog[d.catalogId] as any)?.minPrice ?? "";
          const thumb = (catalog[d.catalogId] as any)?.primaryThumbUrl ?? "";

          return (
            <Link
              key={d.id}
              href={`/pdp-preview/${d.id}`}
              style={{
                border: "1px solid #e4e4e0",
                borderRadius: 14,
                overflow: "hidden",
                textDecoration: "none",
                color: "inherit",
                background: "#faf9f7",
              }}
              target="_blank"
            >
              <div
                style={{
                  aspectRatio: "4/5",
                  background: `center/cover no-repeat url(${thumb || "https://picsum.photos/seed/default/400/500"})`,
                  backgroundColor: "#ebe6dc",
                  display: "flex",
                  alignItems: "flex-end",
                  padding: 12,
                }}
              >
                <span
                  style={{
                    background: "rgba(0,0,0,0.6)",
                    color: "#fff",
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  #{d.id}
                </span>
              </div>
              <div style={{ padding: "12px 14px" }}>
                <p style={{ fontSize: 13, color: "#5C7A6E", fontWeight: 600, marginBottom: 2 }}>
                  {catLabel(cat)}
                </p>
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>
                  {d.title}
                </p>
                <p style={{ fontSize: 12, color: "#6e6e73", marginBottom: 2 }}>
                  {price ? `$${price}` : ""} · {blockTypes ? `${blocks.length}블록` : ""}
                </p>
                <p style={{ fontSize: 11, color: "#6e6e73" }}>
                  engine: {d.engine ?? "?"} · status: {d.status}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <ProductPagination
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        pageSize={result.pageSize}
        pathname="/pdp-preview"
      />
    </main>
  );
}
