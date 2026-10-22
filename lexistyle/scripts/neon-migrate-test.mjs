import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: ".env.migrate.local" });

for (const key of ["OLD_DATABASE_URL", "NEW_DATABASE_URL"]) {
  const url = process.env[key];
  if (!url) {
    console.log(key, "MISSING");
    continue;
  }
  const sql = neon(url);
  try {
    const rows = await sql`SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`;
    let extra = "";
    if (key === "OLD_DATABASE_URL") {
      try {
        const c = await sql`SELECT COUNT(*)::int AS n FROM catalog_index`;
        extra = ` catalog_index=${c[0]?.n}`;
      } catch (e) {
        extra = ` catalog_index=ERR:${e.message?.slice(0, 80)}`;
      }
    }
    console.log(key, "OK tables=", rows[0]?.n, extra);
  } catch (e) {
    console.log(key, "ERR", e.message?.slice(0, 200));
  }
}
