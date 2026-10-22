// filepath: src/app/account/wishlist/page.tsx
import Link from "next/link";
import { requireSession } from "@/lib/auth/admin";
import { listWishlistProducts } from "@/lib/wishlist";
import { hasDb } from "@/db";
import { ProductCardDense } from "@/components/commerce/product-card-dense";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const session = await requireSession();
  const email = session?.user?.email;

  if (!email) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-[28px] font-semibold">Wishlist</h1>
        <p className="mt-4 text-[14px] text-dim">
          <Link href="/auth/sign-in" className="font-bold text-coral">
            로그인
          </Link>
          후 위시리스트를 동기화할 수 있습니다.
        </p>
      </div>
    );
  }

  if (!hasDb()) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-[28px] font-semibold">Wishlist</h1>
        <p className="mt-4 rounded-2xl bg-fog p-6 text-[13px] text-dim">
          DB 연결 후 위시리스트가 저장됩니다 (`wishlists` 테이블 준비됨).
        </p>
      </div>
    );
  }

  const products = await listWishlistProducts(email);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-[28px] font-semibold">Wishlist</h1>
      <p className="mt-1 text-[13px] text-dim">{products.length}개 저장됨</p>

      {products.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-fog p-8 text-center">
          <p className="text-[14px] font-semibold">아직 저장한 상품이 없습니다</p>
          <p className="mt-1 text-[12px] text-dim">상품 카드나 상세페이지의 ♥ 를 눌러 담아보세요</p>
          <Link href="/best" className="mt-4 inline-block text-[13px] font-bold text-coral">
            베스트 둘러보기 →
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-4">
          {products.map((p) => (
            <ProductCardDense key={p.slug} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
