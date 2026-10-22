/**
 * 원시 SQL 헬퍼 — 로컬 Postgres(pg) / Neon HTTP 공통.
 * drizzle 외 hq_state·oauth·data_mode 등에서 사용.
 */
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import { hasDb, isLocalDb } from "./index";

const g = globalThis as unknown as { __lexiRawPool?: Pool };

function pool(): Pool {
  const url = process.env.DATABASE_URL!;
  if (!g.__lexiRawPool) g.__lexiRawPool = new Pool({ connectionString: url });
  return g.__lexiRawPool;
}

export type SqlRow = Record<string, unknown>;

/** tagged template — neon 호환 스타일 */
export async function rawSql<T extends SqlRow = SqlRow>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  if (!hasDb()) throw new Error("DATABASE_URL is not set");

  if (isLocalDb()) {
    let text = "";
    const params: unknown[] = [];
    strings.forEach((s, i) => {
      text += s;
      if (i < values.length) {
        params.push(values[i]);
        text += `$${params.length}`;
      }
    });
    const res = await pool().query(text, params);
    return res.rows as T[];
  }

  const sql = neon(process.env.DATABASE_URL!);
  return (await sql(strings, ...values)) as T[];
}

/** 파라미터 배열 쿼리 ($1, $2 …) */
export async function rawQuery<T extends SqlRow = SqlRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (!hasDb()) throw new Error("DATABASE_URL is not set");

  if (isLocalDb()) {
    const res = await pool().query(text, params);
    return res.rows as T[];
  }

  const sql = neon(process.env.DATABASE_URL!);
  return (await sql.query(text, params)) as T[];
}
