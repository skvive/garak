import { AsyncLocalStorage } from "node:async_hooks";

export type ShopeeScope = {
  partnerId: string; partnerKey: string; shopId: string; host: string;
  accessToken: string; refreshToken: string;
  onTokens: (tokens: { accessToken: string; refreshToken: string }) => Promise<void>;
};
const storage = new AsyncLocalStorage<ShopeeScope>();
export function currentShopeeScope() { return storage.getStore(); }
/** Explicit credentials never fall back to the internal HQ shop's environment. */
export function withShopeeScope<T>(scope: ShopeeScope, task: () => Promise<T>) { return storage.run(scope, task); }
