/** HQ 홈 — 오늘 손댈 일 + 파이프라인·주문·채널·원장 요약 */
import { catalogStats } from "@/lib/catalog/index-store";
import { listPdpDocuments } from "@/lib/pdp/generate";
import { listExports } from "@/lib/export/jobs";
import { hasDb } from "@/db";
import { getDataMode } from "@/lib/data-mode";
import { listSalesChannelCards } from "./sales-channels";
import { getState } from "./store";
import { listPurchaseInbox } from "./purchase-inbox";
import { listLedger } from "./integrity";
import { LEDGER_ALERT_KO } from "./ledger-types";
import type { InboxStage } from "./inbox-types";

export type HqOverview = {
  dbMode: "neon" | "local-file";
  dataMode: "dummy" | "real";
  attention: {
    inspect: number;
    source: number;
    pdpReview: number;
    ledgerAlerts: number;
    exportFailed: number;
    channelsOff: number;
  };
  funnel: {
    catalogTotal: number;
    imported: number;
    pdpTotal: number;
    pdpReview: number;
    exportQueued: number;
    exportDone: number;
    exportFailed: number;
  };
  orders: Record<InboxStage, number> & { all: number };
  ledger: { events: number; openAlerts: number; lastScan?: string };
  actionQueue: { kind: string; id: number | string; title: string; href: string }[];
  channelHealth: { code: string; label: string; status: string; note: string; family: string }[];
  recent: { kind: string; id: number | string; label: string; at: string }[];
};

export async function getHqOverview(): Promise<HqOverview> {
  const stats = await catalogStats("cjdropshipping");
  const docs = await listPdpDocuments(40);
  const exports = await listExports(40);
  const s = await getState();
  const inbox = listPurchaseInbox(s);
  const ledger = listLedger(s);
  const channels = listSalesChannelCards(s);
  const dataMode = await getDataMode().catch(() => ({ mode: "dummy" as const }));

  const pdpReview = docs.filter((d) => (d as { status?: string }).status === "review").length;
  const exportQueued = exports.filter((e) => e.status === "queued" || e.status === "retry").length;
  const exportDone = exports.filter((e) => e.status === "done").length;
  const exportFailed = exports.filter((e) => e.status === "failed").length;
  const inspect = inbox.counts.byStage.inspect;
  const source = inbox.counts.byStage.source;
  const channelsOff = channels.filter((c) => c.health === "off" || c.health === "paused" || c.health === "mock").length;

  const actionQueue: HqOverview["actionQueue"] = [];
  for (const a of ledger.alerts.filter((x) => x.status === "open").slice(0, 4)) {
    actionQueue.push({
      kind: "ledger",
      id: a.id,
      title: `${LEDGER_ALERT_KO[a.kind]} · ${a.stream}`,
      href: "/hq/ledger",
    });
  }
  for (const e of exports.filter((x) => x.status === "failed").slice(0, 4)) {
    actionQueue.push({
      kind: "export_failed",
      id: e.id,
      title: `Export 실패 · ${e.channelCode} #${e.id}`,
      href: "/hq/pipeline/export",
    });
  }
  for (const d of docs.filter((x) => (x as { status?: string }).status === "review").slice(0, 4)) {
    actionQueue.push({
      kind: "pdp_review",
      id: d.id,
      title: `PDP 리뷰: ${(d as { title?: string }).title ?? d.id}`,
      href: "/hq/pipeline/pdp",
    });
  }
  for (const r of inbox.rows.filter((x) => x.stage === "inspect").slice(0, 4)) {
    actionQueue.push({
      kind: "inspect",
      id: r.id,
      title: `검수대기 · ${r.channel.name} ${r.externalOrderRef}`,
      href: "/hq/purchase-requests",
    });
  }
  for (const c of channels.filter((x) => x.paused || x.health === "off").slice(0, 3)) {
    actionQueue.push({
      kind: "channel",
      id: c.code,
      title: `${c.label} ${c.paused ? "정지" : "미연결"}`,
      href: "/hq/channels",
    });
  }

  const recent: HqOverview["recent"] = [];
  for (const ev of ledger.events.slice(0, 6)) {
    recent.push({ kind: "ledger", id: ev.id, label: `${ev.stream} · ${ev.action}`, at: ev.createdAt });
  }
  for (const e of exports.slice(0, 6)) {
    recent.push({
      kind: "export",
      id: e.id,
      label: `${e.channelCode} · ${e.status}`,
      at: (e.createdAt instanceof Date ? e.createdAt : new Date(e.createdAt as string)).toISOString(),
    });
  }
  for (const d of docs.slice(0, 4)) {
    const created = (d as { createdAt?: Date | string }).createdAt;
    recent.push({
      kind: "pdp",
      id: d.id,
      label: (d as { title?: string }).title ?? `doc #${d.id}`,
      at: created ? new Date(created).toISOString() : new Date().toISOString(),
    });
  }
  for (const a of s.audit.slice(0, 4)) {
    recent.push({ kind: "audit", id: a.id, label: `${a.entity} → ${a.toState}`, at: a.createdAt });
  }
  recent.sort((a, b) => (a.at < b.at ? 1 : -1));

  return {
    dbMode: hasDb() ? "neon" : "local-file",
    dataMode: dataMode.mode,
    attention: {
      inspect,
      source,
      pdpReview,
      ledgerAlerts: ledger.counts.openAlerts,
      exportFailed,
      channelsOff,
    },
    funnel: {
      catalogTotal: stats.total,
      imported: stats.imported,
      pdpTotal: docs.length,
      pdpReview,
      exportQueued,
      exportDone,
      exportFailed,
    },
    orders: { ...inbox.counts.byStage, all: inbox.counts.all },
    ledger: {
      events: ledger.counts.events,
      openAlerts: ledger.counts.openAlerts,
      lastScan: ledger.checkpoints[0]?.createdAt,
    },
    actionQueue: actionQueue.slice(0, 10),
    channelHealth: channels.map((c) => ({
      code: c.code,
      label: c.label,
      status: c.health,
      note: c.healthNote,
      family: c.family,
    })),
    recent: recent.slice(0, 12),
  };
}