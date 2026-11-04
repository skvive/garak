import Image from "next/image";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { db, hasDb } from "@/db";

export const dynamic = "force-dynamic";

type ApprovedSeafood = {
  sku: string;
  name: string;
  description: string | null;
  price_krw: number;
  image_ref: string;
  category_name: string;
};

// Never render demo fixtures or unpublished merchant catalog products.
// A product needs explicit merchant-category approval, verified photo,
// positive stock and sale flags before it can appear on the homepage.
async function listApprovedSeafood(): Promise<ApprovedSeafood[]> {
  if (!hasDb()) return [];
  try {
    const result = await db().execute(sql`
      SELECT p.sku, p.name, p.description, p.price_krw,
             p.image_ref, c.name AS category_name
      FROM public.garak_partner_products p
      INNER JOIN public.garak_partner_categories c ON c.code = p.category_code
      WHERE p.status = 'approved'
        AND c.status = 'approved'
        AND p.visible IS TRUE
        AND p.purchasable IS TRUE
        AND p.image_verified IS TRUE
        AND p.stock > 0
        AND p.image_ref ~* '^https://'
      ORDER BY p.updated_at DESC, p.source_no ASC
      LIMIT 12
    `);
    return result.rows as unknown as ApprovedSeafood[];
  } catch {
    // A missing/unavailable DB must never silently enable fake products.
    return [];
  }
}

const FEATURE_CATEGORIES = [
  {
    title: "회 · 활어",
    detail: "광어, 참돔, 모둠회의 다양한 구성",
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=85",
    label: "01",
  },
  {
    title: "프리미엄 횟감",
    detail: "특수부위와 참치, 특별한 날의 한 상",
    image: "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=900&q=85",
    label: "02",
  },
  {
    title: "제철 수산",
    detail: "계절에 따라 달라지는 바다의 맛",
    image: "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=900&q=85",
    label: "03",
  },
  {
    title: "갑각류 · 해산물",
    detail: "꽃게, 대게, 새우 등 바다의 별미",
    image: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=900&q=85",
    label: "04",
  },
] as const;

const REVIEW_STEPS = [
  { no: "01", name: "점포 입점 확인", text: "판매 주체와 상품 공급 조건을 확인합니다." },
  { no: "02", name: "상품 정보 검수", text: "어종·원산지·중량·손질 방식과 이미지를 대조합니다." },
  { no: "03", name: "판매 가능 상태 점검", text: "가격·재고·배송 정보를 확인한 상품만 공개합니다." },
] as const;

export default async function HomePage() {
  const approved = await listApprovedSeafood();

  return (
    <div className="min-h-screen bg-[#f8fafb] text-[#102b3e]">
      <h1 className="sr-only">가락한상숍 — 가락시장의 신선한 횟감과 수산물</h1>
      <section className="relative isolate min-h-[560px] overflow-hidden bg-[#061e31] text-white sm:min-h-[610px]" aria-label="가락한상 수산물 소개">
        <Image
          src="https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=2200&q=88"
          alt="신선한 생선회와 해산물을 담은 수산물 테이블 연출"
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover object-[65%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#041b2e]/95 via-[#06263b]/80 to-[#06263b]/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#041b2e]/65 via-transparent to-[#041b2e]/15" />
        <div className="relative mx-auto flex min-h-[560px] max-w-7xl flex-col justify-center px-5 py-16 sm:min-h-[610px] sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold tracking-[0.12em] backdrop-blur">
              <span className="size-2 rounded-full bg-[#76cbb9]" aria-hidden="true" />
              GARAK HANSANG · FRESH SEAFOOD
            </p>
            <p className="mb-2 text-sm font-medium text-[#c6e8ed]">가락시장에서 시작하는 신선한 식탁</p>
            <h2 className="text-[clamp(2.6rem,6.2vw,5.4rem)] font-bold leading-[1.09] tracking-[-0.055em]">
              바다의 신선함을
              <br />
              한 상 가득.
            </h2>
            <p className="mt-6 max-w-lg text-sm leading-7 text-white/85 sm:text-lg">
              회·활어부터 제철 해산물과 갑각류까지.
              <br className="hidden sm:block" />
              가락시장의 다양한 수산물을 상품 정보와 공급 조건부터 꼼꼼히 확인해 소개합니다.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#verified-products" className="rounded-full bg-[#e8573f] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:bg-[#d34530]">
                검수 완료 상품 보기
              </a>
              <a href="#seafood-categories" className="rounded-full border border-white/65 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20">
                수산 카테고리 살펴보기
              </a>
            </div>
            <p className="mt-7 text-[11px] text-white/65">※ 메인 이미지는 상품 실사 또는 특정 입점 점포의 실제 판매 상품 사진이 아닌 연출 이미지입니다.</p>
          </div>
        </div>
      </section>

      <section aria-label="상품 정보 투명성" className="border-b border-[#d9e5e8] bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-5 text-sm text-[#416071] sm:grid-cols-3 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3"><span className="text-2xl" aria-hidden="true">🐟</span><span><strong className="block text-[#102b3e]">수산물 중심</strong>회·횟감과 제철 해산물</span></div>
          <div className="flex items-center gap-3"><span className="text-2xl" aria-hidden="true">🔎</span><span><strong className="block text-[#102b3e]">상품별 정보 확인</strong>원산지·중량·구성 확인 절차</span></div>
          <div className="flex items-center gap-3"><span className="text-2xl" aria-hidden="true">🛡️</span><span><strong className="block text-[#102b3e]">승인 후 판매</strong>점포·이미지·재고 검수 완료 기준</span></div>
        </div>
      </section>

      <section id="seafood-categories" aria-labelledby="seafood-categories-title" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[#13769b]">FRESH MARKET CURATION</p>
            <h2 id="seafood-categories-title" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">수산물, 이렇게 만나보세요</h2>
            <p className="mt-3 text-sm text-[#5d7380]">광양수산 메뉴 자료와 가락한상 기획서를 참고한 카테고리 안내입니다. 개별 상품의 판매 여부는 별도로 표시합니다.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURE_CATEGORIES.map((category) => (
            <div key={category.title} className="group overflow-hidden rounded-2xl border border-[#dde6ea] bg-white shadow-sm">
              <div className="relative aspect-[4/3] overflow-hidden bg-[#0f3546]">
                <Image src={category.image} alt="" fill unoptimized sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#072536]/70 to-transparent" />
                <span className="absolute bottom-4 left-4 text-xs font-semibold tracking-widest text-white/85">{category.label} · SEAFOOD</span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold">{category.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#647682]">{category.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-[#84939b]">※ 카테고리 사진은 연출 이미지이며 실제 상품·입점 업체를 나타내지 않습니다.</p>
      </section>

      <section id="verified-products" aria-labelledby="verified-products-title" className="border-y border-[#d9e5e8] bg-white py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="mb-8">
            <p className="text-xs font-bold tracking-[0.18em] text-[#13769b]">VERIFIED PRODUCT LIST</p>
            <h2 id="verified-products-title" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">검수 완료 입점 상품</h2>
            <p className="mt-3 text-sm text-[#5d7380]">상품명·가격·실물 이미지·재고 및 점포 승인 절차를 통과한 상품만 진열합니다.</p>
          </div>
          {approved.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {approved.map((p) => (
                <article key={p.sku} className="overflow-hidden rounded-2xl border border-[#d9e5e8] bg-[#f9fbfc]">
                  <div className="relative aspect-[4/3] bg-[#e3edf0]">
                    <Image src={p.image_ref} alt={p.name} fill unoptimized sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,25vw" className="object-cover" />
                  </div>
                  <div className="space-y-2 p-5">
                    <p className="text-xs font-semibold text-[#13769b]">{p.category_name}</p>
                    <h3 className="text-base font-bold">{p.name}</h3>
                    {p.description && <p className="line-clamp-2 text-sm text-[#647682]">{p.description}</p>}
                    <p className="text-lg font-bold tabular-nums">{Number(p.price_krw).toLocaleString("ko-KR")}원</p>
                    <p className="text-xs text-[#647682]">상품 개별 주문·배송 조건은 점포에 확인해 주세요.</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#bed0da] bg-[#f7fafb] px-6 py-14 text-center sm:px-12">
              <div className="mb-4 text-4xl" aria-hidden="true">🐟</div>
              <h3 className="text-xl font-bold">입점 상품을 확인하고 있습니다</h3>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#627988]">
                현재 공개 가능한 검수 완료 상품이 없습니다.
                가격·원산지·상품 이미지·재고와 입점 승인이 확인되면 이곳에 순차적으로 소개합니다.
              </p>
              <Link href="/support" className="mt-6 inline-flex rounded-full border border-[#9cbbc8] bg-white px-5 py-3 text-sm font-semibold text-[#175572] hover:bg-[#eaf4f7]">
                입점 및 상품 문의
              </Link>
            </div>
          )}
        </div>
      </section>

      <section id="our-promise" aria-labelledby="review-process-title" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
        <div className="max-w-xl">
          <p className="text-xs font-bold tracking-[0.18em] text-[#13769b]">HOW WE REVIEW</p>
          <h2 id="review-process-title" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">판매 전에 확인할 세 가지</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#5d7380]">시연 상품이나 검증되지 않은 리뷰를 실제 판매 실적으로 보여드리지 않습니다.</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {REVIEW_STEPS.map((step) => (
            <div key={step.no} className="rounded-2xl border border-[#d9e5e8] bg-white p-6">
              <span className="text-xs font-bold tracking-[.13em] text-[#e8573f]">STEP {step.no}</span>
              <h3 className="mt-3 text-lg font-bold">{step.name}</h3>
              <p className="mt-2 text-sm leading-6 text-[#627988]">{step.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
