/**
 * HQ 스토어 — 역직구 도메인의 런타임 상태 저장소.
 *
 * v1 내구화 전략 (스펙 §1 D1 + hq_state):
 *  - 프로세스 메모리(globalThis)에 전체 상태 유지
 *  - DATABASE_URL이 있으면 hq_state(key='snapshot') jsonb로 저장/복원 (mutate 시 debounce persist)
 *  - 관계형 테이블(suppliers, supplier_products, …)은 스키마에 준비돼 있고 M7에서 완전 이관
 */
import { hasDb } from "@/db";
import { rawSql } from "@/db/sql";
import type {
  AuditEntry, Bookmark, Channel, ChannelListing, Collection, CollectionItem,
  ImportBatch, Listing, ListingDraft, PurchaseRequest, Settlement,
  SourcingOrder, Supplier, SupplierProduct,
} from "./types";
import { DEFAULT_FX } from "./types";
import type {
  CampaignLogEntry, ContentCategory, MarketingAsset, MarketingLearning,
} from "@/lib/marketing/types";
import { DEFAULT_CATEGORIES } from "@/lib/marketing/categories";
import { emptyLedger, type LedgerState } from "./ledger-types";
import { ensureLedger, sealFromAudit } from "./integrity";
import { emptySalesMeta, type SalesChannelMeta } from "./sales-channels";
import type { CjPrivateInventoryRow, CjSourcingTicket } from "./cj-inventory-types";

export type HqState = {
  seq: number;
  suppliers: Supplier[];
  supplierProducts: SupplierProduct[];
  collections: Collection[];
  collectionItems: CollectionItem[];
  drafts: ListingDraft[];
  listings: Listing[];
  channels: Channel[];
  channelListings: ChannelListing[];
  importBatches: ImportBatch[];
  purchaseRequests: PurchaseRequest[];
  sourcingOrders: SourcingOrder[];
  settlements: Settlement[];
  audit: AuditEntry[];
  bookmarks: Bookmark[];
  fx: Record<string, number>;
  // M8~M11 AI 마케팅 피드
  marketingAssets: MarketingAsset[];
  marketingLearnings: MarketingLearning[];
  campaignLog: CampaignLogEntry[];
  contentCategories: ContentCategory[];
  ledger?: LedgerState;
  salesChannelMeta?: Record<string, SalesChannelMeta>;
  cjPrivateInventory?: CjPrivateInventoryRow[];
  cjSourcingTickets?: CjSourcingTicket[];
};

const now = () => new Date().toISOString();

function seedState(): HqState {
  return {
    seq: 100,
    suppliers: [
      {
        id: 1, code: "cjdropshipping", name: "CJDropshipping",
        homepage: "https://cjdropshipping.com", connectorKind: "api",
        currency: "USD", leadTimeDays: 7,
        asCenterUrl: "https://cjdropshipping.com/disputes",
        asPolicy: "배송 파손/오배송은 CJ 분쟁 시스템으로 이관", legalNote: "공식 오픈 API 사용",
        status: "active", createdAt: now(),
      },
      {
        id: 2, code: "superbuy", name: "Superbuy (1688/타오바오 대행)",
        homepage: "https://superbuy.com", connectorKind: "agent",
        currency: "CNY", leadTimeDays: 12,
        asCenterUrl: "https://front.superbuy.com/help", legalNote: "대리구매 오픈 API",
        status: "paused", createdAt: now(),
      },
      {
        id: 3, code: "alibaba", name: "Alibaba / 1688",
        homepage: "https://www.1688.com", connectorKind: "api",
        currency: "CNY", leadTimeDays: 10,
        asCenterUrl: "https://air.1688.com", legalNote: "Open Platform App Key 필요 (Cloud LTAI 키와 별개)",
        status: "active", createdAt: now(),
      },
      {
        id: 4, code: "cafe24-mall", name: "내 Cafe24 몰 (기존 등록분)",
        homepage: "https://www.cafe24.com", connectorKind: "api",
        currency: "KRW", leadTimeDays: 7,
        legalNote: "Cafe24 Open API로 몰 내 상품을 소싱 파이프라인으로 읽어오는 브릿지",
        status: "active", createdAt: now(),
      },
      {
        id: 5, code: "temu", name: "Temu (테무)",
        homepage: "https://www.temu.com", connectorKind: "scrape",
        currency: "USD", leadTimeDays: 12,
        legalNote: "공식 소싱 오픈 API 없음 — URL 임포트/서드파티 데이터/약관준수 파싱 경로",
        status: "active", createdAt: now(),
      },
    ],
    supplierProducts: [],
    collections: [{ id: 1, slug: "starter-picks", name: "스타터 셀렉션", note: "첫 소싱 후보", createdAt: now() }],
    collectionItems: [],
    drafts: [],
    listings: [],
    channels: [
      { id: 1, code: "lexi", kind: "own", name: "LEXI 자사몰", config: { tradeModel: "reverse-dropship", currency: "USD", feeRate: 0.036 } },
      { id: 2, code: "coupang", kind: "coupang", name: "쿠팡 (구매대행)", config: { tradeModel: "purchase-agency", firstLineSupport: true, currency: "KRW", feeRate: 0.108 } },
{ id: 3, code: "amazon_au", kind: "amazon", name: "아마존 (호주)", config: { tradeModel: "reverse-dropship", firstLineSupport: true, currency: "AUD", feeRate: 0.15 } },
      { id: 4, code: "shopee", kind: "shopee", name: "Shopee (동남아)", config: { tradeModel: "reverse-dropship", firstLineSupport: true, currency: "SGD", feeRate: 0.08 } },
      { id: 5, code: "shopify", kind: "shopify", name: "Shopify (LEXID)", config: { tradeModel: "reverse-dropship", currency: "USD", feeRate: 0.029 } },
    ],
    channelListings: [],
    importBatches: [],
    purchaseRequests: [],
    sourcingOrders: [],
    settlements: [],
    audit: [],
    bookmarks: [],
    fx: { ...DEFAULT_FX },
    marketingAssets: [],
    marketingLearnings: [],
    campaignLog: [],
    contentCategories: DEFAULT_CATEGORIES.map((c) => ({ ...c, seeds: [...c.seeds] })),
    ledger: emptyLedger(),
    salesChannelMeta: emptySalesMeta(),
    cjPrivateInventory: [],
    cjSourcingTickets: [],
  };
}

type G = typeof globalThis & { __lexiHq?: { state: HqState; loaded: boolean; persistTimer?: ReturnType<typeof setTimeout> } };
const g = globalThis as G;

async function loadSnapshot(): Promise<HqState | null> {
  if (!hasDb()) return null;
  try {
    const rows = await rawSql<{ value: HqState }>`SELECT value FROM hq_state WHERE key = 'snapshot'`;
    return rows[0]?.value ?? null;
  } catch {
    return null; // 테이블 미생성 등 — 메모리 모드로 진행
  }
}

async function persistNow() {
  if (!hasDb() || !g.__lexiHq) return;
  clearTimeout(g.__lexiHq.persistTimer);
  try {
    await rawSql`
      INSERT INTO hq_state (key, value, updated_at)
      VALUES ('snapshot', ${JSON.stringify(g.__lexiHq.state)}::jsonb, now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
  } catch (e) {
    console.error("[hq] snapshot persist failed", e);
  }
}

function schedulePersist() {
  if (!hasDb() || !g.__lexiHq) return;
  clearTimeout(g.__lexiHq.persistTimer);
  g.__lexiHq.persistTimer = setTimeout(() => void persistNow(), 800);
}

/** Cafe24를 판매처(채널)에서 제외 + 신규 채널(amazon/shopee/shopify) 시드 병합 */
function migrateChannels(s: HqState): HqState {
  const seeded = seedState().channels;
  const existing = (s.channels ?? []).filter((c) => c.code !== "cafe24" && c.code !== "amazon");
  const merged = [...existing];
  for (const seed of seeded) {
    if (!merged.some((c) => c.code === seed.code)) merged.push(seed);
  }
  s.channels = merged;
  s.channelListings = (s.channelListings ?? []).filter((cl) => cl.channelId === undefined || merged.some((c) => c.id === cl.channelId));
  return s;
}

export async function getState(): Promise<HqState> {
  if (!g.__lexiHq) g.__lexiHq = { state: migrateChannels(seedState()), loaded: false };
  if (!g.__lexiHq.loaded) {
    g.__lexiHq.loaded = true;
    const snap = await loadSnapshot();
    if (snap) g.__lexiHq.state = migrateChannels({ ...seedState(), ...snap });
  }
  migrateChannels(g.__lexiHq.state);
  ensureLedger(g.__lexiHq.state);
  if (!g.__lexiHq.state.salesChannelMeta) g.__lexiHq.state.salesChannelMeta = emptySalesMeta();
  if (!g.__lexiHq.state.cjPrivateInventory) g.__lexiHq.state.cjPrivateInventory = [];
  if (!g.__lexiHq.state.cjSourcingTickets) g.__lexiHq.state.cjSourcingTickets = [];
  return g.__lexiHq.state;
}

/** 상태 변경 트랜잭션 헬퍼 — 변경 후 스냅샷 persist 예약 */
export async function mutate<T>(fn: (s: HqState) => T | Promise<T>): Promise<T> {
  const s = await getState();
  const r = await fn(s);
  // 서버리스는 응답 후 함수가 정지돼 지연 타이머가 실행되지 않는다
  if (process.env.VERCEL) await persistNow();
  else schedulePersist();
  return r;
}

export function nextId(s: HqState) {
  return ++s.seq;
}

export function audit(
  s: HqState,
  entity: string,
  entityId: number | string,
  toState: string,
  actor: string,
  fromState?: string,
  meta?: Record<string, unknown>,
) {
  s.audit.unshift({
    id: nextId(s), entity, entityId: String(entityId),
    fromState, toState, actor, meta, createdAt: now(),
  });
  if (s.audit.length > 500) s.audit.length = 500;
  sealFromAudit(s, entity, String(entityId), toState, actor, meta);
}

export const iso = now;
