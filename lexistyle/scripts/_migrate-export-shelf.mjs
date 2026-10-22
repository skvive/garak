import { config } from "dotenv";
config({ path: ".env.local" });
config();
import pg from "pg";

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await c.connect();
  await c.query("ALTER TABLE catalog_index ADD COLUMN IF NOT EXISTS title_ko text");
  await c.query(`
    CREATE TABLE IF NOT EXISTS export_shelf (
      id bigserial PRIMARY KEY,
      document_id bigint NOT NULL,
      catalog_id bigint,
      stage text NOT NULL DEFAULT 'crafted',
      title text,
      title_ko text,
      thumb_url text,
      sell_price_usd numeric(12, 2),
      stock_default integer NOT NULL DEFAULT 10,
      options jsonb,
      channels_desired text[],
      meta jsonb,
      updated_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  console.log("OK migrated");
} catch (e) {
  console.error("FAIL", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await c.end().catch(() => {});
}
