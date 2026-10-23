// Neon DB 스키마 확인 스크립트 (임시)
import { readFileSync } from "node:fs";
import { Client } from "pg";

const envText = readFileSync("e:/currsor_C/lawsign/garak-hansang/lexistyle/.env.local", "utf8");
const dbUrl = envText.match(/DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!dbUrl) throw new Error("DATABASE_URL not found");

const client = new Client({ connectionString: dbUrl });
await client.connect();
const { rows } = await client.query(
  "select count(*) as tables from information_schema.tables where table_schema='public'",
);
console.log("public tables:", rows[0].tables);
const auth = await client.query(
  "select count(*) as n from information_schema.schemata where schema_name='neon_auth'",
);
console.log("neon_auth schema exists:", auth.rows[0].n > 0);
await client.end();
process.exit(0);
