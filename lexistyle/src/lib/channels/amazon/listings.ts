import type { PdpStructured } from "@/lib/pdp/ruleset";
import type { CatalogRow } from "@/lib/catalog/index-store";
import { projectForAmazonAu } from "@/lib/export/channel-projection";
import { amazonAuListingMode } from "./constants";
import { putListingItem, patchListingItem, type ListingPutBody } from "./sp-api";

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function buildAmazonListingBody(opts: {
  structured: PdpStructured;
  catalog: CatalogRow | null;
  sellPriceAud: number;
  retailPriceAud?: number;
  imageUrls?: string[];
}): ListingPutBody {
  const projected = projectForAmazonAu(opts.structured, opts.catalog);
  const attrs = { ...(projected.attributes as Record<string, unknown>) };

  attrs.purchasable_offer = [
    {
      currency: "AUD",
      our_price: [{ schedule: [{ value_with_tax: opts.sellPriceAud }] }],
    },
  ];

  if (opts.retailPriceAud) {
    attrs.list_price = [
      {
        currency: "AUD",
        value: [{ value_with_tax: opts.retailPriceAud }],
      },
    ];
  }

  const hero = opts.imageUrls?.[0];
  if (hero) {
    attrs.main_product_image_locator = [{ media_location: hero, marketplace_id: "A39IBJ37TRP1C6" }];
  }

  const projectedDescription = (attrs.product_description as Array<{ value?: string }> | undefined)?.[0]?.value;
  const desc = projectedDescription || stripHtml(opts.structured.descriptionHtml ?? "");
  if (desc) attrs.product_description = [{ value: desc.slice(0, 2000), language_tag: "en_AU" }];

  return {
    productType: String(projected.productType ?? "PRODUCT"),
    attributes: attrs,
    requirements: "LISTING",
  };
}

export async function publishAmazonListing(opts: {
  sku: string;
  structured: PdpStructured;
  catalog: CatalogRow | null;
  sellPriceAud: number;
  retailPriceAud?: number;
  imageUrls?: string[];
  forceMode?: "preview" | "live";
}) {
  const body = buildAmazonListingBody(opts);
  const modeEnv = amazonAuListingMode();
  const mode = opts.forceMode ?? modeEnv;
  const queryMode = mode === "preview" ? "VALIDATION_PREVIEW" : undefined;
  const res = await putListingItem({ sku: opts.sku, body, mode: queryMode });
  return { mode, sku: opts.sku, response: res.data, validationOnly: mode === "preview" };
}

export async function patchAmazonStock(sku: string, qty: number) {
  return patchListingItem({
    sku,
    patches: [
      {
        op: "replace",
        path: "/attributes/fulfillment_availability",
        value: [{ fulfillment_channel_code: "DEFAULT", quantity: Math.max(0, qty), marketplace_id: "A39IBJ37TRP1C6" }],
      },
    ],
  });
}
