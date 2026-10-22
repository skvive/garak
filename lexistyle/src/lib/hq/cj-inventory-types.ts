import type { CjSourcingPlatform } from "./cj-links";
import type { StockAlert } from "@/lib/catalog/stock-alert";

export type CjInventoryKind = "product" | "bundle" | "deposit";

export type CjPrivateInventoryRow = {
  sku: string;
  title: string;
  kind: CjInventoryKind;
  qty: number;
  warehouse: string;
  valueUsd: number;
  alert: StockAlert;
};

export type CjSourcingTicketStatus = "received" | "sourcing" | "linked" | "closed";

export type CjSourcingTicket = {
  id: number;
  platform: CjSourcingPlatform;
  sourceUrl: string;
  title: string;
  note: string;
  status: CjSourcingTicketStatus;
  linkedPid?: string;
  createdAt: string;
};
