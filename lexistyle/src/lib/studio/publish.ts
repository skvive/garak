import { and, eq } from "drizzle-orm";
import { db, hasDb } from "@/db";
import { contentDocuments, contentVersions, publishEvents } from "@/db/schema";
import { cafe24Fetch } from "@/lib/cafe24/client";
import { cafe24ShopNo } from "@/lib/cafe24/config";

type Cafe24ProductResponse = {
  product?: {
    product_no: number;
    product_name?: string;
    description?: string;
    summary_description?: string;
  };
};

export async function publishDocumentToCafe24(input: {
  documentId: number;
  actor: string;
  version?: number;
}) {
  if (!hasDb()) throw new Error("DATABASE_URL required");
  const d = db();
  const [doc] = await d
    .select()
    .from(contentDocuments)
    .where(eq(contentDocuments.id, input.documentId))
    .limit(1);
  if (!doc) throw new Error("document not found");
  if (!doc.cafe24ProductNo) throw new Error("Cafe24 product_no required");
  if (!input.version && doc.status !== "approved") {
    throw new Error("승인된 문서만 Cafe24에 게시할 수 있습니다");
  }

  let version = doc.currentVersion;
  let renderedHtml = doc.renderedHtml;
  let body = doc.body;
  if (input.version) {
    const [snapshot] = await d
      .select()
      .from(contentVersions)
      .where(
        and(
          eq(contentVersions.documentId, doc.id),
          eq(contentVersions.version, input.version),
        ),
      )
      .limit(1);
    if (!snapshot) throw new Error("content version not found");
    version = snapshot.version;
    renderedHtml = snapshot.renderedHtml;
    body = snapshot.body;
  }

  if (!renderedHtml) {
    const description =
      typeof body === "object" && body && "description" in body
        ? String((body as { description: unknown }).description)
        : "";
    renderedHtml = `<section class="lexi-pdp"><p>${escapeHtml(description)}</p></section>`;
  }

  const [event] = await d
    .insert(publishEvents)
    .values({
      documentId: doc.id,
      version,
      target: "cafe24_product_description",
      status: "publishing",
      requestPayload: {
        shop_no: cafe24ShopNo(),
        product_no: doc.cafe24ProductNo,
        description: renderedHtml,
      },
      publishedBy: input.actor,
    })
    .returning();

  try {
    const previous = await cafe24Fetch<Cafe24ProductResponse>({
      scope: "admin",
      path: `/products/${doc.cafe24ProductNo}`,
    });
    const response = await cafe24Fetch<Cafe24ProductResponse>({
      scope: "admin",
      method: "PUT",
      path: `/products/${doc.cafe24ProductNo}`,
      body: {
        shop_no: cafe24ShopNo(),
        request: {
          description: renderedHtml,
        },
      },
    });

    await d
      .update(publishEvents)
      .set({
        status: input.version ? "rolled_back" : "published",
        remoteRef: String(doc.cafe24ProductNo),
        previousSnapshot: previous.product ?? null,
        responsePayload: response,
        publishedAt: new Date(),
      })
      .where(eq(publishEvents.id, event.id));
    await d
      .update(contentDocuments)
      .set({
        status: "published",
        currentVersion: version,
        renderedHtml,
        body,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(contentDocuments.id, doc.id));

    return {
      eventId: event.id,
      documentId: doc.id,
      version,
      productNo: doc.cafe24ProductNo,
      status: input.version ? "rolled_back" : "published",
    };
  } catch (error) {
    await d
      .update(publishEvents)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "Cafe24 publish failed",
      })
      .where(eq(publishEvents.id, event.id));
    throw error;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
