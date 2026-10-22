import fs from "node:fs";
import pg from "pg";

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

loadEnv(".env.local");
const useLocal = process.argv.includes("--local");
const connectionString = useLocal ? process.env.DATABASE_URL : process.env.NEON_DATABASE_URL;
if (!connectionString) throw new Error(`${useLocal ? "DATABASE_URL" : "NEON_DATABASE_URL"} is not configured`);

const client = new pg.Client({ connectionString, ssl: useLocal ? false : { rejectUnauthorized: false } });
await client.connect();
try {
  const { rows } = await client.query(`
    SELECT table_schema, table_name,
           json_agg(column_name ORDER BY ordinal_position) AS columns
    FROM information_schema.columns
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    GROUP BY table_schema, table_name
    HAVING lower(table_name) SIMILAR TO '%(amba|model|cast|profile)%'
       OR bool_or(lower(column_name) SIMILAR TO '%(nationality|nation|country|amba|model|cast|profile)%')
    ORDER BY table_schema, table_name
  `);
  console.log(JSON.stringify({ target: useLocal ? "local" : "neon", connected: true, matchingTables: rows }, null, 2));
} finally {
  await client.end();
}
