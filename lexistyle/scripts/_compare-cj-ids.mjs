import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { cjConnector } from "../src/lib/sourcing/connectors/cjdropshipping.ts";
import pg from "pg";

const { items } = await cjConnector.listCatalogPage({ page: 1, pageSize: 5 });
console.log("CJ sample:", items.slice(0, 3).map((p) => ({
  externalId: p.externalId,
  listedNum: p.listedNum,
  title: p.title?.slice(0, 40),
})));

const c = new pg.Client({ connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL });
await c.connect();
const ids = items.map((p) => p.externalId);
const r = await c.query(
  `SELECT external_id, title FROM catalog_index WHERE external_id = ANY($1)`,
  [ids],
);
console.log("matched in catalog:", r.rows.length, r.rows.map((x) => x.external_id));
const sample = await c.query(`SELECT external_id, title FROM catalog_index WHERE supplier_code='cjdropshipping' ORDER BY id DESC LIMIT 5`);
console.log("catalog sample:", sample.rows);
await c.end();
