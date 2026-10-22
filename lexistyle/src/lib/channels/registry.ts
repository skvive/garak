import type { ChannelAdapter } from "./types";
import { lexiAdapter } from "./adapters/lexi";
import { coupangAdapter } from "./adapters/coupang";
import { shopeeAdapter } from "./adapters/shopee";
import { shopifyAdapter } from "./adapters/shopify";
import { amazonAuAdapter } from "./adapters/amazon-au";
import { amazonAdapter } from "./adapters/amazon";

const registry: Record<string, ChannelAdapter> = {
  [lexiAdapter.code]: lexiAdapter,
  [coupangAdapter.code]: coupangAdapter,
  [shopeeAdapter.code]: shopeeAdapter,
  [shopifyAdapter.code]: shopifyAdapter,
  [amazonAuAdapter.code]: amazonAuAdapter,
  amazon: amazonAdapter,
  [amazonAdapter.code]: amazonAdapter,
};

export function getChannelAdapter(code: string): ChannelAdapter | null {
  return registry[code] ?? null;
}
