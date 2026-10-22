/**
 * 커머스 원장 무결성 감시.
 * 중요 기록만 append-only 해시 체인에 남기고, 주기 스캔으로 유실·위변조를 찾는다.
 * 일반 CRUD 핫패스는 enqueue만. 검증은 스캔 경로.
 */
import { createHash } from "crypto";
import { isNull } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { banners, orders, products } from "@/db/schema";
import { listProducts } from "@/lib/catalog";
import type { HqState } from "./store";
import {
  emptyLedger,
  type LedgerAlert,
  type LedgerCheckpoint,
  type LedgerEvent,
  type LedgerStream,
} from "./ledger-types";

export type LedgerInput = {
  stream: LedgerStream;
  entity: string;
  entityId: string;
  action: string;
  actor: string;
  payload: Record<string, unknown>;
};

const MAX_EVENTS = 2000;
const MAX_ALERTS = 80;
const MAX_CHECKPOINTS = 40;

const AUDIT_STREAM: Record<string, LedgerStream> = {
  purchase_request: "purchase_request",
  sourcing_order: "sourcing_order",
  settlement: "settlement",
  listing: "listing",
  listing_draft: "listing",
  channel_listing: "listing",
  draft: "listing",
};

export function sha256(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`;
}

export function ensureLedger(s: HqState) {
  if (!s.ledger) s.ledger = emptyLedger();
  return s.ledger;
}

export function appendLedgerEvent(s: HqState, input: LedgerInput): LedgerEvent {
  const ledger = ensureLedger(s);
  const payloadDigest = sha256(canonicalJson(input.payload));
  const chain = ledger.events.filter((e) => e.stream === input.stream);
  const newest = chain[0];
  const seq = (newest?.seq ?? 0) + 1;
  const prevHash = newest?.recordHash ?? "genesis";
  const recordHash = sha256(`${prevHash}|${seq}|${input.stream}|${payloadDigest}|${input.action}|${input.entityId}`);
  const ev: LedgerEvent = {
    id: ++s.seq,
    stream: input.stream,
    seq,
    entity: input.entity,
    entityId: input.entityId,
    action: input.action,
    actor: input.actor,
    payloadDigest,
    prevHash,
    recordHash,
    createdAt: new Date().toISOString(),
  };
  ledger.events.unshift(ev);
  if (ledger.events.length > MAX_EVENTS) ledger.events.length = MAX_EVENTS;
  return ev;
}

export function sealFromAudit(
  s: HqState,
  entity: string,
  entityId: string,
  toState: string,
  actor: string,
  meta?: Record<string, unknown>,
) {
  const stream = AUDIT_STREAM[entity];
  if (!stream) return;
  appendLedgerEvent(s, {
    stream,
    entity,
    entityId,
    action: toState,
    actor,
    payload: { toState, ...(meta ?? {}) },
  });
}

export async function sealLedger(input: LedgerInput) {
  const { mutate } = await import("./store");
  try {
    await mutate((s) => {
      appendLedgerEvent(s, input);
    });
  } catch (e) {
    console.error("[ledger] seal failed", e);
  }
}

export function verifyStream(events: LedgerEvent[], stream: LedgerStream) {
  const ordered = events.filter((e) => e.stream === stream).slice().reverse();
  const breaks: string[] = [];
  let prev = "genesis";
  let expectSeq = 1;
  for (const e of ordered) {
    if (e.seq !== expectSeq) breaks.push(`seq ${expectSeq} 없음 (실제 ${e.seq})`);
    if (e.prevHash !== prev) breaks.push(`#${e.seq} prev 불일치`);
    const recomputed = sha256(`${e.prevHash}|${e.seq}|${e.stream}|${e.payloadDigest}|${e.action}|${e.entityId}`);
    if (recomputed !== e.recordHash) breaks.push(`#${e.seq} 해시 재계산 불일치`);
    prev = e.recordHash;
    expectSeq = e.seq + 1;
  }
  return { ok: breaks.length === 0, count: ordered.length, breaks };
}

function digestRows(rows: unknown[]) {
  return { count: rows.length, digest: sha256(canonicalJson(rows)) };
}

async function censusOf(stream: LedgerStream, s: HqState) {
  if (stream === "product") {
    if (hasDb()) {
      try {
        const rows = await db()
          .select({
            id: products.id,
            slug: products.slug,
            name: products.name,
            priceUsd: products.priceUsd,
            stock: products.stock,
            deletedAt: products.deletedAt,
          })
          .from(products)
          .limit(4000);
        return digestRows(rows);
      } catch {
        /* fall through */
      }
    }
    const items = await listProducts();
    return digestRows(items.map((p) => ({ slug: p.slug, name: p.name, price: p.price, discountRate: p.discountRate })));
  }
  if (stream === "order") {
    if (!hasDb()) return digestRows([]);
    try {
      const rows = await db()
        .select({
          id: orders.id,
          status: orders.status,
          totalUsd: orders.totalUsd,
          paymentRef: orders.paymentRef,
          deletedAt: orders.deletedAt,
        })
        .from(orders)
        .limit(4000);
      return digestRows(rows);
    } catch {
      return digestRows([]);
    }
  }
  if (stream === "banner") {
    if (!hasDb()) return digestRows([]);
    try {
      const rows = await db()
        .select({
          id: banners.id,
          slot: banners.slot,
          headline: banners.headline,
          href: banners.href,
          deletedAt: banners.deletedAt,
        })
        .from(banners)
        .where(isNull(banners.deletedAt))
        .limit(500);
      return digestRows(rows);
    } catch {
      return digestRows([]);
    }
  }
  if (stream === "settlement") return digestRows(s.settlements.map((x) => ({ id: x.id, status: x.status, marginUsd: x.marginUsd, channelCode: x.channelCode })));
  if (stream === "purchase_request") {
    return digestRows(s.purchaseRequests.map((x) => ({ id: x.id, status: x.status, ref: x.externalOrderRef, paid: x.channelPaidAmount })));
  }
  if (stream === "sourcing_order") {
    return digestRows(s.sourcingOrders.map((x) => ({ id: x.id, status: x.status, pr: x.purchaseRequestId, cost: x.costUsd })));
  }
  return digestRows(s.listings.map((x) => ({ id: x.id, status: x.status, slug: x.productSlug })));
}

function pushAlert(s: HqState, alert: Omit<LedgerAlert, "id" | "createdAt" | "status">) {
  const ledger = ensureLedger(s);
  ledger.alerts.unshift({
    ...alert,
    id: ++s.seq,
    createdAt: new Date().toISOString(),
    status: "open",
  });
  if (ledger.alerts.length > MAX_ALERTS) ledger.alerts.length = MAX_ALERTS;
}

const CENSUS_STREAMS: LedgerStream[] = [
  "product", "order", "banner", "settlement", "purchase_request", "sourcing_order", "listing",
];

export async function scanLedger() {
  const { getState, mutate } = await import("./store");
  const live = await getState();
  const census: Record<string, { count: number; digest: string }> = {};
  for (const stream of CENSUS_STREAMS) census[stream] = await censusOf(stream, live);

  return mutate((s) => {
    const ledger = ensureLedger(s);
    const byStream: Record<string, { ok: boolean; count: number; breaks: string[] }> = {};
    for (const stream of CENSUS_STREAMS) {
      const v = verifyStream(ledger.events, stream);
      byStream[stream] = v;
      if (!v.ok) {
        const kind = v.breaks.some((b) => b.includes("없음")) ? "seq_gap" : "chain_break";
        pushAlert(s, { kind, stream, detail: v.breaks.slice(0, 3).join(" · ") });
      }
      const prev = ledger.checkpoints.find((c) => c.stream === stream);
      const now = census[stream];
      if (prev) {
        if (now.count < prev.censusCount) {
          pushAlert(s, {
            kind: "count_drop",
            stream,
            detail: `${prev.censusCount}건 → ${now.count}건`,
          });
        } else if (now.digest !== prev.censusDigest) {
          const sealedAfter = ledger.events.some((e) => e.stream === stream && e.createdAt > prev.createdAt);
          if (!sealedAfter) {
            pushAlert(s, {
              kind: "census_drift",
              stream,
              detail: "점검 이후 원장이 바뀌었으나 체인 기록이 없음",
            });
          }
        }
      }
      const rootHash = sha256(
        ledger.events.filter((e) => e.stream === stream).map((e) => e.recordHash).reverse().join(""),
      );
      const cp: LedgerCheckpoint = {
        id: ++s.seq,
        stream,
        rootHash,
        censusDigest: now.digest,
        censusCount: now.count,
        eventCount: v.count,
        createdAt: new Date().toISOString(),
      };
      ledger.checkpoints = [cp, ...ledger.checkpoints.filter((c) => c.stream !== stream)];
      if (ledger.checkpoints.length > MAX_CHECKPOINTS) ledger.checkpoints.length = MAX_CHECKPOINTS;
    }
    const open = ledger.alerts.filter((a) => a.status === "open").length;
    return {
      ok: open === 0,
      openAlerts: open,
      byStream,
      census,
      events: ledger.events.slice(0, 80),
      checkpoints: ledger.checkpoints,
      alerts: ledger.alerts.slice(0, 40),
    };
  });
}

export function listLedger(s: HqState) {
  const ledger = ensureLedger(s);
  const byStream: Record<string, number> = {};
  for (const e of ledger.events) byStream[e.stream] = (byStream[e.stream] ?? 0) + 1;
  return {
    events: ledger.events.slice(0, 120),
    checkpoints: ledger.checkpoints,
    alerts: ledger.alerts.slice(0, 40),
    counts: {
      events: ledger.events.length,
      openAlerts: ledger.alerts.filter((a) => a.status === "open").length,
      byStream,
    },
  };
}

export function ackLedgerAlert(s: HqState, id: number) {
  const a = ensureLedger(s).alerts.find((x) => x.id === id);
  if (!a) throw new Error("alert not found");
  a.status = "ack";
  return a;
}
