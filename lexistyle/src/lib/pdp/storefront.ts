/**
 * 스토어프론트 PDP 해석 — HQ linkrcode/SAMPLE3 문서를 상품 상세에 연결.
 * 우선순위: catalog.documentId → body.productId → SAMPLE3 폴백 렌더
 */
import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { catalogIndex, products as productsTable } from "@/db/schema";
import type { Product } from "@/lib/dummy-data";
import { sample3ConceptSpec } from "@/lib/hq/seeds/sample3-style";
import { getPdpByProductId, getPdpDocument, renderPdp } from "@/lib/pdp/generate";
import type { PdpStructured } from "@/lib/pdp/ruleset";
import { localStore } from "@/lib/local-store";
import { getSample3StorefrontOverride } from "./sample3-overrides";
import { getPdpGate } from "./publish";
import { getSample3BatchOverride } from "./sample3-batch-overrides";

export type StorefrontPdp = {
  html: string;
  source: "document" | "sample3-fallback";
  documentId?: number;
  structured?: PdpStructured | null;
  assetUrls: string[];
};

async function productPdpRef(slug: string): Promise<{ productId: number; documentId: number | null } | null> {
  if (!hasDb()) return null;
  try {
    const [product] = await db()
      .select({ productId: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.slug, slug))
      .limit(1);
    if (!product) return null;

    // A product can have stale catalog rows after an import/reconciliation run.
    // Resolve the PDP by the CJ external id encoded in the canonical slug first;
    // never let an arbitrary duplicate row decide which document is rendered.
    const externalId = slug.match(/([0-9]{16,})$/)?.[1];
    if (externalId) {
      const [canonical] = await db()
        .select({ documentId: catalogIndex.documentId })
        .from(catalogIndex)
        .where(
          and(
            eq(catalogIndex.productId, product.productId),
            eq(catalogIndex.externalId, externalId),
            isNotNull(catalogIndex.documentId),
          ),
        )
        .orderBy(asc(catalogIndex.id))
        .limit(1);
      if (canonical) return { productId: product.productId, documentId: canonical.documentId };
    }

    const [fallback] = await db()
      .select({ documentId: catalogIndex.documentId })
      .from(catalogIndex)
      .where(and(eq(catalogIndex.productId, product.productId), isNotNull(catalogIndex.documentId)))
      .orderBy(asc(catalogIndex.id))
      .limit(1);
    return { productId: product.productId, documentId: fallback?.documentId ?? null };
  } catch {
    return null;
  }
}

/** 스토어프론트 PDP 본문(story) — 전 SKU 공통 직구 고지 (간략) */
export const STOREFRONT_DIRECT_IMPORT_NOTICE_HTML =
  '<p>본 상품은 LEXI 소싱으로 직구하는 해외 상품입니다. 통관을 위해 수취인 실명과 개인통관고유부호가 필요합니다.</p><p>상품 하자가 아닌 경우, 반품 시 왕복 국제 배송비 및 관부과세는 구매자 부담입니다.</p>';

/** USP(하단 안전바) 문구 */
export const STOREFRONT_USP_TEXT = "해외 직배송 상품 · 구매 전 꼭 확인하세요";

/** 상세페이지 하단 6항목 고지문 HTML */
export const STOREFRONT_6NOTICE_HTML =
  '<section style="border-top:1px solid #e7e5e4; padding:28px 0;"><h2 style="font-size:18px; font-weight:700; margin-bottom:20px;">[구매 전 확인사항]</h2>' +
  '<div style="display:flex; flex-direction:column; gap:24px;">' +
  // 1
  '<div style="display:flex; gap:12px;"><span style="flex-shrink:0; width:24px; height:24px; border-radius:50%; background:#f0f0ed; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#78716c;">1</span><div><p style="font-weight:600; margin:0 0 6px;">[통관 및 본인인증 안내]</p><p style="margin:0; color:#78716c; font-size:13px; line-height:1.7;">본 상품은 해외 직배송 상품으로, 관세청 통관을 위해 수취인의 실명과 개인통관고유부호가 반드시 필요합니다. 타인의 통관부호 입력 또는 수취인명 불일치 시 통관이 지연되거나 보류될 수 있으며, 이로 인한 배송 지연 및 발생 비용은 판매자가 책임지지 않습니다.</p></div></div>' +
  // 2
  '<div style="display:flex; gap:12px;"><span style="flex-shrink:0; width:24px; height:24px; border-radius:50%; background:#f0f0ed; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#78716c;">2</span><div><p style="font-weight:600; margin:0 0 6px;">[통관 관련 안내 및 면책]</p><p style="margin:0; color:#78716c; font-size:13px; line-height:1.7;">자사는 정식 통관이 가능한 상품만을 안내하나, 관세청 통관 기준 변경 또는 개인별 수량·성분 제한 초과로 발생하는 통관 폐기 및 반송 비용은 구매자 부담입니다. (구매 전 성분 및 관련 규정을 직접 확인해 주시기 바랍니다.)</p></div></div>' +
  // 3
  '<div style="display:flex; gap:12px;"><span style="flex-shrink:0; width:24px; height:24px; border-radius:50%; background:#f0f0ed; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#78716c;">3</span><div><p style="font-weight:600; margin:0 0 6px;">[교환 / 반품 안내]</p><p style="margin:0; color:#78716c; font-size:13px; line-height:1.7;">해외 공급처 정책에 따라 제품 자체 하자가 아닌 단순 변심, 사이즈/색상 착오, 미세한 실밥 또는 모니터 해상도 차이로 인한 반품 시, 왕복 해외 배송비 및 현지 반품 수수료, 관부과세 등이 청구됩니다. 상품 개봉, 태그 훼손, 사용 흔적이 있는 경우에는 해외 공급처의 반품 거부 정책에 따라 교환/반품이 불가능합니다.</p></div></div>' +
  // 4
  '<div style="display:flex; gap:12px;"><span style="flex-shrink:0; width:24px; height:24px; border-radius:50%; background:#f0f0ed; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#78716c;">4</span><div><p style="font-weight:600; margin:0 0 6px;">[배송 기간 안내]</p><p style="margin:0; color:#78716c; font-size:13px; line-height:1.7;">본 상품은 주문 확인 후 해외 현지에서 발송되어 평균 7~14일 정도 소요됩니다. 현지 출고지 사정, 기상 악화, 항공편 지연, 관세청 통관 지연 등의 불가피한 사유로 배송이 지연될 수 있으며, 이는 제품 하자로 인한 취소 사유가 되지 않습니다.</p></div></div>' +
  // 5
  '<div style="display:flex; gap:12px;"><span style="flex-shrink:0; width:24px; height:24px; border-radius:50%; background:#f0f0ed; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#78716c;">5</span><div><p style="font-weight:600; margin:0 0 6px;">[재고 및 품절 안내]</p><p style="margin:0; color:#78716c; font-size:13px; line-height:1.7;">해외 공급처의 실시간 재고 변동에 따라 결제 완료 후에도 현지 품절 및 가격 변동이 발생할 수 있습니다. 이 경우 즉시 개별 연락 후 주문 취소 및 환불 절차를 진행해 드립니다.</p></div></div>' +
  // 6
  '<div style="display:flex; gap:12px;"><span style="flex-shrink:0; width:24px; height:24px; border-radius:50%; background:#f0f0ed; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#78716c;">6</span><div><p style="font-weight:600; margin:0 0 6px;">[A/S 안내]</p><p style="margin:0; color:#78716c; font-size:13px; line-height:1.7;">해외 직구 상품 특성상 국내 공식 매장 및 서비스 센터를 통한 A/S 이용이 불가하거나 제한될 수 있습니다.</p></div></div>' +
  '</div></div></section>';

function applyDirectImportNotice(html: string): string {
  if (html.includes("해외 직구 상품입니다")) return html;
  const stripped = html.replace(
    /<p>[^<]*서울에서 검수·포장 후 국제 배송됩니다[\s\S]*?이중 검수를 거칩니다\.<\/p>/,
    STOREFRONT_DIRECT_IMPORT_NOTICE_HTML,
  );
  if (stripped !== html) return stripped;
  const story = html.replace(
    /(<section style="[^"]*line-height:1\.6[^"]*">)[\s\S]*?(<\/section>)/,
    `$1${STOREFRONT_DIRECT_IMPORT_NOTICE_HTML}$2`,
  );
  return story !== html ? story : html;
}

function fallbackStructured(product: Product): PdpStructured {
  return {
    title: product.name,
    subtitle: `${product.brand} · LEXI Curated`,
    descriptionHtml: STOREFRONT_DIRECT_IMPORT_NOTICE_HTML,
    usps: ["해외 직배송", "관세 포함 투명 가격"],
    faq: [
      { q: "배송은 얼마나 걸리나요?", a: "주문 확인 후 해외 현지에서 발송되어 평균 7~14일 소요됩니다. 기상·통관 지연 등 불가피한 사유로 지연될 수 있습니다." },
      { q: "관세가 추가로 나오나요?", a: "표시된 가격에 관세가 포함되어 있으며, 결제 후 추가 청구는 없습니다." },
      { q: "반품 시 비용이 발생하나요?", a: "제품 하자가 아닌 단순 변심 반품 시 왕복 국제 배송비 및 관부과세는 구매자 부담입니다. 상품 개봉·태그 훼손 시 반품이 불가능합니다." },
    ],
    ctaLabel: "LEXI 장바구니 담기",
    seoKeywords: ["LEXI", product.brand, product.category, product.name],
    galleryAssetIndexes: [0],
  };
}

function sample3FallbackHtml(product: Product): string {
  const concept = sample3ConceptSpec({
    rulesetId: "STOREFRONT",
    title: product.name,
    formHint: `${product.category} product — ${product.name}`,
    voiceTag: "SAMPLE3 · LEXI Curated · storefront",
  });
  const structured = fallbackStructured(product);
  const assets = [product.image].filter(Boolean);
  return renderPdp(structured, assets, concept);
}

/** 상품 slug → HQ 생성 PDP HTML (없으면 SAMPLE3 에디토리얼 폴백) */
/** HQ 내부 메타데이터는 미리보기에는 남기고 고객 상세페이지 본문에서는 뺀다. */
export function sanitizeStorefrontHtml(html: string): string {
  return html
    .replace(/<section[^>]*data-block="og"[^>]*>[\s\S]*?<\/section>/g, "")
    .replace(/<tr\b[^>]*>(?:(?!<\/tr>)[\s\S])*\bRuleset\b(?:(?!<\/tr>)[\s\S])*<\/tr>/gi, "");
}

export async function resolveStorefrontPdp(product: Product): Promise<StorefrontPdp> {
  const pdp = await resolveStorefrontPdpRaw(product);
  return { ...pdp, html: sanitizeStorefrontHtml(pdp.html) };
}

async function resolveStorefrontPdpRaw(product: Product): Promise<StorefrontPdp> {
  const ref = await productPdpRef(product.slug);
  // HQ 에서 "출력"한 상품페이지는 정적 오버라이드보다 우선한다
  const gate = ref?.documentId ? await getPdpGate(ref.documentId) : null;
  if (ref?.documentId) {
    const pub = gate?.published;
    if (pub) {
      return {
        html: applyDirectImportNotice(pub.html),
        source: "document",
        documentId: ref.documentId,
        structured: pub.structured ? { ...pub.structured, descriptionHtml: STOREFRONT_DIRECT_IMPORT_NOTICE_HTML } : null,
        assetUrls: pub.assetUrls ?? [product.image],
      };
    }
  }
  const override = getSample3StorefrontOverride(product.slug);
  if (override) {
    return { ...override, source: "document" };
  }
  // 11~40번 배치 오버라이드 레지스트리 (공통 템플릿)
  const batchOverride = getSample3BatchOverride(product.slug);
  if (batchOverride) {
    return { ...batchOverride, source: "document" };
  }

  // DB 연결 → 실제 PDP 조회 (스튜디오에서 저장만 하고 아직 출력하지 않은 초안은 노출하지 않는다)
  if (ref && !gate?.hold) {
    const { productId, documentId: docId } = ref;
    if (docId) {
      const doc = await getPdpDocument(docId);
      const html = (doc as { renderedHtml?: string | null } | null)?.renderedHtml;
      if (html?.trim()) {
        const body = ((doc as { body?: unknown }).body ?? {}) as {
          structured?: PdpStructured;
          assetUrls?: string[];
        };
        return {
          html: applyDirectImportNotice(html),
          source: "document",
          documentId: docId,
          structured: body.structured
            ? { ...body.structured, descriptionHtml: STOREFRONT_DIRECT_IMPORT_NOTICE_HTML }
            : null,
          assetUrls: body.assetUrls ?? [product.image],
        };
      }
    }

    const byProduct = await getPdpByProductId(productId);
    const html = (byProduct as { renderedHtml?: string | null } | null)?.renderedHtml;
    if (html?.trim()) {
      const body = ((byProduct as { body?: unknown; id?: number }).body ?? {}) as {
        structured?: PdpStructured;
        assetUrls?: string[];
        catalogId?: number;
      };
      return {
        html: applyDirectImportNotice(html),
        source: "document",
        documentId: (byProduct as { id: number }).id,
        structured: body.structured
          ? { ...body.structured, descriptionHtml: STOREFRONT_DIRECT_IMPORT_NOTICE_HTML }
          : null,
        assetUrls: body.assetUrls ?? [product.image],
      };
    }
  }

  // 로컬스토어 폴백 (로컬 JSON 모드)
  const ls = localStore() as any;
  const catalogItem = (ls.catalog ?? []).find((c: any) => c.externalId === product.slug);
  if (catalogItem?.documentId) {
    const localDoc: any = (ls.pdpDocs ?? []).find((d: any) => d.id === catalogItem.documentId);
    if (localDoc?.renderedHtml?.trim()) {
      const body = localDoc.body ?? {};
      return {
        html: applyDirectImportNotice(String(localDoc.renderedHtml)),
        source: "document",
        documentId: localDoc.id,
        structured: body.structured
          ? { ...body.structured, descriptionHtml: STOREFRONT_DIRECT_IMPORT_NOTICE_HTML }
          : null,
        assetUrls: body.assetUrls ?? [product.image],
      };
    }
  }

  return {
    html: sample3FallbackHtml(product),
    source: "sample3-fallback",
    assetUrls: [product.image],
    structured: fallbackStructured(product),
  };
}

/** soft-delete 되지 않은 products 존재 여부 (디버그/헬스용) */
export async function countLiveProducts() {
  if (!hasDb()) return 0;
  const rows = await db()
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(isNull(productsTable.deletedAt))
    .limit(1);
  return rows.length;
}
