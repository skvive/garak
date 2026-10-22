/**
 * [Dummy/Real] 전환 파이프라인 — docs/lexi-master-spec.md §4.3
 * DATABASE_URL이 없으면(로컬 미리보기) 프로세스 메모리 상태로 동작한다.
 * 로컬 Docker / Neon 모두 rawSql·rawQuery 사용.
 */
import { hasDb, isLocalDb } from "@/db";
import { rawQuery, rawSql } from "@/db/sql";
import { neon } from "@neondatabase/serverless";

export type DataMode = { mode: "dummy" | "real"; initialized: boolean };
export type Strategy = "soft" | "hard";

/** is_dummy 정리 대상 테이블 — FK 역순 */
const PURGE_ORDER = [
  "settlements",
  "sourcing_orders",
  "purchase_requests",
  "channel_listings",
  "listings",
  "listing_drafts",
  "supplier_products",
  "suppliers",
  "channels",
  "order_items",
  "orders",
  "reviews",
  "ugc_posts",
  "product_images",
  "banners",
  "products",
  "brands",
  "users",
] as const;

let memoryMode: DataMode = { mode: "dummy", initialized: false };

export async function getDataMode(): Promise<DataMode> {
  if (!hasDb()) return memoryMode;
  try {
    const rows = await rawSql<{ value: DataMode }>`SELECT value FROM site_settings WHERE key = 'data_mode'`;
    return rows[0]?.value ?? { mode: "dummy", initialized: false };
  } catch {
    return { mode: "dummy", initialized: false };
  }
}

export async function switchDataMode(
  target: DataMode["mode"],
  strategy: Strategy,
  actor: string,
): Promise<{ mode: DataMode; affected: Record<string, number> }> {
  if (!hasDb()) {
    memoryMode = { mode: target, initialized: target === "real" };
    return { mode: memoryMode, affected: { "(memory)": 0 } };
  }

  const affected: Record<string, number> = {};

  // Neon HTTP는 transaction 헬퍼 사용, 로컬 pg는 순차 실행
  if (!isLocalDb()) {
    const sql = neon(process.env.DATABASE_URL!);
    const queries = [];
    queries.push(sql`SELECT value FROM site_settings WHERE key = 'data_mode' FOR UPDATE`);
    if (target === "real") {
      for (const table of PURGE_ORDER) {
        queries.push(
          strategy === "hard"
            ? sql.query(`DELETE FROM ${table} WHERE is_dummy`)
            : sql.query(
                `UPDATE ${table} SET deleted_at = now() WHERE is_dummy AND deleted_at IS NULL`,
              ),
        );
      }
    }
    queries.push(
      sql.query(
        `UPDATE site_settings SET value = $1, updated_at = now(), updated_by = $2 WHERE key = 'data_mode'`,
        [JSON.stringify({ mode: target, initialized: target === "real" }), actor],
      ),
    );
    queries.push(
      sql.query(
        `INSERT INTO data_mode_audit (from_mode, to_mode, strategy, affected, actor)
         SELECT value->>'mode', $1, $2, $3::jsonb, $4 FROM site_settings WHERE key = 'data_mode'`,
        [target, strategy, JSON.stringify(affected), actor],
      ),
    );
    await sql.transaction(queries as never);
  } else {
    if (target === "real") {
      for (const table of PURGE_ORDER) {
        try {
          await rawQuery(
            strategy === "hard"
              ? `DELETE FROM ${table} WHERE is_dummy`
              : `UPDATE ${table} SET deleted_at = now() WHERE is_dummy AND deleted_at IS NULL`,
          );
        } catch {
          /* 테이블 미존재 시 스킵 */
        }
      }
    }
    try {
      await rawQuery(
        `UPDATE site_settings SET value = $1, updated_at = now(), updated_by = $2 WHERE key = 'data_mode'`,
        [JSON.stringify({ mode: target, initialized: target === "real" }), actor],
      );
    } catch {
      /* site_settings 미생성 시 무시 */
    }
  }

  return { mode: { mode: target, initialized: target === "real" }, affected };
}
