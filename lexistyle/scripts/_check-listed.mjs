import { config } from "dotenv";
config({ path: ".env.local" });
config();
import pg from "pg";

const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const c = new pg.Client({ connectionString: url });
await c.connect();
const s = await c.query(`
  SELECT count(*)::int AS n,
    count(*) FILTER (WHERE COALESCE(NULLIF(raw_meta->>'listedNum',''),'0')::numeric > 0)::int AS with_listed,
    max(COALESCE(NULLIF(raw_meta->>'listedNum',''),'0')::numeric) AS max_listed
  FROM catalog_index
  WHERE supplier_code = 'cjdropshipping' AND source_status <> 'gone'
`);
console.log(s.rows[0]);
const sample = await c.query(`
  SELECT id, title, category_path,
    COALESCE(NULLIF(raw_meta->>'listedNum',''),'0')::numeric AS listed
  FROM catalog_index
  WHERE supplier_code = 'cjdropshipping' AND source_status <> 'gone'
    AND primary_thumb_url IS NOT NULL
  ORDER BY COALESCE(NULLIF(raw_meta->>'listedNum',''),'0')::numeric DESC NULLS LAST
  LIMIT 5
`);
console.log(sample.rows);
await c.end();
