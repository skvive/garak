import { getState } from "@/lib/hq/store";
import { getConnector } from "@/lib/sourcing/registry";
import { getSourcingPlatform, type SourcingPlatformCode } from "@/lib/sourcing/platforms";
import { listCatalogProviderSeeds, upsertCatalogMeta, type CatalogProviderSeed } from "./index-store";

export type CatalogProvider = {
  id: string;
  platformCode: string;
  companyName: string;
  phone: string | null;
  email: string | null;
  homepage: string | null;
  productCount: number;
  thumbUrl: string | null;
  warehouse: string | null;
};

type Meta = {
  supplierId?: unknown;
  warehouse?: unknown;
  phone?: unknown;
  email?: unknown;
  homepage?: unknown;
};

function str(v: unknown): string | null {
  if (typeof v === "number" && Number.isFinite(v) && v !== 0) return String(v);
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t === "0") return null;
  return t;
}

function providerKey(sellerName: string | null, meta: Meta | null): string {
  const sid = str(meta?.supplierId);
  if (sid) return `id:${sid}`;
  const name = (sellerName ?? "").trim();
  return name ? `name:${name.toLowerCase()}` : "unknown";
}

function asMeta(raw: unknown): Meta {
  return raw && typeof raw === "object" ? (raw as Meta) : {};
}

function companyLabel(sellerName: string | null, meta: Meta): string {
  const name = (sellerName ?? "").trim();
  const sid = str(meta.supplierId);
  const generic = !name || /^cjdropshipping$/i.test(name) || /^cj warehouse/i.test(name) || /^cj supplier /i.test(name);
  if (!generic) return name;
  if (sid) return `CJ 셀러 ${sid.length > 8 ? sid.slice(-8) : sid}`;
  return name || "미확인 공급처";
}

async function seedsFromSourcing(platformCode: string): Promise<CatalogProviderSeed[]> {
  const s = await getState();
  const platform = s.suppliers.find((x) => x.code === platformCode);
  if (!platform) return [];
  return s.supplierProducts
    .filter((p) => p.supplierId === platform.id)
    .map((p) => ({
      sellerName: p.sellerName ?? null,
      rawMeta: p.sellerInfo ?? {},
      sourceUrl: p.url ?? null,
      thumbUrl: Array.isArray(p.images) && p.images[0]?.url ? String(p.images[0].url) : null,
    }));
}

export async function listProviders(platformCode: SourcingPlatformCode): Promise<{
  platform: ReturnType<typeof getSourcingPlatform>;
  providers: CatalogProvider[];
}> {
  const platform = getSourcingPlatform(platformCode);
  if (!platform.connected) {
    return { platform, providers: [] };
  }

  const seeds = [...(await listCatalogProviderSeeds(platformCode)), ...(await seedsFromSourcing(platformCode))];
  const map = new Map<string, CatalogProvider>();

  for (const row of seeds) {
    const meta = asMeta(row.rawMeta);
    const key = providerKey(row.sellerName, meta);
    const name = companyLabel(row.sellerName, meta);
    const prev = map.get(key);
    if (prev) {
      prev.productCount += 1;
      if (!prev.thumbUrl && row.thumbUrl) prev.thumbUrl = row.thumbUrl;
      continue;
    }
    map.set(key, {
      id: key,
      platformCode,
      companyName: name,
      phone: str(meta.phone),
      email: str(meta.email),
      homepage: str(meta.homepage),
      productCount: 1,
      thumbUrl: row.thumbUrl,
      warehouse: str(meta.warehouse),
    });
  }

  const providers = [...map.values()].sort((a, b) => b.productCount - a.productCount || a.companyName.localeCompare(b.companyName));
  return { platform, providers };
}

/** 커넥터 상품목록으로 셀러명·supplierId를 카탈로그에 다시 심는다. */
export async function refreshProviderMeta(platformCode: SourcingPlatformCode): Promise<{ updated: number; scanned: number }> {
  const platform = getSourcingPlatform(platformCode);
  if (!platform.connected) return { updated: 0, scanned: 0 };

  const connector = getConnector(platformCode);
  if (!connector) return { updated: 0, scanned: 0 };

  let scanned = 0;
  let updated = 0;
  for (let page = 1; page <= 6; page++) {
    let batch: Awaited<ReturnType<NonNullable<typeof connector>["listProducts"]>> = [];
    try {
      batch = await connector.listProducts({ page, pageSize: 50 });
    } catch {
      break;
    }
    if (!batch.length) break;
    for (const remote of batch) {
      scanned += 1;
      const result = await upsertCatalogMeta({
        supplierCode: platformCode,
        externalId: remote.externalId,
        title: remote.title,
        categoryPath: remote.categoryPath,
        price: remote.price,
        currency: remote.currency,
        // 리스트 stock/listedNum은 미검증 — 크롤과 동일하게 생략해 검증 재고 보존
        primaryThumbUrl: remote.images[0]?.url ?? null,
        sellerName: remote.sellerName ?? null,
        sourceUrl: remote.url ?? null,
        rawMeta: {
          categoryPath: remote.categoryPath,
          supplierId: remote.sellerInfo?.supplierId ?? null,
          warehouse: remote.sellerInfo?.warehouse ?? null,
          phone: remote.sellerInfo?.phone ?? null,
          email: remote.sellerInfo?.email ?? null,
          homepage: remote.sellerInfo?.homepage ?? null,
        },
      });
      if (result !== "unchanged") updated += 1;
    }
  }
  return { updated, scanned };
}
