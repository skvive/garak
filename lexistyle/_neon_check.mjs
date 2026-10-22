import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { neon } from "@neondatabase/serverless";

const url = process.env.NEON_DATABASE_URL?.trim();
if (!url) { console.log("NO_NEON_URL"); process.exit(1); }

const sql = neon(url);
const [r] = await sql`SELECT count(*) as total FROM catalog_index WHERE source_status != 'gone'`;
console.log("Neon catalog total:", r.total);

const cats = await sql`
  SELECT category_path[1] as leaf, count(*) as cnt
  FROM catalog_index WHERE source_status != 'gone'
  GROUP BY category_path[1] ORDER BY cnt DESC LIMIT 20
`;
console.log("\nNeon top CJ categories:");
for (const c of cats) console.log(`  ${c.leaf}: ${c.cnt}`);