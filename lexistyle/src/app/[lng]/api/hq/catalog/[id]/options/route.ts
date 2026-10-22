import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { getCatalogById, patchCatalogRawMeta } from "@/lib/catalog/index-store";
import { computeSellPrice } from "@/lib/hq/types";
import { fetchCjProductOptions } from "@/lib/sourcing/connectors/cjdropshipping";
import { mapCjVariantsToOptions } from "@/lib/catalog/cj-options";

export const dynamic = "force-dynamic";

/** GET — CJ variants/창고 캐시 + 기본 판매가 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await hqActor(req))) return unauthorized();
  const id = Number((await ctx.params).id);
  if (!Number.isFinite(id)) return bad("invalid id");
  const cat = await getCatalogById(id);
  if (!cat) return bad("catalog not found", 404);

  const cost = cat.minPrice != null ? Number(cat.minPrice) : 0;
  const sellPriceUsd = computeSellPrice(Number.isFinite(cost) ? cost : 0);
  const pid = cat.externalId ?? (cat as { supplierSku?: string }).supplierSku;
  let options: { sku?: string; name: string; stock: number; costUsd?: number }[] = [];
  let warehouses: { name: string; qty: number }[] = [];
  let note = "cache";

  const cached = cat.rawMeta && typeof cat.rawMeta === "object" ? (cat.rawMeta as Record<string, unknown>) : {};
  if (Array.isArray(cached.variants) && cached.variants.length) {
    options = mapCjVariantsToOptions(cached.variants, Number.isFinite(cost) ? cost : 0);
    warehouses = Array.isArray(cached.warehouses)
      ? (cached.warehouses as { name: string; qty: number }[])
      : [];
  }

  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  if (pid && (refresh || !options.length)) {
    try {
      const fetched = await fetchCjProductOptions(String(pid));
      options = fetched.options;
      warehouses = fetched.warehouses;
      note = fetched.mock ? "cj-mock" : "cj-live";
      await patchCatalogRawMeta(id, {
        variants: fetched.rawVariants,
        warehouses: fetched.warehouses,
        optionsCachedAt: new Date().toISOString(),
      });
    } catch {
      note = options.length ? "cache-fallback" : "cj-unavailable";
    }
  }

  if (!options.length) {
    options = [{ name: "기본", stock: 10, costUsd: Number.isFinite(cost) ? cost : undefined }];
  }

  return NextResponse.json({
    catalogId: id,
    sellPriceUsd,
    stockDefault: 10,
    options,
    warehouses,
    note,
  });
}
