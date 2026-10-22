/**
 * Amazon SP-API 어댑터 — 호주(AUS) 마켓플레이스 판매채널.
 * 인증: SP-API LWA 토큰 (env 미설정 시 목업).
 * env: AMAZON_LWA_CLIENT_ID / AMAZON_LWA_CLIENT_SECRET / AMAZON_REFRESH_TOKEN / AMAZON_SELLER_ID
 */
import type { ChannelAdapter, PublishInput } from "../types";

const HOST = process.env.AMAZON_ENDPOINT ?? "https://sellingpartnerapi-na.amazon.com";

const configured = () =>
  Boolean(
    process.env.AMAZON_LWA_CLIENT_ID &&
      process.env.AMAZON_LWA_CLIENT_SECRET &&
      process.env.AMAZON_REFRESH_TOKEN &&
      process.env.AMAZON_SELLER_ID,
  );

let mockSeq = 40000;

export const amazonAdapter: ChannelAdapter = {
  code: "amazon",

  async publish({ listing, draft, options, extraInfo, pricing }: PublishInput) {
    if (!configured()) {
      return { externalRef: `AMZ-MOCK-${listing.id}-${++mockSeq}` };
    }
    // SP-API 제품 등록은 Feed(JSON_LISTINGS_FEED) 기반. 실제 전송은 createFeed로 확장(연동 지점).
    const effectivePrice = pricing?.sellPriceUsd ?? listing.sellPriceUsd;
    const variants = (options ?? []).length
      ? options!.map((o) => ({
          sku: o.sku ?? `VAR-${o.name}`,
          price: o.priceUsd ?? effectivePrice,
          attributes: {
            item_name: draft.title,
            color: o.attributes?.color ?? o.name,
            ...o.attributes,
          },
        }))
      : [
          {
            sku: `LEXI-${draft.id}`,
            price: effectivePrice,
            attributes: {
              item_name: draft.title,
              product_description: draft.descriptionHtml?.replace(/<[^>]+>/g, " ").slice(0, 2000),
              ...(extraInfo ?? {}),
            },
          },
        ];

    const payload = {
      sellerId: process.env.AMAZON_SELLER_ID,
      marketplaceId: process.env.AMAZON_MARKETPLACE_ID ?? "A39IBJ37TRP1C6", // AUS
      items: variants,
      _lexi_assets: draft.assets.map((a) => a.url),
    };

    // Feed 전송 (실제 구현 시 LWA 토큰 → createFeed)
    const res = await fetch(`${HOST}/feeds/2021-06-30/feeds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-amz-access-token": process.env.AMAZON_ACCESS_TOKEN ?? "",
      },
      body: JSON.stringify(payload),
    }).catch(() => null);

    const feedId = (await res?.json().catch(() => null))?.feedId;
    return {
      externalRef: feedId ? `AMZ-FEED-${feedId}` : `AMZ-PKG-${draft.id}-${Date.now()}`,
    };
  },
};