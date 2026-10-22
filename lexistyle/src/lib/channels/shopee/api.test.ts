import assert from "node:assert/strict";
import { test } from "node:test";
import { getOrderDetailsForRange } from "./api";

test("loads every Shopee order-list cursor and detail batch", async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    partnerId: process.env.SHOPEE_PARTNER_ID,
    partnerKey: process.env.SHOPEE_PARTNER_KEY,
    shopId: process.env.SHOPEE_SHOP_ID,
    accessToken: process.env.SHOPEE_ACCESS_TOKEN,
  };
  process.env.SHOPEE_PARTNER_ID = "123";
  process.env.SHOPEE_PARTNER_KEY = "test-key";
  process.env.SHOPEE_SHOP_ID = "456";
  process.env.SHOPEE_ACCESS_TOKEN = "test-token";

  const listCursors: string[] = [];
  global.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/order/get_order_list")) {
      const cursor = url.searchParams.get("cursor") ?? "";
      listCursors.push(cursor);
      return Response.json({ response: cursor
        ? { order_list: [{ order_sn: "B" }], more: false }
        : { order_list: [{ order_sn: "A" }], more: true, next_cursor: "next" } });
    }
    assert.equal(url.pathname.endsWith("/order/get_order_detail"), true);
    assert.equal(url.searchParams.get("order_sn_list"), "A,B");
    return Response.json({ response: { order_list: [{ order_sn: "A" }, { order_sn: "B" }] } });
  };

  try {
    const orders = await getOrderDetailsForRange({ timeFrom: 1, timeTo: 2 });
    assert.deepEqual(listCursors, ["", "next"]);
    assert.deepEqual(orders.map((order) => order.order_sn), ["A", "B"]);
  } finally {
    global.fetch = originalFetch;
    if (originalEnv.partnerId === undefined) delete process.env.SHOPEE_PARTNER_ID; else process.env.SHOPEE_PARTNER_ID = originalEnv.partnerId;
    if (originalEnv.partnerKey === undefined) delete process.env.SHOPEE_PARTNER_KEY; else process.env.SHOPEE_PARTNER_KEY = originalEnv.partnerKey;
    if (originalEnv.shopId === undefined) delete process.env.SHOPEE_SHOP_ID; else process.env.SHOPEE_SHOP_ID = originalEnv.shopId;
    if (originalEnv.accessToken === undefined) delete process.env.SHOPEE_ACCESS_TOKEN; else process.env.SHOPEE_ACCESS_TOKEN = originalEnv.accessToken;
  }
});
