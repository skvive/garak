import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type AppDb = NodePgDatabase<typeof schema>;

function isLocalPostgres(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "postgres";
  } catch {
    return false;
  }
}

/**
 * 개발 환경(NODE_ENV=development)에서 시스템 env 등이 DATABASE_URL을 오염시켜
 * Neon에 실수로 쓰는 것을 방지.
 * - 로컬 PostgreSQL(localhost/127.0.0.1)는 이 PC 팀 DB 서버이므로 dev에서도 항상 허용.
 * - 원격(Neon 등)은 LEXI_DEV_NEON=1 로 명시하지 않으면 dev에선 차단 (로컬 JSON 모드).
 * - sync/seed 스크립트(NODE_ENV undefined/production)와 프로덕션 배포는 이 방어가 적용되지 않는다.
 */
export const hasDb = () => {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return false;
  if (process.env.NODE_ENV === "development" && process.env.LEXI_DEV_NEON !== "1") {
    if (isLocalPostgres(url)) return true; // 이 PC 팀 DB 서버 (로컬 PG)
    return false; // 원격(Neon) 차단 → 로컬 JSON
  }
  return true;
};

const g = globalThis as unknown as { __lexiPgPool?: Pool };

function getPool(url: string): Pool {
  if (!g.__lexiPgPool) {
    g.__lexiPgPool = new Pool({ connectionString: url });
  }
  return g.__lexiPgPool;
}

/** Drizzle DB — 로컬은 pg, Neon은 HTTP. 반환 타입은 공통 인터페이스로 통일. */
export function db(): AppDb {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  if (isLocalPostgres(url)) {
    return drizzlePg(getPool(url), { schema }) as AppDb;
  }

  // neon-http 는 시그니처가 달라 TS union 깨짐 → 런타임 OK, 타입은 AppDb로 캐스팅
  return drizzleNeon(neon(url), { schema }) as unknown as AppDb;
}

export function isLocalDb(): boolean {
  const url = process.env.DATABASE_URL;
  return Boolean(url && isLocalPostgres(url));
}

export { schema };
