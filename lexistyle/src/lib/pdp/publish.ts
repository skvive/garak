/**
 * "출력" — HQ에서 저장한 PDP 문서를 쇼핑몰 상품페이지에 반영한다.
 * 저장(초안)과 출력(공개)을 분리: 출력 시점의 렌더 결과를 body.published 스냅샷으로 고정하고,
 * 스토어프론트(resolveStorefrontPdp)는 이 스냅샷이 있으면 정적 SAMPLE3 오버라이드보다 우선해서 보여준다.
 */
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { catalogIndex, contentDocuments, products } from "@/db/schema";
import { getPdpDocument, patchPdpBody } from "./generate";
import type { PdpStructured } from "./ruleset";

export type PublishedPdp = {
  html: string;
  structured?: PdpStructured | null;
  assetUrls?: string[];
  at: string;
};

export async function publishPdpToStorefront(documentId: number, by: string): Promise<{ slug: string; productId: number }> {
  if (!hasDb()) throw new Error("DB 연결이 있어야 쇼핑몰에 출력할 수 있습니다");
  const doc = await getPdpDocument(documentId);
  if (!doc) throw new Error("문서를 찾을 수 없습니다");
  const html = (doc as { renderedHtml?: string | null }).renderedHtml?.trim();
  if (!html) throw new Error("렌더된 상품페이지가 없습니다 — 먼저 저장하세요");

  const [link] = await db()
    .select({ productId: catalogIndex.productId })
    .from(catalogIndex)
    .where(and(eq(catalogIndex.documentId, documentId), isNotNull(catalogIndex.productId)))
    .orderBy(desc(catalogIndex.id))
    .limit(1);
  if (!link?.productId) throw new Error("이 문서에 연결된 쇼핑몰 상품이 없습니다 — Import로 상품을 등록한 뒤 출력하세요");
  const [product] = await db().select({ id: products.id, slug: products.slug }).from(products).where(eq(products.id, link.productId)).limit(1);
  if (!product) throw new Error("연결된 상품이 삭제되었습니다");

  const body = (doc.body ?? {}) as { structured?: PdpStructured; assetUrls?: string[] };
  const published: PublishedPdp = { html, structured: body.structured ?? null, assetUrls: body.assetUrls, at: new Date().toISOString() };
  await patchPdpBody(documentId, { published, publishedBy: by });
  if (body.structured?.title) {
    await db().update(products).set({ name: body.structured.title }).where(eq(products.id, product.id));
  }
  return { slug: product.slug, productId: product.id };
}

/**
 * 스토어프론트 노출 게이트 — 본문 전체를 읽지 않고 두 키만 조회한다.
 * published: 출력된 스냅샷 / hold: 스튜디오에서 저장만 했고 아직 출력하지 않은 초안(쇼핑몰에 노출 금지)
 */
export async function getPdpGate(documentId: number): Promise<{ published: PublishedPdp | null; hold: boolean }> {
  if (!hasDb()) return { published: null, hold: false };
  try {
    const { sql } = await import("drizzle-orm");
    const [row] = await db()
      .select({
        published: sql<PublishedPdp | null>`${contentDocuments.body}->'published'`,
        draft: sql<string | null>`${contentDocuments.body}->>'studioDraft'`,
      })
      .from(contentDocuments)
      .where(eq(contentDocuments.id, documentId))
      .limit(1);
    const p = row?.published;
    const published = p && typeof p.html === "string" && p.html.trim() ? p : null;
    return { published, hold: !published && row?.draft === "true" };
  } catch {
    return { published: null, hold: false };
  }
}
