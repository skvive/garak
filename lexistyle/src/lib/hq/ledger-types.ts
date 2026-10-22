/** 커머스 원장 무결성 감시 — 클라이언트 공유 타입 */

export type LedgerStream =
  | "product"
  | "order"
  | "banner"
  | "settlement"
  | "purchase_request"
  | "sourcing_order"
  | "listing";

export type LedgerAlertKind = "chain_break" | "seq_gap" | "census_drift" | "count_drop";

export type LedgerEvent = {
  id: number;
  stream: LedgerStream;
  seq: number;
  entity: string;
  entityId: string;
  action: string;
  actor: string;
  payloadDigest: string;
  prevHash: string;
  recordHash: string;
  createdAt: string;
};

export type LedgerCheckpoint = {
  id: number;
  stream: LedgerStream;
  rootHash: string;
  censusDigest: string;
  censusCount: number;
  eventCount: number;
  createdAt: string;
};

export type LedgerAlert = {
  id: number;
  kind: LedgerAlertKind;
  stream: LedgerStream;
  detail: string;
  createdAt: string;
  status: "open" | "ack";
};

export type LedgerState = {
  events: LedgerEvent[];
  checkpoints: LedgerCheckpoint[];
  alerts: LedgerAlert[];
};

export const LEDGER_STREAMS: { id: LedgerStream; label: string }[] = [
  { id: "product", label: "상품" },
  { id: "order", label: "주문" },
  { id: "banner", label: "배너" },
  { id: "settlement", label: "정산" },
  { id: "purchase_request", label: "구매요청" },
  { id: "sourcing_order", label: "소싱발주" },
  { id: "listing", label: "리스팅" },
];

export const LEDGER_ALERT_KO: Record<LedgerAlertKind, string> = {
  chain_break: "체인 불일치",
  seq_gap: "일련번호 공백",
  census_drift: "원장 스냅샷 불일치",
  count_drop: "건수 감소",
};

export function emptyLedger(): LedgerState {
  return { events: [], checkpoints: [], alerts: [] };
}
