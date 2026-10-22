/**
 * 상품 URL → ShortProduct. 공개 메타(OG / JSON-LD Product)만 읽는다.
 * 로그인·봇 차단을 우회하지 않는다 — 실패하면 호출자가 수동 입력으로 넘긴다.
 */
import type { ShortProduct } from "./script";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 CommerceShortsBot/1.0";
const MAX_HTML = 3_000_000;
const MAX_IMAGES = 8;

export class ExtractError extends Error {}

/** 서버 측 fetch 대상 제한 (SSRF) */
export function assertPublicUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new ExtractError("올바른 상품 URL을 입력해 주세요.");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new ExtractError("http(s) 주소만 지원합니다.");
  const h = u.hostname.toLowerCase();
  const privateHost =
    h === "localhost" ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    /^\[?(::1|fc|fd|fe80)/.test(h) ||
    /^(0|10|127)\./.test(h) ||
    /^169\.254\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h);
  if (privateHost) throw new ExtractError("공개된 상품 페이지 주소만 지원합니다.");
  return u;
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();

function meta(html: string, key: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name|itemprop)=["']${key.replace(/[.:]/g, "\\$&")}["'][^>]*>`,
    "i",
  );
  const tag = html.match(re)?.[0];
  const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return content ? decode(content) : null;
}

function metaAll(html: string, key: string): string[] {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key.replace(/[.:]/g, "\\$&")}["'][^>]*>`, "gi");
  return [...html.matchAll(re)]
    .map((m) => m[0].match(/content=["']([^"']*)["']/i)?.[1])
    .filter((x): x is string => Boolean(x))
    .map(decode);
}

type Json = Record<string, unknown>;

function findProductLd(html: string): Json | null {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(b[1].trim());
    } catch {
      continue;
    }
    const stack: unknown[] = [data];
    while (stack.length) {
      const cur = stack.pop();
      if (Array.isArray(cur)) stack.push(...cur);
      else if (cur && typeof cur === "object") {
        const o = cur as Json;
        const type = o["@type"];
        if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) return o;
        if (o["@graph"]) stack.push(o["@graph"]);
      }
    }
  }
  return null;
}

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

function absolutize(src: string, base: URL): string | null {
  try {
    const u = new URL(src.startsWith("//") ? `https:${src}` : src, base);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    u.protocol = "https:";
    return u.toString();
  } catch {
    return null;
  }
}

function asList(v: unknown): unknown[] {
  return Array.isArray(v) ? v : v == null ? [] : [v];
}

function ldImages(ld: Json | null): string[] {
  return asList(ld?.image)
    .map((x) => (typeof x === "string" ? x : (x as Json)?.url))
    .filter((x): x is string => typeof x === "string");
}

function ldReviews(ld: Json | null): string[] {
  return asList(ld?.review)
    .map((r) => (r as Json)?.reviewBody ?? (r as Json)?.description)
    .filter((x): x is string => typeof x === "string")
    .map((x) => decode(x).replace(/\s+/g, " "))
    .filter((x) => x.length >= 4)
    .slice(0, 5);
}

/** 설명문 → 특징 문장 최대 5개 */
export function splitFeatures(text: string): string[] {
  return text
    .split(/[\n\r•·|\/]|[.!?。](?=\s|$)/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 4 && s.length <= 60)
    .filter((s, i, a) => a.indexOf(s) === i)
    .slice(0, 5);
}

export function parseProductHtml(html: string, pageUrl: string): ShortProduct {
  const base = new URL(pageUrl);
  const ld = findProductLd(html);
  const offers = asList(ld?.offers)[0] as Json | undefined;

  const title =
    (typeof ld?.name === "string" && decode(ld.name)) ||
    meta(html, "og:title") ||
    meta(html, "twitter:title") ||
    decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "");

  const brandRaw = ld?.brand;
  const brand =
    typeof brandRaw === "string" ? brandRaw : typeof (brandRaw as Json)?.name === "string" ? String((brandRaw as Json).name) : null;

  const priceAmount =
    num(offers?.price) ??
    num(offers?.lowPrice) ??
    num(meta(html, "product:price:amount")) ??
    num(meta(html, "og:price:amount"));
  const originalPrice = num(meta(html, "product:original_price:amount")) ?? num(offers?.highPrice);
  const currency = String(
    offers?.priceCurrency ?? meta(html, "product:price:currency") ?? meta(html, "og:price:currency") ?? (base.hostname.endsWith(".kr") || /naver|coupang|cafe24/.test(base.hostname) ? "KRW" : "USD"),
  ).toUpperCase().slice(0, 3);

  const images = [...ldImages(ld), ...metaAll(html, "og:image"), ...metaAll(html, "og:image:secure_url"), meta(html, "twitter:image") ?? ""]
    .map((s) => absolutize(s, base))
    .filter((s): s is string => Boolean(s))
    .map((s) => s.replace(/\?(?:type|w|h|width|height)=[^#]*$/, ""))
    .filter((s, i, a) => a.indexOf(s) === i)
    .slice(0, MAX_IMAGES);

  const desc =
    (typeof ld?.description === "string" && ld.description) || meta(html, "og:description") || meta(html, "description") || "";

  return {
    sourceUrl: base.toString(),
    title: title.replace(/\s*[|:\-–]\s*(네이버|쿠팡|NAVER|Coupang).*$/i, "").slice(0, 200),
    brand: brand ? decode(brand).slice(0, 60) : null,
    priceAmount,
    originalPrice: originalPrice && priceAmount && originalPrice > priceAmount ? originalPrice : null,
    currency: /^[A-Z]{3}$/.test(currency) ? currency : "KRW",
    imageUrls: images,
    features: splitFeatures(decode(desc)),
    reviews: ldReviews(ld),
  };
}

export async function extractProduct(rawUrl: string): Promise<ShortProduct> {
  const url = assertPublicUrl(rawUrl);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8" },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new ExtractError("상품 페이지에 연결하지 못했습니다. 직접 입력으로 진행해 주세요.");
  }
  assertPublicUrl(res.url || url.toString());
  if (!res.ok) throw new ExtractError(`상품 페이지가 응답하지 않습니다(${res.status}). 직접 입력으로 진행해 주세요.`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("html")) throw new ExtractError("상품 페이지(HTML)가 아닙니다.");
  const html = (await res.text()).slice(0, MAX_HTML);
  const p = parseProductHtml(html, res.url || url.toString());
  if (!p.title || p.imageUrls.length === 0) {
    throw new ExtractError("상품 정보를 읽지 못했습니다. 상품명과 이미지를 직접 입력해 주세요.");
  }
  return p;
}

/** 클라이언트가 보낸 상품(수동 입력 포함)을 정리 */
export function sanitizeProduct(input: Partial<ShortProduct>): ShortProduct {
  const images = (Array.isArray(input.imageUrls) ? input.imageUrls : [])
    .map((s) => String(s).trim())
    .filter((s) => /^https:\/\/[^\s]+$/i.test(s))
    .slice(0, MAX_IMAGES);
  const strList = (v: unknown, max: number) =>
    (Array.isArray(v) ? v : [])
      .map((s) => String(s).replace(/\s+/g, " ").trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, max);
  const title = String(input.title ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  if (!title) throw new ExtractError("상품명을 입력해 주세요.");
  if (images.length === 0) throw new ExtractError("https 상품 이미지를 1장 이상 넣어 주세요.");
  const n = (v: unknown) => (v == null || v === "" ? null : num(v));
  const currency = String(input.currency ?? "KRW").toUpperCase();
  return {
    sourceUrl: String(input.sourceUrl ?? "").slice(0, 2000),
    title,
    brand: input.brand ? String(input.brand).slice(0, 60) : null,
    priceAmount: n(input.priceAmount),
    originalPrice: n(input.originalPrice),
    currency: /^[A-Z]{3}$/.test(currency) ? currency : "KRW",
    imageUrls: images,
    features: strList(input.features, 5),
    reviews: strList(input.reviews, 5),
  };
}
