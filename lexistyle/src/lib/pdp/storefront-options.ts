import { and, eq, or, sql } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { catalogIndex, products } from "@/db/schema";

/** 스토어프론트 주문 옵션 — sku = 공급처 옵션 키(CJ vid). 고객 화면에는 label/dims만 노출 */
export type StoreOption = { sku: string; label: string; dims: string[] };

const COLOR_KO: Record<string, string> = {
  black: "블랙", white: "화이트", apricot: "베이지", beige: "베이지", khaki: "카키", gray: "그레이", grey: "그레이",
  navy: "네이비", blue: "블루", brown: "브라운", coffee: "브라운", camel: "카멜", green: "그린", red: "레드",
  pink: "핑크", purple: "퍼플", yellow: "옐로우", orange: "오렌지", cream: "크림", ivory: "아이보리",
};
const koDim = (value: unknown) => {
  const text = String(value ?? "").trim();
  return COLOR_KO[text.toLowerCase()] ?? text;
};

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
};

function variantDims(row: Record<string, unknown>): string[] {
  const color = row.variantColor ?? row.color ?? row.colour ?? row.colorName;
  const size = row.variantSize ?? row.size ?? row.sizeName;
  if (color || size) return [color, size].map(koDim).filter(Boolean);

  const name = firstText(row.variantNameEn, row.variantName, row.variantKey, row.name);
  const primary = name.split(/\s*(?:\/|\||,|_)\s*/).filter(Boolean);
  const parts = primary.length > 1 ? primary : name.split(/\s*-\s*/).filter(Boolean);
  return parts.slice(0, 3).map(koDim).filter(Boolean);
}

/** Neon catalog_index.raw_meta의 CJ variants를 구매 옵션으로 변환한다. 외부 API 호출은 하지 않는다. */
export function storeOptionsFromRawMeta(rawMeta: unknown): StoreOption[] {
  if (!rawMeta || typeof rawMeta !== "object") return [];
  const variants = (rawMeta as { variants?: unknown }).variants;
  if (!Array.isArray(variants)) return [];

  const seen = new Set<string>();
  const options = variants.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const row = value as Record<string, unknown>;
    const sku = firstText(row.vid, row.variantSku, row.sku);
    const dims = variantDims(row);
    if (!sku || !dims.length || seen.has(sku)) return [];
    seen.add(sku);
    return [{ sku, label: dims.join(" / "), dims }];
  });
  return options.length >= 2 ? options : [];
}

/** 옵션 2개 이상일 때만 반환(단일옵션 상품은 선택 UI 없음). Neon 캐시만 읽는다. */
export async function getStorefrontOptions(slug: string): Promise<StoreOption[]> {
  if (!hasDb()) return [];
  try {
    // slug 끝의 CJ pid 로 (supplier_code, external_id) 유니크 인덱스를 타고, 큰 raw_meta 에서 variants 만 읽는다
    const pid = slug.match(/(\d{15,25})$/)?.[1];
    if (pid) {
      const [hit] = await db()
        .select({ variants: sql<unknown>`${catalogIndex.rawMeta}->'variants'` })
        .from(catalogIndex)
        .where(and(eq(catalogIndex.supplierCode, "cjdropshipping"), eq(catalogIndex.externalId, pid)))
        .limit(1);
      if (hit) return storeOptionsFromRawMeta({ variants: hit.variants });
    }
    const [row] = await db()
      .select({ rawMeta: catalogIndex.rawMeta })
      .from(catalogIndex)
      .leftJoin(products, eq(catalogIndex.productId, products.id))
      .where(or(eq(products.slug, slug), eq(catalogIndex.externalId, slug)))
      .limit(1);
    return storeOptionsFromRawMeta(row?.rawMeta);
  } catch {
    return [];
  }
}

export async function findStorefrontOption(slug: string, sku: string): Promise<StoreOption | undefined> {
  return (await getStorefrontOptions(slug)).find((option) => option.sku === sku);
}
