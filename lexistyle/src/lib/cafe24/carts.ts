// filepath: src/lib/cafe24/carts.ts
/**
 * Cafe24 Front Cart API 연동.
 * 자격증명·회원 토큰이 있으면 Cafe24 장바구니에 반영하고,
 * 실패 시 로컬 cart(cookie/DB)로 폴백하도록 상위 레이어가 처리한다.
 */
import { cafe24Fetch } from "./client";
import { cafe24Mode } from "./config";
import type { Cafe24CartsResponse } from "./types";

export async function cafe24ListCart(memberId?: string) {
  if (cafe24Mode() === "off") return null;
  try {
    return await cafe24Fetch<Cafe24CartsResponse>({
      path: "/carts",
      query: memberId ? { member_id: memberId } : undefined,
    });
  } catch (e) {
    console.error("[cafe24.carts.list]", e);
    return null;
  }
}

export async function cafe24AddToCart(input: {
  productNo: number;
  quantity: number;
  variantCode?: string;
  memberId?: string;
}) {
  if (cafe24Mode() === "off") throw new Error("Cafe24 off");
  return cafe24Fetch({
    method: "POST",
    path: "/carts",
    body: {
      shop_no: Number(process.env.CAFE24_SHOP_NO || 1),
      request: {
        product_no: input.productNo,
        quantity: input.quantity,
        ...(input.variantCode ? { variant_code: input.variantCode } : {}),
        ...(input.memberId ? { member_id: input.memberId } : {}),
      },
    },
  });
}
