import { config } from "dotenv";
config({ path: ".env.local" });
config();
import pg from "pg";
const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const c = new pg.Client({ connectionString: url });
await c.connect();
const r = await c.query(`
  UPDATE export_jobs
  SET status = 'failed', last_error = COALESCE(last_error,'cancelled-bulk')
  WHERE status IN ('queued','retry')
    AND channel_code = 'lexi'
  RETURNING id
`);
console.log("cancelled", r.rowCount);
await c.end();
