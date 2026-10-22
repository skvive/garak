/**
 * 더미 시더 — docs/lexi-master-spec.md §3.6
 * 멱등: slug/email 충돌 시 skip. Real 모드(initialized:true)에서는 실행을 거부한다.
 * 실행: DATABASE_URL=... npm run seed:dummy
 */
import { neon } from "@neondatabase/serverless";
import { products as demoProducts, ugcPosts as demoUgc } from "../src/lib/dummy-data";

const COUNTRIES = ["US", "US", "US", "JP", "JP", "SG", "GB", "AU", "CA", "DE", "FR", "TW"];
const ORDER_STATUSES = ["paid", "preparing", "shipped", "customs", "delivered", "cancelled"];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const sql = neon(url);

  // Real 모드 가드 (spec §4.3)
  const mode = await sql`SELECT value FROM site_settings WHERE key = 'data_mode'`;
  if (mode[0]?.value?.initialized) {
    throw new Error("site is initialized (real mode) — reseeding is blocked by guard");
  }

  await sql`
    INSERT INTO site_settings (key, value)
    VALUES ('data_mode', '{"mode":"dummy","initialized":false}')
    ON CONFLICT (key) DO NOTHING`;

  // brands
  const brandNames = [...new Set(demoProducts.map((p) => p.brand))];
  for (const name of brandNames) {
    await sql`
      INSERT INTO brands (slug, name, story, is_dummy)
      VALUES (${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}, ${name},
              ${name + " — 서울에서 온 K-스타일 브랜드"}, TRUE)
      ON CONFLICT (slug) DO NOTHING`;
  }

  // categories
  for (const [i, c] of ["beauty", "fashion", "life", "kids"].entries()) {
    await sql`
      INSERT INTO categories (slug, name, sort) VALUES (${c}, ${c}, ${i})
      ON CONFLICT (slug) DO NOTHING`;
  }

  // products + images
  for (const p of demoProducts) {
    const rows = await sql`
      INSERT INTO products (slug, brand_id, category_id, name, price_usd, discount_rate,
                            stock, rating_avg, review_count, is_dummy)
      SELECT ${p.slug}, b.id, c.id, ${p.name}, ${p.price}, ${p.discountRate},
             ${50 + Math.floor(Math.random() * 200)}, ${p.rating}, ${p.reviewCount}, TRUE
      FROM brands b, categories c
      WHERE b.name = ${p.brand} AND c.slug = ${p.category}
      ON CONFLICT (slug) DO NOTHING
      RETURNING id`;
    const pid = rows[0]?.id;
    if (pid) {
      await sql`INSERT INTO product_images (product_id, url, sort, is_dummy)
                VALUES (${pid}, ${p.image}, 0, TRUE)`;
    }
  }

  // users
  for (let i = 0; i < 120; i++) {
    await sql`
      INSERT INTO users (email, country, tier, is_dummy)
      VALUES (${`dummy${i}@lexi.demo`}, ${COUNTRIES[i % COUNTRIES.length]},
              ${i % 10 === 0 ? "gold" : "bronze"}, TRUE)
      ON CONFLICT (email) DO NOTHING`;
  }

  // reviews (상품당 평균 7.5개, β분포 근사)
  await sql`
    INSERT INTO reviews (product_id, user_id, rating, body, is_dummy)
    SELECT p.id, u.id,
           LEAST(5, GREATEST(1, 4 + (random() * 2 - 0.6)::int)),
           'Dummy review — great quality, fast customs clearance.', TRUE
    FROM products p
    CROSS JOIN LATERAL (SELECT id FROM users WHERE is_dummy ORDER BY random() LIMIT 7) u
    WHERE p.is_dummy`;

  // orders + items (최근 90일 분포)
  for (let i = 0; i < 380; i++) {
    await sql`
      WITH u AS (SELECT id FROM users WHERE is_dummy ORDER BY random() LIMIT 1),
           p AS (SELECT id, price_usd FROM products WHERE is_dummy ORDER BY random() LIMIT 1),
           o AS (
             INSERT INTO orders (user_id, status, total_usd, duty_usd, shipping_usd, is_dummy, created_at)
             SELECT u.id, ${ORDER_STATUSES[i % ORDER_STATUSES.length === 5 && i % 20 !== 0 ? 4 : i % ORDER_STATUSES.length]},
                    p.price_usd + 7.9, 0, 7.9, TRUE,
                    now() - (random() * interval '90 days')
             FROM u, p RETURNING id
           )
      INSERT INTO order_items (order_id, product_id, qty, unit_price_usd, is_dummy)
      SELECT o.id, p.id, 1, p.price_usd, TRUE FROM o, p`;
  }

  // ugc
  for (const post of demoUgc) {
    await sql`
      INSERT INTO ugc_posts (user_id, image_url, caption, is_dummy)
      SELECT id, ${post.image}, ${post.handle + "의 #LEXILOOK"}, TRUE
      FROM users WHERE is_dummy ORDER BY random() LIMIT 1`;
  }

  console.log("✅ dummy seed complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
