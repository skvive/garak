// 읽기 전용: 기존 데이터 무손상 확인 + hq_state 조회
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
config({ quiet: true });
const sql = neon(process.env.DATABASE_URL);
for (const t of ["products", "brands", "users", "orders", "site_settings", "hq_state"]) {
  const r = await sql.query(`SELECT count(*)::int AS n FROM ${t}`);
  console.log(t, "=", r[0].n);
}
const mode = await sql`SELECT value FROM site_settings WHERE key='data_mode'`;
console.log("data_mode:", JSON.stringify(mode[0]?.value ?? null));
