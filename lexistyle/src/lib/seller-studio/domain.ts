import { z } from "zod";
import { parse } from "csv-parse/sync";

const money = z.number().finite().min(0).max(1_000_000);
export const productInput = z.object({
  sku: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(6000).default(""),
  englishTitle: z.string().trim().max(120).default(""),
  englishDescription: z.string().trim().max(3000).default(""),
  imageUrls: z.array(z.string().url().max(2000)).max(9).default([]),
  variants: z.array(z.object({ sku: z.string().trim().min(1).max(50), color: z.string().trim().max(30), size: z.string().trim().max(30), stock: z.number().int().min(0).max(100000) })).min(1).max(50),
  costSgd: money.default(0), priceSgd: money.default(0), shippingSgd: money.default(0),
  feePercent: z.number().finite().min(0).max(99).default(0),
  weightKg: z.number().finite().min(0).max(100).default(0),
  categoryId: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
  logisticId: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
  brand: z.string().trim().max(100).default(""), rightsConfirmed: z.boolean().default(false),
});
export type ProductInput = z.infer<typeof productInput>;
export type Product = ProductInput & {
  id: string; revision: number; status: "draft" | "approved" | "publishing" | "published" | "attention";
  source: "manual" | "csv" | "catalog"; engine?: string; updatedAt: string;
  publication?: { shopId: string; itemId?: number; error?: string };
};
export type Order = { orderSn: string; status: string; currency: string; total: number; shopId: string;
  items: { name: string; sku: string; quantity: number; match: "matched" | "unmatched" | "ambiguous"; supplierSku?: string }[] };

export class StudioError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function margin(p: ProductInput) {
  return Math.round((p.priceSgd * (1 - p.feePercent / 100) - p.costSgd - p.shippingSgd) * 100) / 100;
}
export function reviewIssues(p: ProductInput) {
  const issues: string[] = [];
  if (!p.englishTitle || !p.englishDescription) issues.push("영문 상품명과 설명을 입력하세요.");
  if (/[가-힣]/.test(p.englishTitle + p.englishDescription)) issues.push("싱가포르용 영문 내용에 한글이 남아 있습니다.");
  if (!p.imageUrls.length || p.imageUrls.some(u => !u.startsWith("https://"))) issues.push("HTTPS 상품 이미지가 필요합니다.");
  if (!p.rightsConfirmed) issues.push("상품 정보·이미지 사용 권한을 확인하세요.");
  if (!p.priceSgd || margin(p) <= 0) issues.push("배송비·수수료 반영 후 예상 이익이 0보다 커야 합니다.");
  if (!p.weightKg || !p.categoryId || !p.logisticId) issues.push("실측 무게, Shopee 카테고리 ID, 배송 채널 ID가 필요합니다.");
  if (!p.variants.some(v => v.stock > 0)) issues.push("판매 가능한 실제 재고를 입력하세요.");
  if (new Set(p.variants.map(v => v.sku)).size !== p.variants.length) issues.push("옵션 SKU가 중복됩니다.");
  if (new Set(p.variants.map(v => JSON.stringify([v.color || "Standard", v.size || "One size"]))).size !== p.variants.length) issues.push("색상·사이즈 조합이 중복됩니다.");
  if (p.variants.some(v => /[가-힣]/.test(v.color + v.size))) issues.push("색상·사이즈도 영문으로 입력하세요.");
  return issues;
}
export function requireRevision(p: Product, revision: number) {
  if (p.revision !== revision) throw new StudioError("다른 창에서 상품이 변경되었습니다. 새로고침 후 다시 검토하세요.", 409);
}
export function matchSku(sku: string, products: Product[]): Pick<Order["items"][number], "match" | "supplierSku"> {
  if (!sku) return { match: "unmatched" };
  const matches = products.flatMap(p => p.variants.filter(v => v.sku === sku || (p.sku === sku && p.variants.length === 1)));
  return matches.length === 1 ? { match: "matched", supplierSku: matches[0].sku } : { match: matches.length ? "ambiguous" : "unmatched" };
}

/** One CSV row per variation; repeated product SKU groups variations without guessing stock. */
export function productsFromCsv(csv: string): ProductInput[] {
  if (Buffer.byteLength(csv) > 1_000_000) throw new StudioError("CSV는 1MB 이하로 업로드하세요.");
  const rows = parse(csv, { columns: true, bom: true, skip_empty_lines: true, trim: true, max_record_size: 20000 }) as Record<string, string>[];
  if (!rows.length || rows.length > 500) throw new StudioError("CSV는 1~500행까지 지원합니다.");
  const grouped = new Map<string, ProductInput>();
  for (const [i, row] of rows.entries()) {
    const num = (key: string) => row[key]?.trim() ? Number(row[key]) : 0;
    const candidate = productInput.safeParse({
      sku: row.sku, title: row.title, description: row.description || "", englishTitle: row.englishTitle || "", englishDescription: row.englishDescription || "",
      imageUrls: (row.imageUrls || "").split("|").map(s => s.trim()).filter(Boolean),
      variants: [{ sku: row.variantSku || row.sku, color: row.color || "", size: row.size || "", stock: num("stock") }],
      costSgd: num("costSgd"), priceSgd: num("priceSgd"), shippingSgd: num("shippingSgd"), feePercent: num("feePercent"), weightKg: num("weightKg"), categoryId: num("categoryId"), logisticId: num("logisticId"), brand: row.brand || "", rightsConfirmed: false,
    });
    if (!candidate.success) throw new StudioError(`CSV ${i + 2}행: ${candidate.error.issues.map(e => e.path.join(".") + " " + e.message).join(", ")}`);
    const p = candidate.data;
    const prior = grouped.get(p.sku);
    if (prior) {
      const { variants: _a, ...a } = prior;
      const { variants: _b, ...b } = p;
      if (JSON.stringify(a) !== JSON.stringify(b)) throw new StudioError(`CSV ${i + 2}행: 같은 상품 SKU의 상품 정보·가격이 다릅니다.`);
      prior.variants.push(...p.variants);
      if (prior.variants.length > 50 || new Set(prior.variants.map(v => v.sku)).size !== prior.variants.length) throw new StudioError(`CSV ${i + 2}행: 옵션 SKU 중복 또는 50개 초과.`);
    } else grouped.set(p.sku, p);
  }
  return [...grouped.values()];
}
