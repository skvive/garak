/** CJ My CJ 딥링크 — HQ는 세션을 복제하지 않고 새 탭으로 연다. */

export const CJ_INVENTORY_URL = "https://cjdropshipping.com/mine/myInventoryNew/productInventory";
export const CJ_INVENTORY_BUNDLE_URL = "https://cjdropshipping.com/mine/myInventoryNew/productInventory";
export const CJ_SOURCING_LIST_URL = "https://cjdropshipping.com/sourcing";
export const CJ_SOURCING_POST_URL = "https://cjdropshipping.com/mine/sourcing";

export const CJ_SOURCING_PLATFORMS = [
  { id: "cj", label: "By CJ" },
  { id: "1688", label: "By 1688" },
  { id: "taobao", label: "By TaoBao" },
  { id: "aliexpress", label: "By AliExpress" },
  { id: "ebay", label: "By eBay" },
  { id: "qk", label: "By QK source" },
] as const;

export type CjSourcingPlatform = (typeof CJ_SOURCING_PLATFORMS)[number]["id"];
