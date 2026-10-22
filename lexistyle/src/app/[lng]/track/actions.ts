"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getState } from "@/lib/hq/store";
import { allowLookupAttempt, findTrackMatches } from "@/lib/hq/track-lookup";
import { publicTrackPath } from "@/lib/hq/track-public";

export type LookupState = { error?: string; matches?: { title: string; href: string }[] } | null;

export async function lookupTrackAction(_prev: LookupState, formData: FormData): Promise<LookupState> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  if (!allowLookupAttempt(ip)) return { error: "조회 시도가 많습니다. 잠시 후 다시 시도해 주세요." };
  const matches = findTrackMatches(await getState(), String(formData.get("orderNo") ?? ""), String(formData.get("name") ?? ""));
  if (matches.length === 0) {
    return { error: "일치하는 주문을 찾을 수 없습니다. 주문번호와 받는 분 성함을 확인해 주세요. 출고 전이라 운송장이 없으면 조회되지 않을 수 있습니다." };
  }
  if (matches.length === 1) redirect(publicTrackPath(matches[0]!.token));
  return { matches: matches.map((m) => ({ title: m.title, href: publicTrackPath(m.token) })) };
}
