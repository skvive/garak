/** CJ list/detail Zod 계약 — P0 */
import { z } from "zod";

export const cjListItemSchema = z
  .object({
    pid: z.union([z.string(), z.number()]).optional(),
    productId: z.union([z.string(), z.number()]).optional(),
    productNameEn: z.string().optional(),
    productName: z.string().optional(),
    productUrl: z.string().optional(),
    description: z.string().optional(),
    categoryName: z.string().optional(),
    sellPrice: z.union([z.string(), z.number()]).optional(),
    price: z.union([z.string(), z.number()]).optional(),
    listedNum: z.union([z.string(), z.number()]).optional(),
    stock: z.union([z.string(), z.number()]).optional(),
    productImage: z.union([z.string(), z.array(z.string())]).optional(),
    supplierName: z.unknown().optional(),
    sourceFrom: z.unknown().optional(),
  })
  .passthrough();

export const cjListDataSchema = z
  .object({
    list: z.array(cjListItemSchema).optional(),
    pageNum: z.union([z.string(), z.number()]).optional(),
    pageSize: z.union([z.string(), z.number()]).optional(),
    totalRecords: z.union([z.string(), z.number()]).optional(),
    totalPages: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

export type CjListItem = z.infer<typeof cjListItemSchema>;

export function parseCjPrice(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v !== "string") return 0;
  const nums = v.match(/\d+(\.\d+)?/g);
  if (!nums?.length) return 0;
  return Math.min(...nums.map(Number).filter(Number.isFinite));
}

export function catalogHash(input: {
  title: string;
  price: number;
  stock: number;
  thumb?: string | null;
}): string {
  const basis = `${input.title}|${input.price}|${input.stock}|${input.thumb ?? ""}`;
  let h = 0;
  for (let i = 0; i < basis.length; i++) h = (h * 31 + basis.charCodeAt(i)) | 0;
  return `h${(h >>> 0).toString(36)}`;
}
