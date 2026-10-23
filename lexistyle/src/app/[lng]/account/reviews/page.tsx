import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { ReviewForm } from "@/components/review-form";
import { requireSession } from "@/lib/auth/admin";
import { getAccountReviews } from "@/lib/account/orders";

export const dynamic = "force-dynamic";
export const metadata = { title: "내 리뷰 | 마이" };

export default async function AccountReviewsPage() {
  const session = await requireSession();
  const email = session?.user?.email;
  if (!email) return <main className="mx-auto max-w-3xl px-4 py-8"><h1 className="font-display text-[28px] font-semibold">내 리뷰</h1><p className="mt-4 text-[14px] text-dim"><Link href="/auth/sign-in" className="font-bold text-coral">로그인</Link> 후 리뷰를 확인할 수 있습니다.</p></main>;
  const data = await getAccountReviews(email);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8" style={{ wordBreak: "keep-all" }}>
      <Link href="/account" className="text-[12px] font-semibold text-dim hover:text-ink">← 마이</Link>
      <h1 className="mt-2 font-display text-[30px] font-semibold [text-wrap:balance]">내 리뷰</h1>
      <p className="mt-1 text-[14px] leading-6 text-dim">배송 완료 상품의 후기를 작성하고 내가 남긴 리뷰를 확인하세요.</p>
      {data.eligible.length > 0 && <section className="mt-7"><h2 className="text-[15px] font-bold">작성 가능한 리뷰</h2><div className="mt-3 space-y-4">{data.eligible.map((product) => <article key={product.productId} className="rounded-3xl border border-line bg-paper p-4 sm:p-5"><div className="mb-4 flex items-center gap-3"><div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-fog">{product.productImage ? <Image src={product.productImage} alt="" fill sizes="64px" className="object-cover" /> : null}</div><div className="min-w-0"><p className="line-clamp-2 text-[14px] font-semibold leading-6">{product.productName}</p><p className="mt-0.5 text-[12px] text-sage">배송 완료</p></div></div><ReviewForm slug={product.slug} /></article>)}</div></section>}
      <section className="mt-8"><div className="flex items-end justify-between gap-3"><h2 className="text-[15px] font-bold">작성한 리뷰</h2><p className="text-[12px] tabular-nums text-dim">{data.reviews.length}건</p></div>
        {data.reviews.length === 0 ? <div className="mt-3 rounded-3xl bg-fog p-8 text-center"><Star className="mx-auto size-7 text-dim" strokeWidth={1.4} /><p className="mt-3 text-[14px] font-semibold">작성한 리뷰가 없습니다</p></div> : <ul className="mt-3 space-y-3">{data.reviews.map((review) => <li key={review.id} className="rounded-3xl border border-line p-4 sm:p-5"><div className="flex gap-3"><Link href={`/product/${review.slug}`} className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-fog">{review.productImage ? <Image src={review.productImage} alt="" fill sizes="64px" className="object-cover" /> : null}</Link><div className="min-w-0 flex-1"><Link href={`/product/${review.slug}`} className="line-clamp-1 text-[13px] font-semibold hover:underline">{review.productName}</Link><div className="mt-1 flex items-center gap-1" aria-label={`${review.rating}점`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`size-3.5 ${index < review.rating ? "fill-current text-gold" : "text-line"}`} />)}</div><p className="mt-1 text-[11px] text-dim">{review.createdAt.toLocaleDateString("ko-KR")}</p></div></div>{review.body && <p className="mt-3 text-[14px] leading-7 text-ink">{review.body}</p>}</li>)}</ul>}
      </section>
    </main>
  );
}
