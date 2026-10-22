/** CJ 물류명 → 쿠팡 deliveryCompanyCode. 등록되지 않은 이름은 출고지 코드로 떨어진다. */

const OFFICIAL = new Set([
  "CJGLS",
  "HANJIN",
  "HYUNDAI",
  "KGB",
  "EPOST",
  "KDEXP",
  "DIRECT",
  "ILYANG",
  "CHUNIL",
  "AJOU",
  "CSLOGIS",
  "DAESIN",
  "CVSNET",
  "HDEXP",
  "KUNYOUNG",
  "LOTTE",
  "HONAM",
  "SLX",
  "SEBANG",
  "NHLOGIS",
  "HOMEPICK",
  "DHL",
  "FEDEX",
  "UPS",
  "EMS",
  "TNT",
  "USPS",
]);

const ALIASES: { test: RegExp; code: string }[] = [
  { test: /cjgls|cj\s*대한통운|대한통운/i, code: "CJGLS" },
  { test: /hanjin|한진/i, code: "HANJIN" },
  { test: /lotte|롯데/i, code: "LOTTE" },
  { test: /hyundai|롯데택배|현대택배/i, code: "HYUNDAI" },
  { test: /epost|korea\s*post|우체국|k-?packet/i, code: "EPOST" },
  { test: /^ems$/i, code: "EMS" },
  { test: /\bdhl\b/i, code: "DHL" },
  { test: /fed\s*ex/i, code: "FEDEX" },
  { test: /^ups$/i, code: "UPS" },
  { test: /usps/i, code: "USPS" },
  { test: /^tnt$/i, code: "TNT" },
  { test: /경동/i, code: "KDEXP" },
  // CJPacket은 Wing 목록에 없고 번호 형식(LP/LZ)이 섞여 있어 쿠팡 추적 링크가 보장되지 않는다 → 업체직송, 추적은 HQ 링크로 안내
  { test: /cj\s*packet/i, code: "DIRECT" },
];

export function officialCoupangCarrier(raw?: string): string | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  const compact = text.toUpperCase().replace(/[\s_-]+/g, "");
  if (OFFICIAL.has(compact)) return compact;
  const hit = ALIASES.find((row) => row.test.test(text));
  return hit?.code ?? null;
}

/**
 * 송장 택배사. CJPacket·YunExpress처럼 쿠팡 코드가 아닌 이름은 무시하고
 * 주문서 코드 → 출고지 env 순으로 떨어진다.
 */
export function resolveCoupangDeliveryCode(opts: {
  carrier?: string;
  orderCode?: string;
  fallback?: string;
}): string {
  return (
    officialCoupangCarrier(opts.carrier) ??
    officialCoupangCarrier(opts.orderCode) ??
    (opts.fallback ?? "").trim().toUpperCase()
  );
}
