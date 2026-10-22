import { readAmazonAuHealthSnapshot } from "@/lib/channels/amazon/health-state";
import { readShopeeHealthSnapshot } from "@/lib/channels/shopee/health-state";
import { shopeeDefaultCategoryId, shopeeDefaultLogisticId } from "@/lib/channels/shopee/constants";
import type { CatalogRow } from "@/lib/catalog/index-store";
import type { PdpStructured } from "@/lib/pdp/ruleset";
import { validatePdp, validatePdpForChannel } from "@/lib/pdp/ruleset";
import { getAmazonAuPage2Content } from "@/lib/export/amazon-au-page2-content";

export type ChannelCheckItem = {
  field: string;
  required: boolean;
  ok: boolean;
  note?: string;
};

export type ChannelExportPreview = {
  channel: string;
  ok: boolean;
  errors: string[];
  checklist: ChannelCheckItem[];
  projected?: Record<string, unknown>;
  mockMode?: boolean;
};

function categoryLeaf(row: CatalogRow | null): string {
  const path = row?.categoryPath;
  if (!path?.length) return "Lifestyle";
  return path[path.length - 1] ?? "Lifestyle";
}

/** Shopify Admin product 필드 투영 */
export function projectForShopify(structured: PdpStructured, catalog: CatalogRow | null) {
  const leaf = categoryLeaf(catalog);
  const tags = [
    "LEXI",
    leaf,
    ...(structured.seoKeywords ?? []).slice(0, 8),
    catalog?.importState === "imported" ? "imported" : "",
  ].filter(Boolean);
  return {
    title: structured.title,
    body_html: structured.descriptionHtml,
    vendor: "LEXI",
    product_type: leaf,
    tags: [...new Set(tags)].slice(0, 20),
    seoKeywords: structured.seoKeywords,
  };
}

/** 쿠팡 고시·카테고리 힌트 (실제 API는 publish 시 predict) */
export function projectForCoupang(structured: PdpStructured, catalog: CatalogRow | null) {
  return {
    sellerProductName: structured.title.slice(0, 100),
    searchTags: (structured.seoKeywords ?? []).slice(0, 10),
    noticeHint: "카테고리 예측 후 필수 고시 자동 채움 (기타 재화 우선)",
    categoryHint: categoryLeaf(catalog),
    overseasPurchased: "OVERSEAS_PURCHASED",
  };
}

/** Amazon AU Listings preview (SigV4 PUT 전 검수용) */
export function projectForAmazonAu(structured: PdpStructured, catalog: CatalogRow | null) {
  const editorial = getAmazonAuPage2Content(catalog?.id);
  const title = editorial?.title ?? structured.title;
  const sourceBullets = editorial?.bullets ?? (structured.usps ?? []).slice(0, 5);
  const description = editorial?.description ?? structured.descriptionHtml?.replace(/<[^>]+>/g, " ");
  const bullets = sourceBullets.map((u) => ({ value: u, language_tag: "en_AU" }));
  return {
    productType: "PRODUCT",
    sku: `LEXI-${catalog?.id ?? "preview"}`,
    attributes: {
      item_name: [{ value: title.slice(0, 200), language_tag: "en_AU" }],
      bullet_point: bullets,
      brand: [{ value: "LEXI", language_tag: "en_AU" }],
      product_description: [{ value: description.slice(0, 2000), language_tag: "en_AU" }],
    },
    validationMode: "VALIDATION_PREVIEW",
  };
}

/** Shopee add_item 필드 힌트 (live는 이미지 업로드 + category/logistic 필수) */
export function projectForShopee(structured: PdpStructured, catalog: CatalogRow | null) {
  return {
    item_name: structured.title.slice(0, 120),
    item_sku: `LEXI-${catalog?.id ?? "preview"}`,
    category_id: shopeeDefaultCategoryId(),
    logistic_id: shopeeDefaultLogisticId(),
    description: (structured.descriptionHtml ?? "").replace(/<[^>]+>/g, " ").slice(0, 3000),
  };
}

function channelConfigured(channel: string): boolean {
  switch (channel) {
    case "shopify":
      return Boolean(
        process.env.SHOPIFY_STORE_DOMAIN &&
          (process.env.SHOPIFY_ACCESS_TOKEN || (process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET)),
      );
    case "coupang":
      return Boolean(process.env.COUPANG_VENDOR_ID && process.env.COUPANG_ACCESS_KEY && process.env.COUPANG_SECRET_KEY);
    case "amazon_au":
      return readAmazonAuHealthSnapshot().health === "live";
    case "shopee":
      return readShopeeHealthSnapshot().health === "live";
    case "cafe24":
      return Boolean(process.env.CAFE24_MALL_ID || process.env.CAFE24_CLIENT_ID);
    case "lexi":
    case "alibaba_package":
      return true;
    default:
      return false;
  }
}

export function buildChannelChecklist(
  channel: string,
  structured: PdpStructured,
  catalog: CatalogRow | null,
  assetCount: number,
): ChannelCheckItem[] {
  const base = validatePdp(structured);
  const channelErrors = validatePdpForChannel(channel, structured);
  const items: ChannelCheckItem[] = [
    { field: "title", required: true, ok: Boolean(structured.title?.trim()) },
    { field: "descriptionHtml", required: true, ok: Boolean(structured.descriptionHtml?.trim()) },
    { field: "usps×3", required: true, ok: (structured.usps?.length ?? 0) >= 3 },
    { field: "faq×2", required: true, ok: (structured.faq?.length ?? 0) >= 2 },
    { field: "ctaLabel", required: true, ok: Boolean(structured.ctaLabel?.trim()) },
    { field: "hero image", required: false, ok: assetCount > 0, note: assetCount === 0 ? "batch mode — template PDP" : undefined },
    { field: "ruleset", required: true, ok: base.length === 0, note: base.join("; ") || undefined },
    { field: "channel gates", required: true, ok: channelErrors.length === 0, note: channelErrors.join("; ") || undefined },
  ];

  if (channel === "shopify") {
    const p = projectForShopify(structured, catalog);
    items.push(
      { field: "product_type", required: true, ok: Boolean(p.product_type) },
      { field: "tags", required: false, ok: p.tags.length > 0 },
    );
  }
  if (channel === "coupang") {
    const p = projectForCoupang(structured, catalog);
    items.push(
      { field: "sellerProductName≤100", required: true, ok: p.sellerProductName.length <= 100 },
      { field: "searchTags", required: false, ok: p.searchTags.length > 0 },
      { field: "notices", required: true, ok: true, note: p.noticeHint },
    );
  }
  if (channel === "shopee") {
    const p = projectForShopee(structured, catalog);
    const h = readShopeeHealthSnapshot();
    items.push(
      { field: "item_name≤120", required: true, ok: p.item_name.length > 0 && p.item_name.length <= 120 },
      { field: "category_id", required: h.listingMode === "live", ok: p.category_id > 0 || h.listingMode !== "live", note: p.category_id ? String(p.category_id) : "SHOPEE_CATEGORY_ID" },
      { field: "logistic_id", required: false, ok: true, note: p.logistic_id ? String(p.logistic_id) : "probe 시 활성 채널" },
      { field: "Open API live", required: false, ok: h.health === "live", note: h.note },
      { field: "listingMode", required: false, ok: true, note: h.listingMode },
    );
  }
  if (channel === "amazon_au") {
    const p = projectForAmazonAu(structured, catalog);
    const h = readAmazonAuHealthSnapshot();
    const itemName = String((p.attributes as { item_name?: { value?: string }[] }).item_name?.[0]?.value ?? "");
    const bullets = (p.attributes as { bullet_point?: unknown[] }).bullet_point ?? [];
    items.push(
      { field: "item_name≤200", required: true, ok: itemName.length <= 200 && itemName.length > 0 },
      { field: "bullet_point≥3", required: true, ok: bullets.length >= 3 },
      { field: "productType", required: true, ok: Boolean(p.productType) },
      { field: "SP-API live", required: false, ok: h.health === "live", note: h.note },
      { field: "listingMode", required: false, ok: true, note: h.listingMode },
    );
  }

  items.push({
    field: "credentials",
    required: false,
    ok: channelConfigured(channel) || channel === "lexi" || channel === "alibaba_package",
    note: channelConfigured(channel) ? "live" : "mock mode (*-MOCK-*)",
  });

  return items;
}

export function validateChannelExport(
  channel: string,
  structured: PdpStructured,
  catalog: CatalogRow | null,
  assetCount: number,
): ChannelExportPreview {
  const checklist = buildChannelChecklist(channel, structured, catalog, assetCount);
  const errors = [
    ...validatePdp(structured),
    ...validatePdpForChannel(channel, structured),
    ...checklist.filter((c) => c.required && !c.ok).map((c) => `${channel}:${c.field}`),
  ];
  let projected: Record<string, unknown> | undefined;
  if (channel === "shopify") projected = projectForShopify(structured, catalog);
  else if (channel === "coupang") projected = projectForCoupang(structured, catalog);
  else if (channel === "amazon_au") projected = projectForAmazonAu(structured, catalog);
  else if (channel === "shopee") projected = projectForShopee(structured, catalog);

  return {
    channel,
    ok: errors.length === 0,
    errors,
    checklist,
    projected,
    mockMode: !channelConfigured(channel) && channel !== "lexi" && channel !== "alibaba_package",
  };
}
