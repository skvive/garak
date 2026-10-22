/** CJ variants → shelf/export 옵션 (이름·SKU·원가·재고·색상/사이즈) */
import { computeSellPrice } from "@/lib/hq/types";
import type { ListingOption } from "@/lib/hq/types";
import { fetchCjProductOptions } from "@/lib/sourcing/connectors/cjdropshipping";
import { getCatalogById, patchCatalogRawMeta } from "@/lib/catalog/index-store";

export type CjShelfOption = {
  sku?: string;
  name: string;
  stock: number;
  costUsd?: number;
  attributes?: Record<string, string>;
};

function stockFromVariantRow(row: Record<string, unknown>): number {
  const invs = (row.inventories ?? row.inventoryList ?? []) as Record<string, unknown>[];
  if (Array.isArray(invs) && invs.length) {
    const sum = invs.reduce((a, x) => a + (Number(x.inventory ?? x.totalInventory) || 0), 0);
    if (sum > 0) return sum;
  }
  if (row.inventory != null || row.stock != null || row.qty != null) {
    const n = Number(row.inventory ?? row.stock ?? row.qty);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 10;
}

/** CJ variantName → color / size (예: "Black / M", "Red-S") */
export function parseVariantAttributes(name: string): Record<string, string> {
  const attrs: Record<string, string> = { variant: name.trim() };
  const slash = name.split(/\s*[/|,_]\s*/).map((s) => s.trim()).filter(Boolean);
  if (slash.length === 2) {
    attrs.color = slash[0]!;
    attrs.size = slash[1]!;
    return attrs;
  }
  const dash = name.trim().match(/^(.+?)(?:\s*[-–]\s*|\s+)(\d?X{0,3}[SML]|\d{2,3}|FREE)$/i);
  if (dash) {
    attrs.color = dash[1]!.trim();
    attrs.size = dash[2]!.trim();
  }
  return attrs;
}

function explicitVariantAttributes(row: Record<string, unknown>, name: string): Record<string, string> {
  const parsed = parseVariantAttributes(name);
  const color = row.variantColor ?? row.color ?? row.colour ?? row.colorName;
  const size = row.variantSize ?? row.size ?? row.sizeName;
  if (color != null && String(color).trim()) parsed.color = String(color).trim();
  if (size != null && String(size).trim()) parsed.size = String(size).trim();
  return parsed;
}

export function mapCjVariantsToOptions(variants: unknown[], fallbackCostUsd = 0): CjShelfOption[] {
  if (!Array.isArray(variants) || !variants.length) return [];
  return variants.slice(0, 40).map((v, i) => {
    const row = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
    const cost =
      row.variantSellPrice != null
        ? Number(row.variantSellPrice)
        : fallbackCostUsd > 0
          ? fallbackCostUsd
          : undefined;
    const name = String(row.variantNameEn ?? row.variantName ?? row.variantKey ?? row.name ?? row.sku ?? `옵션 ${i + 1}`);
    return {
      sku: row.vid != null ? String(row.vid) : row.sku != null ? String(row.sku) : undefined,
      name,
      stock: stockFromVariantRow(row),
      costUsd: Number.isFinite(cost) ? cost : undefined,
      attributes: explicitVariantAttributes(row, name),
    };
  });
}

/** CJ variantNameEn에 붙는 상품명(모든 옵션 공통 단어 접두어) 제거 — "Men's ... Coat Black M" → "Black M" */
function stripCommonPrefix(names: string[]): string[] {
  if (names.length < 2) return names;
  const words = names.map((n) => n.trim().split(/\s+/));
  let k = 0;
  while (words.every((w) => w.length > k + 1 && w[k] === words[0]![k])) k++;
  return k ? words.map((w) => w.slice(k).join(" ")) : names;
}

export function cjOptionsToListingOptions(
  options: CjShelfOption[],
  fallbackCostUsd: number,
): ListingOption[] {
  const names = stripCommonPrefix(options.map((o) => o.name));
  return options.map((o, i) => ({
    name: names[i]!,
    sku: o.sku,
    stock: o.stock,
    priceUsd: computeSellPrice(o.costUsd ?? fallbackCostUsd),
    attributes: {
      ...parseVariantAttributes(names[i]!),
      ...(o.attributes?.color ? { color: o.attributes.color } : {}),
      ...(o.attributes?.size ? { size: o.attributes.size } : {}),
    },
  }));
}

/** Export 직전 — CJ API live fetch → catalog rawMeta 캐시 → variant 캐시 순 */
export async function resolveCjExportOptions(catalogId: number): Promise<ListingOption[] | undefined> {
  const cat = await getCatalogById(catalogId);
  if (!cat) return undefined;
  const fallbackCost = cat.minPrice != null ? Number(cat.minPrice) : 0;
  const pid = cat.externalId ?? (cat as { supplierSku?: string }).supplierSku;
  let shelfOpts: CjShelfOption[] = [];

  if (pid) {
    try {
      const fetched = await fetchCjProductOptions(String(pid));
      if (fetched.rawVariants.length) {
        // 원본 variant 필드(color/size/variantKey)를 보존해야 쿠팡 구매옵션으로 분리할 수 있다.
        shelfOpts = mapCjVariantsToOptions(fetched.rawVariants, fallbackCost);
        await patchCatalogRawMeta(catalogId, {
          variants: fetched.rawVariants,
          warehouses: fetched.warehouses,
          optionsCachedAt: new Date().toISOString(),
        });
      } else if (fetched.options.length) {
        shelfOpts = fetched.options;
      }
    } catch {
      /* cache fallback */
    }
  }

  if (!shelfOpts.length) {
    const cached = cat.rawMeta && typeof cat.rawMeta === "object" ? (cat.rawMeta as { variants?: unknown[] }).variants : [];
    shelfOpts = mapCjVariantsToOptions(Array.isArray(cached) ? cached : [], fallbackCost);
  }

  if (!shelfOpts.length) return undefined;
  return cjOptionsToListingOptions(shelfOpts, fallbackCost);
}
