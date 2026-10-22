/** P1 Ingest: 공급처 → supplier_products upsert — 스펙 §2 */
import { audit, iso, mutate, nextId } from "@/lib/hq/store";
import type { Supplier, SupplierProduct } from "@/lib/hq/types";
import { getConnector } from "./registry";
import { contentHashOf, type RemoteProduct } from "./types";

function upsertRemote(
  s: { supplierProducts: SupplierProduct[] },
  supplier: Supplier,
  remote: RemoteProduct,
  genId: () => number,
): "created" | "updated" | "unchanged" {
  const hash = contentHashOf(remote);
  const existing = s.supplierProducts.find(
    (p) => p.supplierId === supplier.id && p.externalId === remote.externalId,
  );
  if (!existing) {
    s.supplierProducts.push({
      id: genId(),
      supplierId: supplier.id,
      externalId: remote.externalId,
      url: remote.url,
      rawTitle: remote.title,
      rawDescriptionHtml: remote.descriptionHtml,
      rawCategoryPath: remote.categoryPath,
      priceOriginal: remote.price,
      currency: remote.currency,
      stock: remote.stock,
      sellerName: remote.sellerName,
      sellerInfo: remote.sellerInfo,
      images: remote.images,
      optionSchema: remote.optionSchema,
      contentHash: hash,
      fetchedAt: iso(),
      syncStatus: "ok",
    });
    return "created";
  }
  if (existing.contentHash === hash) {
    existing.fetchedAt = iso();
    existing.syncStatus = "ok";
    return "unchanged";
  }
  Object.assign(existing, {
    rawTitle: remote.title,
    priceOriginal: remote.price,
    stock: remote.stock,
    images: remote.images,
    contentHash: hash,
    fetchedAt: iso(),
    syncStatus: "stale", // 연결된 리스팅 재검토 필요 표시
  });
  return "updated";
}

export async function syncSupplier(supplierCode: string, opts?: { pages?: number; category?: string }) {
  return mutate(async (s) => {
    const supplier = s.suppliers.find((x) => x.code === supplierCode);
    if (!supplier) throw new Error(`unknown supplier: ${supplierCode}`);
    const connector = getConnector(supplier.code);
    if (!connector) throw new Error(`no connector for: ${supplier.code}`);

    const stats = { created: 0, updated: 0, unchanged: 0 };
    const pages = opts?.pages ?? 3;
    for (let page = 1; page <= pages; page++) {
      const batch = await connector.listProducts({ page, category: opts?.category });
      if (batch.length === 0) break;
      for (const remote of batch) {
        stats[upsertRemote(s, supplier, remote, () => nextId(s))]++;
      }
    }
    audit(s, "supplier", supplier.id, "synced", "system", undefined, stats);
    return { supplier: supplier.code, ...stats };
  });
}

export async function importByUrl(supplierCode: string, url: string) {
  return mutate(async (s) => {
    const supplier = s.suppliers.find((x) => x.code === supplierCode);
    if (!supplier) throw new Error(`unknown supplier: ${supplierCode}`);
    const connector = getConnector(supplier.code);
    if (!connector?.importByUrl) throw new Error("importByUrl unsupported");
    const remote = await connector.importByUrl(url);
    if (!remote) throw new Error("import failed");
    const result = upsertRemote(s, supplier, remote, () => nextId(s));
    audit(s, "supplier_product", remote.externalId, `import:${result}`, "admin", undefined, { url });
    return { result, externalId: remote.externalId };
  });
}
