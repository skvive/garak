/** 소싱 플랫폼(마켓플레이스) vs 그 아래 실제 셀러 프로바이더 */

export const SOURCING_PLATFORMS = [
  {
    code: "cjdropshipping",
    label: "CJ 드랍쉬핑",
    connected: true,
    homepage: "https://cjdropshipping.com",
    phone: null as string | null,
    email: "support@cjdropshipping.com",
    note: "공식 Open API. 상품은 CJ가 중개하는 공장·셀러가 공급한다.",
  },
  {
    code: "superbuy",
    label: "슈퍼바이",
    connected: false,
    homepage: "https://www.superbuy.com",
    phone: null as string | null,
    email: null as string | null,
    note: "1688/타오바오 대리구매 게이트웨이. API 키·카탈로그 연동 전.",
  },
] as const;

export type SourcingPlatformCode = (typeof SOURCING_PLATFORMS)[number]["code"];

export function getSourcingPlatform(code: string) {
  return SOURCING_PLATFORMS.find((p) => p.code === code) ?? SOURCING_PLATFORMS[0];
}
