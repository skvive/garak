// filepath: src/app/robots.ts
import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

/**
 * /robots.txt — 공개 상점 경로는 허용, 운영/개인화 경로는 크롤 차단.
 * 루트 라우트여야 `/robots.txt` 가 [lng] 동적 라우트에 가려지지 않는다.
 * 언어 접두어(/ko/…)가 붙은 경로도 같이 막는다.
 */
const PRIVATE = ["admin", "hq", "studio", "seller-studio", "account", "auth", "cart", "checkout"];

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  const langs = ["ko", "en", "ja", "zh", "ms", "th", "vi"];
  const disallow = [
    "/api/",
    ...PRIVATE.map((p) => `/${p}`),
    ...langs.flatMap((l) => [...PRIVATE.map((p) => `/${l}/${p}`), `/${l}/api/`, `/${l}/search?`, `/${l}/search`]),
    "/search?",
  ];
  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
