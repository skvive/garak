import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { requireVerifiedNeonAdmin } from "@/lib/auth/admin";
import { db, hasDb } from "@/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "광양수산 입점대기 상품 | 가락한상 HQ" };

type DraftRow = {
  sku: string;
  source_no: number;
  category_name: string;
  name: string;
  description: string | null;
  price_krw: number;
  stock: number;
  status: string;
  visible: boolean;
  purchasable: boolean;
  image_verified: boolean;
  image_ref: string | null;
  qa_notes: string | null;
};
type CategoryRow = { name: string; total: number; sort_order: number };
const fmt = (value: number | string) => Number(value).toLocaleString("ko-KR");

async function requireVerifiedPartnerAdmin() {
  // Only verified Neon Auth admins can view the unapproved supplier register.
  // No demo, legacy cookie or anonymous HQ override is accepted.
  const session = await requireVerifiedNeonAdmin();
  if (!session) redirect("/auth/sign-in?next=/hq/partners/gwangyang");
}

export default async function GwangyangPendingCatalogPage() {
  await requireVerifiedPartnerAdmin();

  if (!hasDb()) {
    return <p role="alert">DB 연결이 없어 광양수산 입점대기 원장을 확인할 수 없습니다.</p>;
  }

  // Separate pending-only tables: never join with storefront products,
  // inventory, checkout, public categories or indexers.
  const [productsResult, categoriesResult] = await Promise.all([
    db().execute(sql`
      SELECT p.sku, p.source_no, c.name AS category_name, p.name, p.description,
             p.price_krw, p.stock, p.status, p.visible, p.purchasable,
             p.image_verified, p.image_ref, p.qa_notes
      FROM public.garak_partner_products p
      JOIN public.garak_partner_categories c ON c.code = p.category_code
      WHERE p.merchant_slug = 'gwangyang-fisheries'
      ORDER BY c.sort_order, p.source_no
    `),
    db().execute(sql`
      SELECT c.name, c.sort_order, count(p.sku)::int AS total
      FROM public.garak_partner_categories c
      LEFT JOIN public.garak_partner_products p ON p.category_code = c.code
      WHERE c.merchant_slug = 'gwangyang-fisheries'
      GROUP BY c.name, c.sort_order
      ORDER BY c.sort_order
    `),
  ]);

  const products = productsResult.rows as unknown as DraftRow[];
  const categories = categoriesResult.rows as unknown as CategoryRow[];
  const safeCount = products.filter(
    (p) => p.status === "pending" && !p.visible && !p.purchasable && !p.image_verified && p.stock === 0,
  ).length;
  const unsafeCount = products.length - safeCount;

  return (
    <section className="mx-auto max-w-7xl space-y-6 pb-16">
      <div>
        <p className="text-xs font-semibold tracking-[.15em] text-coral">GARAK HANSANG · MERCHANT REVIEW</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">광양수산 상품 입점대기 원장</h1>
        <p className="mt-2 text-sm text-dim">
          수산 / 회·활어 / 광양수산 · 원본 CSV 11~47번 상품 · 관리자 전용
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-paper p-5">
          <p className="text-xs text-dim">등록 상품</p>
          <p className="mt-1 text-3xl font-semibold">{fmt(products.length)}개</p>
        </div>
        <div className="rounded-xl border border-line bg-paper p-5">
          <p className="text-xs text-dim">광양수산 세부 카테고리</p>
          <p className="mt-1 text-3xl font-semibold">{fmt(categories.length)}개</p>
        </div>
        <div className="rounded-xl border border-line bg-paper p-5">
          <p className="text-xs text-dim">승인대기 · 공개차단</p>
          <p className="mt-1 text-3xl font-semibold">{fmt(safeCount)}개</p>
        </div>
      </div>

      <div role={unsafeCount ? "alert" : "status"} className="rounded-xl border border-line bg-fog p-4 text-sm leading-relaxed text-ink">
        {unsafeCount > 0
          ? `주의: ${unsafeCount}개 상품이 입점대기 안전조건에서 벗어났습니다. 공개 상태 및 승인 기록을 확인하세요.`
          : "전 상품 입점대기 / 재고 0 / 미공개 / 구매 불가. 사진·원산지·구성·제철·재고 승인 전에는 판매하지 않습니다."}
      </div>

      <section aria-label="광양수산 카테고리">
        <h2 className="mb-3 text-lg font-semibold text-ink">카테고리별 등록 수</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span key={c.name} className="rounded-full border border-line bg-paper px-3 py-2 text-xs text-ink">
              {c.name} <strong className="ml-1">{fmt(c.total)}</strong>
            </span>
          ))}
        </div>
      </section>

      <section aria-label="광양수산 상품 검수 목록">
        <h2 className="mb-3 text-lg font-semibold text-ink">상품 검수 목록</h2>
        <div className="overflow-x-auto rounded-xl border border-line bg-paper">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-fog text-xs text-dim">
              <tr>
                <th className="p-3">번호 / SKU</th>
                <th className="p-3">상품 / 카테고리</th>
                <th className="p-3">원화 가격</th>
                <th className="p-3">등록 상태</th>
                <th className="p-3">이미지·품질 검수</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.sku} className="border-t border-line align-top">
                  <td className="whitespace-nowrap p-3 text-xs text-dim">#{p.source_no}<div>{p.sku}</div></td>
                  <td className="p-3">
                    <p className="font-semibold text-ink">{p.name}</p>
                    <p className="mt-1 text-xs text-dim">{p.category_name}</p>
                    {p.description && <p className="mt-1 text-xs text-dim">{p.description}</p>}
                  </td>
                  <td className="whitespace-nowrap p-3 font-semibold">{fmt(p.price_krw)}원</td>
                  <td className="whitespace-nowrap p-3 text-xs">
                    <span>{p.status === "pending" ? "입점대기" : p.status}</span>
                    <p className="mt-1 text-dim">{p.visible ? "공개" : "비공개"} · {p.purchasable ? "구매 가능" : "구매 차단"}</p>
                  </td>
                  <td className="p-3 text-xs">
                    <p>{p.image_verified ? "이미지 검수됨" : "이미지 미검수"}</p>
                    {p.qa_notes && <p className="mt-1 max-w-sm text-dim">{p.qa_notes}</p>}
                    {p.image_ref && <p className="mt-1 max-w-sm break-all text-dim">원본 참조: {p.image_ref}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="text-xs text-dim">
        상품 가격은 원본 CSV의 원화 가격입니다. 이미지 경로는 검수용 참조일 뿐 공개 상품 이미지 URL이 아닙니다.
        별도 판매승인·재고확인 절차 전까지 고객용 목록과 결제 경로에는 연결되지 않습니다.
      </p>
    </section>
  );
}
