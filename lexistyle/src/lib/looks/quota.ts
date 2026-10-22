import { createHmac } from "node:crypto";
import { rawQuery } from "@/db/sql";
import { wanApiKey } from "@/lib/wan/config";

/** Atomic, persistent counters; raw IP and portraits are never stored. Fail closed if unavailable. */
export async function reserveGeneration(req: Request) {
  const day = new Date().toISOString().slice(0, 10);
  const ip = process.env.VERCEL ? req.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() : "local-development";
  if (!ip) throw new Error("접속 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  const key = "looks-quota:" + createHmac("sha256", wanApiKey()!).update(ip).digest("hex").slice(0, 32);
  const rows = await rawQuery(`INSERT INTO site_settings (key,value) VALUES ($1,jsonb_build_object('day',$2::text,'count',1))
    ON CONFLICT (key) DO UPDATE SET value = jsonb_build_object('day',$2::text,'count',
      CASE WHEN site_settings.value->>'day'=$2 THEN (site_settings.value->>'count')::int+1 ELSE 1 END), updated_at=now()
    WHERE site_settings.value->>'day' IS DISTINCT FROM $2 OR (site_settings.value->>'count')::int < 3
    RETURNING key`, [key, day]);
  if (!rows.length) throw new Error("오늘의 생성 요청 3회를 모두 사용했습니다. 내일 다시 이용해 주세요.");
}
