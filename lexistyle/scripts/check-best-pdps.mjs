import { db } from '@/_db';
import { exportShelf, products } from '@/_db/schema';

async function main() {
  const womenPdps = await db
    .select({ id: products.id, slug: products.slug, name: products.name })
    .from(products)
    .innerJoin(exportShelf, eq(products.id, exportShelf.documentId))
    .where(
      and(
        like(products.categoryId, 'women-%'),
        eq(exportShelf.stage, 'shelf'),
        isNull(products.deletedAt),
      ),
    );

  console.log(`✅ PDP 생성된 여성 상품 수: ${womenPdps.length}`);
  console.log('상품 목록:');
  womenPdps.forEach((p) => console.log(`${p.id}: ${p.name}`));
}

main().catch(console.error);