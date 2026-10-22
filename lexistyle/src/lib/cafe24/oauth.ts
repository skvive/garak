/**
 * Cafe24 OAuth 2.0 (Admin API) — 원클릭 연결 + 토큰 자동갱신.
 * access_token은 2시간, refresh_token은 2주 만료. 만료 임박 시 자동 refresh.
 * 토큰은 기존 hq_state 테이블(key='cafe24_oauth')에 저장 — 별도 스키마 변경 없음.
 */
import { hasDb } from "@/db";
import { rawSql } from "@/db/sql";
import {
  cafe24MallId,
  cafe24ClientSecret,
  cafe24Scopes,
} from "./config";

const CLIENT_ID = () => process.env.CAFE24_FRONT_CLIENT_ID!.trim();
const STORE_KEY = "cafe24_oauth";

export type Cafe24Token = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // ms epoch
  refreshExpiresAt: number; // ms epoch
  mallId: string;
  scopes: string[];
  updatedAt: number;
};

/* ---------- 저장소 (hq_state 재사용) ---------- */
async function saveToken(t: Cafe24Token): Promise<void> {
  if (!hasDb()) return;
  await rawSql`
    INSERT INTO hq_state (key, value, updated_at)
    VALUES (${STORE_KEY}, ${JSON.stringify(t)}::jsonb, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
}

export async function loadToken(): Promise<Cafe24Token | null> {
  if (!hasDb()) return null;
  try {
    const rows = await rawSql<{ value: Cafe24Token }>`SELECT value FROM hq_state WHERE key = ${STORE_KEY}`;
    return rows[0]?.value ?? null;
  } catch {
    return null;
  }
}

export async function clearToken(): Promise<void> {
  if (!hasDb()) return;
  await rawSql`DELETE FROM hq_state WHERE key = ${STORE_KEY}`;
}

/* ---------- OAuth 엔드포인트 ---------- */
function basicAuth(): string {
  return Buffer.from(`${CLIENT_ID()}:${cafe24ClientSecret()}`).toString("base64");
}

/** Cafe24 인가 URL — 콘솔 [카페24 연결] → 여기로 리다이렉트 */
export function authorizeUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID(),
    state,
    redirect_uri: redirectUri,
    scope: cafe24Scopes().join(","),
  });
  return `https://${cafe24MallId()}.cafe24api.com/api/v2/oauth/authorize?${params}`;
}

function toMs(v: unknown): number {
  if (typeof v === "number") return v;
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : Date.now() + 2 * 60 * 60 * 1000;
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: string | number;
  refresh_token_expires_at: string | number;
  mall_id?: string;
  scopes?: string[];
};

async function tokenRequest(body: Record<string, string>): Promise<Cafe24Token> {
  const res = await fetch(`https://${cafe24MallId()}.cafe24api.com/api/v2/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Cafe24 token ${res.status}: ${text.slice(0, 200)}`);
  const j = JSON.parse(text) as TokenResponse;
  const t: Cafe24Token = {
    accessToken: j.access_token,
    refreshToken: j.refresh_token,
    expiresAt: toMs(j.expires_at),
    refreshExpiresAt: toMs(j.refresh_token_expires_at),
    mallId: j.mall_id ?? cafe24MallId(),
    scopes: j.scopes ?? cafe24Scopes(),
    updatedAt: Date.now(),
  };
  await saveToken(t);
  return t;
}

/** 콜백: authorization code → 토큰 교환·저장 */
export async function exchangeCode(code: string, redirectUri: string): Promise<Cafe24Token> {
  return tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
}

/** refresh_token으로 access_token 갱신 */
export async function refresh(refreshToken: string): Promise<Cafe24Token> {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}

/**
 * 유효한 access_token 반환 — 만료 60초 전이면 자동 refresh.
 * 저장된 토큰 없거나 refresh 만료면 null (재연결 필요).
 */
export async function getValidAccessToken(): Promise<string | null> {
  const t = await loadToken();
  if (!t) return null;
  if (Date.now() < t.expiresAt - 60_000) return t.accessToken;
  if (Date.now() >= t.refreshExpiresAt) return null; // refresh도 만료 → 재연결
  try {
    const nt = await refresh(t.refreshToken);
    return nt.accessToken;
  } catch {
    return null;
  }
}

export async function cafe24Connected(): Promise<boolean> {
  const t = await loadToken();
  return !!t && Date.now() < t.refreshExpiresAt;
}
