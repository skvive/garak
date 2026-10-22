import Image from "next/image";
import Link from "next/link";
import { and, eq, isNull } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { categories, productImages, products } from "@/db/schema";
import { categoryChips as fallbackChips } from "@/lib/dummy-data";

type Chip = { label: string; href: string; image: string };

async function chipsFromDb(): Promise<Chip[] | null> {
  if (!hasDb()) return null;
  try {
    const rows = await db()
      .select({
        slug: categories.slug,
        name: categories.name,
        image: productImages.url,
      })
      .from(categories)
      .innerJoin(products, eq(products.categoryId, categories.id))
      .leftJoin(
        productImages,
        and(eq(productImages.productId, products.id), eq(productImages.sort, 0)),
      )
      .where(and(isNull(products.deletedAt), eq(products.isDummy, false)));

    const bySlug = new Map<string, Chip>();
    for (const r of rows) {
      if (!r.image || bySlug.has(r.slug)) continue;
      const fallback = fallbackChips.find((c) => c.href === `/category/${r.slug}`);
      bySlug.set(r.slug, {
        label: fallback?.label ?? r.name,
        href: `/category/${r.slug}`,
        image: r.image,
      });
    }
    // keep dummy chip order when possible
    const ordered = fallbackChips
      .map((c) => bySlug.get(c.href.replace("/category/", "")) ?? null)
      .filter((c): c is Chip => Boolean(c));
    return ordered.length >= 6 ? ordered : null;
  } catch {
    return null;
  }
}

/** 원형 실사 썸네일 칩 — Picture Superiority Effect. spec §3.4 #3 */
export async function CategoryChips() {
  const chips = (await chipsFromDb()) ?? fallbackChips;
  return (
    <section aria-label="카테고리 바로가기" className="mx-auto max-w-6xl px-4 py-7">
      <div className="no-scrollbar flex gap-5 overflow-x-auto md:justify-center">
        {chips.map((c) => (
          <Link key={c.label} href={c.href} className="group flex w-16 shrink-0 flex-col items-center gap-2">
            <span className="relative block size-16 overflow-hidden rounded-full ring-1 ring-line transition-shadow group-hover:ring-2 group-hover:ring-ink">
              <Image src={c.image} alt="" fill sizes="64px" className="object-cover" unoptimized={c.image.startsWith("http")} />
            </span>
            <span className="text-[12px] font-medium text-ink">{c.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
