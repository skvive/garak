import assert from "node:assert/strict";
import { test } from "node:test";
import { mapShopeeOrderDetails } from "../adapters/shopee";

test("maps every Shopee order item to a stable purchase-request row", () => {
  const rows = mapShopeeOrderDetails([{
    order_sn: "ORDER-1",
    buyer_username: "buyer",
    total_amount: 99,
    currency: "SGD",
    recipient_address: { name: "Buyer", region: "SG", full_address: "1 Test Road" },
    item_list: [
      { item_id: 10, model_id: 100, item_name: "A", item_sku: "A-RED", model_quantity_purchased: 2, model_discounted_price: 12.5 },
      { item_id: 20, model_id: 200, item_name: "B", item_sku: "B-BLUE", model_quantity_purchased: 1, model_original_price: 30 },
    ],
  }], "SGD");

  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((row) => row.externalOrderRef), ["ORDER-1:10:100", "ORDER-1:20:200"]);
  assert.deepEqual(rows.map((row) => row.paidAmount), [25, 30]);
  assert.deepEqual(rows.map((row) => row.raw?.orderSn), ["ORDER-1", "ORDER-1"]);
});
