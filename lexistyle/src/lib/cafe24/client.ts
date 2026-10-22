// filepath: src/lib/cafe24/client.ts
import {
  cafe24ApiVersion,
  cafe24BaseUrl,
  cafe24Configured,
  cafe24ShopNo,
} from "./config";
import { getValidAccessToken } from "./oauth";

export class Cafe24ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "Cafe24ApiError";
    this.status = status;
    this.body = body;
  }
}

type RequestOpts = {
  method?: string;
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  scope?: "front" | "admin";
};

/**
 * 인증 헤더 해석 — 우선순위:
 *  1) OAuth 저장 토큰(자동 refresh) — 원클릭 연결 방식(권장)
 *  2) CAFE24_ACCESS_TOKEN (정적 env 토큰)
 *  3) CAFE24_FRONT_API_KEY (Basic) — front 스코프 한정 레거시
 */
async function resolveAuthHeaders(scope: "front" | "admin"): Promise<Record<string, string>> {
  const clientId = process.env.CAFE24_FRONT_CLIENT_ID?.trim();
  const oauthToken = await getValidAccessToken();
  if (oauthToken) {
    return {
      Authorization: `Bearer ${oauthToken}`,
      ...(clientId ? { "X-Cafe24-Client-Id": clientId } : {}),
    };
  }
  const envToken = process.env.CAFE24_ACCESS_TOKEN?.trim();
  if (envToken) {
    return {
      Authorization: `Bearer ${envToken}`,
      ...(clientId ? { "X-Cafe24-Client-Id": clientId } : {}),
    };
  }
  if (scope === "front") {
    const apiKey = process.env.CAFE24_FRONT_API_KEY?.trim();
    if (apiKey && clientId) {
      const basic = Buffer.from(`${clientId}:${apiKey}`).toString("base64");
      return { Authorization: `Basic ${basic}`, "X-Cafe24-Client-Id": clientId };
    }
  }
  throw new Error("Cafe24 미연결 — 콘솔에서 [카페24 연결]로 인증하세요");
}

export async function cafe24Fetch<T>(opts: RequestOpts): Promise<T> {
  if (!cafe24Configured() && opts.scope !== "admin") {
    throw new Error("Cafe24 not configured");
  }

  const scope = opts.scope ?? "front";
  const prefix = scope === "admin" ? "/admin" : "";
  const url = new URL(`${cafe24BaseUrl()}${prefix}${opts.path}`);
  url.searchParams.set("shop_no", String(cafe24ShopNo()));
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  const auth = await resolveAuthHeaders(scope);
  const res = await fetch(url.toString(), {
    method: opts.method ?? "GET",
    headers: {
      ...auth,
      "Content-Type": "application/json",
      "X-Cafe24-Api-Version": cafe24ApiVersion(),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    next: { revalidate: scope === "front" && (opts.method ?? "GET") === "GET" ? 60 : 0 },
  });

  const text = await res.text();
  let json: unknown = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg =
      typeof json === "object" && json && "error" in json
        ? JSON.stringify((json as { error: unknown }).error)
        : `Cafe24 ${res.status}`;
    throw new Cafe24ApiError(msg, res.status, json);
  }

  return json as T;
}
