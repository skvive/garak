// filepath: src/lib/site-url.ts
/**
 * 사이트 공개 기준 URL — sitemap/robots/메타데이터 공용.
 * NEXT_PUBLIC_APP_URL → VERCEL_URL → 배포 기본 도메인 순으로 해석한다.
 */
export function siteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://lexistyle.vercel.app";
}

/** Join site origin with a path (`/foo` or `foo`). */
export function absoluteUrl(path = "/"): string {
  const base = siteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
