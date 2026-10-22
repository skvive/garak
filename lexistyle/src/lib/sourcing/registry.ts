import type { SupplierConnector } from "./types";
import { cjConnector } from "./connectors/cjdropshipping";
import { superbuyConnector } from "./connectors/superbuy";
import { alibabaConnector } from "./connectors/alibaba";
import { cafe24MallConnector } from "./connectors/cafe24-mall";
import { temuConnector } from "./connectors/temu";

const registry: Record<string, SupplierConnector> = {
  [cjConnector.code]: cjConnector,
  [superbuyConnector.code]: superbuyConnector,
  [alibabaConnector.code]: alibabaConnector,
  [cafe24MallConnector.code]: cafe24MallConnector,
  [temuConnector.code]: temuConnector,
};

export function getConnector(code: string): SupplierConnector | null {
  return registry[code] ?? null;
}

export const connectorCodes = Object.keys(registry);
