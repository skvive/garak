// 읽기 전용 검증: 테이블 목록 조회만 수행
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
config({ path: "/workspace/lexistyle/.env", quiet: true });
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1`;
console.log("tables:", rows.length);
console.log(rows.map((x) => x.table_name).join(", "));
