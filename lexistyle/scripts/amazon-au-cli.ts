/**
 * Amazon AU operations CLI.
 * Usage: npm run amazon:au -- health|products|product|get|register|inventory|orders|transactions|dashboard
 * All mutating commands require --live; default is preview/read-only.
 */
import "dotenv/config";
import { getAmazonLwaToken, getMarketplaceParticipations, getProductTypes, getListingItem, searchListingItems, putListingItem, patchListingItem, deleteListingItem, getUnshippedOrders, getOrderItems, listFinancialTransactions } from "../src/lib/channels/amazon/sp-api";
import { buildAmazonListingBody } from "../src/lib/channels/amazon/listings";
import { amazonAuFullyConfigured, amazonAuLwaConfigured } from "../src/lib/channels/amazon/constants";

const args = process.argv.slice(2);
const command = args[0] || "dashboard";
const flag = (name: string) => args.includes(name);
const value = (name: string, fallback = "") => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] || fallback : fallback; };
const json = (x: unknown) => console.log(JSON.stringify(x, null, 2));
const requireLive = () => { if (!flag("--live")) throw new Error("변경 작업은 --live를 명시해야 합니다. 기본은 preview/read-only입니다."); };

async function main() {
  if (command === "health") {
    const token = await getAmazonLwaToken();
    const participation = await getMarketplaceParticipations();
    json({ ok: true, lwa: Boolean(token), fullyConfigured: amazonAuFullyConfigured(), marketplaceId: process.env.AMAZON_AU_MARKETPLACE_ID || "A39IBJ37TRP1C6", participation: participation.data });
    return;
  }
  if (command === "product-types") { json(await getProductTypes()); return; }
  if (command === "products") { json(await searchListingItems({ pageSize: Number(value("--page-size", "20")) })); return; }
  if (command === "product") { const sku = value("--sku"); if (!sku) throw new Error("--sku required"); json(await getListingItem(sku)); return; }
  if (command === "orders") {
    const since = value("--since", new Date(Date.now() - 7 * 86400000).toISOString());
    const orders = await getUnshippedOrders(since); const rows = orders.data.payload?.Orders ?? [];
    const details = await Promise.all(rows.map(async (o: any) => ({ ...o, orderItems: (await getOrderItems(String(o.AmazonOrderId))).data.payload?.OrderItems ?? [] })));
    json({ count: details.length, orders: details }); return;
  }
  if (command === "transactions") {
    const since = value("--since", new Date(Date.now() - 30 * 86400000).toISOString());
    json(await listFinancialTransactions({ postedAfter: since, status: value("--status") || undefined })); return;
  }
  if (command === "inventory") {
    const sku = value("--sku"); const qty = Number(value("--qty", "0")); if (!sku) throw new Error("--sku required");
    if (!Number.isInteger(qty) || qty < 0) throw new Error("--qty must be a non-negative integer");
    if (!flag("--live")) { json({ preview: true, sku, quantity: qty }); return; }
    json(await patchListingItem({ sku, patches: [{ op: "replace", path: "/attributes/fulfillment_availability", value: [{ fulfillment_channel_code: "DEFAULT", quantity: qty, marketplace_id: process.env.AMAZON_AU_MARKETPLACE_ID || "A39IBJ37TRP1C6" }] }] })); return;
  }
  if (command === "delete") { const sku = value("--sku"); if (!sku) throw new Error("--sku required"); requireLive(); json(await deleteListingItem(sku)); return; }
  if (command === "dashboard") {
    const [listings, orders, tx] = await Promise.all([searchListingItems({ pageSize: 20 }), getUnshippedOrders(new Date(Date.now() - 7 * 86400000).toISOString()), listFinancialTransactions({ postedAfter: new Date(Date.now() - 30 * 86400000).toISOString() })]);
    json({ marketplaceId: process.env.AMAZON_AU_MARKETPLACE_ID || "A39IBJ37TRP1C6", listings: listings.data, unshippedOrders: orders.data, transactions30d: tx.data }); return;
  }
  if (command === "register") {
    const sku = value("--sku"); const title = value("--title"); const price = Number(value("--price")); const image = value("--image");
    if (!sku || !title || !price || !image) throw new Error("--sku --title --price --image required");
    const body = buildAmazonListingBody({ structured: { title, subtitle: "", descriptionHtml: title, usps: ["Curated by LEXI", "Ships to Australia", "Quality checked"], faq: [], ctaLabel: "Shop now", seoKeywords: ["fashion", "LEXI", "Australia"], galleryAssetIndexes: [] }, catalog: null, sellPriceAud: price, imageUrls: [image] });
    if (!flag("--live")) { json({ preview: true, sku, body }); return; }
    json(await putListingItem({ sku, body })); return;
  }
  throw new Error(`Unknown command: ${command}`);
}

main().catch((e) => { console.error(`amazon-au-cli error: ${e instanceof Error ? e.message : String(e)}`); process.exit(1); });
