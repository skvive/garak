import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { requireVerifiedNeonAdmin } from "@/lib/auth/admin";
import { db, hasDb } from "@/db";
import { submitGwangyangEvidence, reviewGwangyangEvidence } from "./actions";

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
type EvidenceRow = {
  id: number;
  sku: string | null;
  evidence_type: string;
  evidence_url: string;
  details: string;
  status: string;
  submitted_at: Date;
  submitted_by: string;
};
const EVIDENCE_TYPES = [
  { code: "business_registration", label: "점포 사업자 증명" },
  { code: "signed_merchant_contract", label: "입점 계약서 서명본" },
  { code: "photo_usage_rights", label: "현장·상품 사진 사용 동의" },
  { code: "cold_chain_plan", label: "저온 유통·보관 계획" },
  { code: "shipping_fee_policy", label: "배송 지역·요금·기준" },
  { code: "returns_refund_policy", label: "교환·환불 운영 규정" },
  { code: "pg_settlement_reconciliation", label: "결제 정산 대조 시험" },
  { code: "pg_refund_rehearsal", label: "PG 환불 시나리오 검증" },
  { code: "product_real_photo", label: "상품별 실제 사진" },
  { code: "product_origin_weight", label: "상품 원산지·중량 증빙" },
  { code: "product_price_agreement", label: "상품 공급가격·판매가 확인" },
  { code: "product_stock_confirmation", label: "상품 재고 확인" },
] as const;
const evidenceLabel = (code: string) => EVIDENCE_TYPES.find((x) => x.code === code)?.label ?? code;
const fmt = (value: number | string) => Number(value).toLocaleString("ko-KR");

async function requireVerifiedPartnerAdmin() {
  // Only verified Neon Auth admins can view the unapproved supplier register.
  // No demo, legacy cookie or anonymous HQ override is accepted.
  const session = await requireVerifiedNeonAdmin();
  if (!session) redirect("/auth/sign-in?next=/hq/partners/gwangyang");
  return session;
}

export default async function GwangyangPendingCatalogPage() {
  const viewerSession = await requireVerifiedPartnerAdmin();
  const reviewerEmail = viewerSession.user?.email?.toLowerCase() ?? "";

  if (!hasDb()) {
    return <p role="alert">DB 연결이 없어 광양수산 입점대기 원장을 확인할 수 없습니다.</p>;
  }

  // Separate pending-only tables: never join with storefront products,
  // inventory, checkout, public categories or indexers.
  const [productsResult, categoriesResult, evidenceResult, releaseResult] = await Promise.all([
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
    db().execute(sql`
      SELECT id, sku, evidence_type, evidence_url, details, status, submitted_at, submitted_by
      FROM public.garak_partner_evidence
      WHERE merchant_slug = 'gwangyang-fisheries'
      ORDER BY submitted_at DESC
      LIMIT 75
    `),
    db().execute(sql`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE release_ready IS TRUE)::int AS ready
      FROM public.garak_partner_release_ready
      WHERE merchant_slug = 'gwangyang-fisheries'
    `),
  ]);

  const products = productsResult.rows as unknown as DraftRow[];
  const categories = categoriesResult.rows as unknown as CategoryRow[];
  const evidence = evidenceResult.rows as unknown as EvidenceRow[];
  const release = releaseResult.rows[0] as unknown as { total: number; ready: number } | undefined;
  const reviewed = evidence.filter((e) => e.status === "verified").length;
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


      <section aria-label="상품 판매 승인 증빙 상태" className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="text-lg font-semibold text-ink">판매 승인 증빙 · 관리자 접수</h2>
        <p className="mt-2 text-sm leading-6 text-dim">
          자료 접수는 검증 완료가 아닙니다. 별도의 검수 담당자가 문서 진위, 서명, 사진 저작권,
          원산지·중량, 배송 및 결제·환불 증빙을 직접 확인해야 승인됩니다.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-fog p-4"><p className="text-xs text-dim">증빙 접수</p><p className="mt-1 text-2xl font-bold">{evidence.length}건</p></div>
          <div className="rounded-xl bg-fog p-4"><p className="text-xs text-dim">검증된 증빙 (최근 75건)</p><p className="mt-1 text-2xl font-bold">{reviewed}건</p></div>
          <div className="rounded-xl bg-fog p-4"><p className="text-xs text-dim">최종 공개 가능한 상품</p><p className="mt-1 text-2xl font-bold">{Number(release?.ready ?? 0)} / {Number(release?.total ?? 0)}</p></div>
        </div>
        <form action={submitGwangyangEvidence} className="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
          <label className="block text-sm font-semibold">증빙 종류
            <select name="evidenceType" required className="mt-2 w-full rounded-lg border border-line bg-white p-3 text-sm">
              {EVIDENCE_TYPES.map((e) => <option key={e.code} value={e.code}>{e.label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">상품 SKU (상품별 증빙에서만)
            <select name="sku" className="mt-2 w-full rounded-lg border border-line bg-white p-3 text-sm">
              <option value="">점포 공통 증빙</option>
              {products.map((p) => <option key={p.sku} value={p.sku}>{p.sku} · {p.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold sm:col-span-2">Google Drive 증빙 문서 링크
            <input name="sourceUrl" type="url" required maxLength={1000} placeholder="https://drive.google.com/file/d/…/view"
              className="mt-2 w-full rounded-lg border border-line bg-white p-3 text-sm" />
          </label>
          <label className="block text-sm font-semibold sm:col-span-2">검수 메모 (원산지·가격 기준일·사진 허락 범위 등)
            <textarea name="details" rows={3} maxLength={1000}
              className="mt-2 w-full rounded-lg border border-line bg-white p-3 text-sm" />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-full bg-ink px-6 py-3 text-sm font-bold text-white">
              미검증 증빙으로 접수
            </button>
            <p className="mt-2 text-xs leading-relaxed text-dim">
              입력한 링크는 관리자에게만 표시되며, 자동으로 상품 판매·결제 기능을 열지 않습니다.
              상품별 증빙을 접수하려면 SKU와 상품 증빙 종류를 모두 선택하세요.
            </p>
          </div>
        </form>
        <h3 className="mt-7 text-base font-semibold">최근 증빙 접수 내역</h3>
        {evidence.length === 0 ? (
          <p className="mt-3 rounded-xl bg-fog p-4 text-sm text-dim">실제 서명·원산지·재고 검증 증빙이 아직 접수되지 않았습니다.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-[650px] w-full text-left text-sm">
              <thead><tr className="border-b border-line text-xs text-dim"><th className="p-2">증빙</th><th className="p-2">상품</th><th className="p-2">상태</th><th className="p-2">자료</th><th className="p-2">이중 검수</th></tr></thead>
              <tbody>
                {evidence.map((e) => (
                  <tr key={e.id} className="border-b border-line/60">
                    <td className="p-2">{evidenceLabel(e.evidence_type)}</td>
                    <td className="p-2">{e.sku ?? "점포 공통"}</td>
                    <td className="p-2">{e.status === "submitted" ? "접수·미검수" : e.status === "verified" ? "증빙 확인" : "반려"}</td>
                    <td className="p-2"><a href={e.evidence_url} rel="noopener noreferrer" target="_blank" className="text-sage underline">증빙 열기</a></td>
                    <td className="p-2">
                      {e.status === "submitted" && e.submitted_by.toLowerCase() !== reviewerEmail ? (
                        <form action={reviewGwangyangEvidence} className="flex min-w-[270px] flex-col gap-2">
                          <input type="hidden" name="evidenceId" value={e.id} />
                          <select name="decision" className="rounded-lg border border-line p-2 text-xs" required>
                            <option value="rejected">증빙 반려</option>
                            <option value="verified">진위·사용권·정보 대조 후 검증</option>
                          </select>
                          <input name="reviewNote" required minLength={10} maxLength={600}
                            placeholder="문서 확인일·근거·서명·사용권 범위" className="rounded-lg border border-line p-2 text-xs" />
                          <label className="flex gap-1 text-xs text-dim">
                            <input name="acknowledged" value="yes" type="checkbox" required />
                            실제 증빙을 열어 검토했습니다.
                          </label>
                          <button type="submit" className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white">검수 결정 기록</button>
                        </form>
                      ) : e.status === "submitted" ? (
                        <span className="text-xs text-dim">접수자 본인 검수 불가</span>
                      ) : (
                        <span className="text-xs text-dim">결정 기록됨</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
