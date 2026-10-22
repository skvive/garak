import { NextResponse } from "next/server";
import { searchCatalog } from "@/lib/catalog/index-store";
import { enqueueExport, listExports, processExportQueue } from "@/lib/export/jobs";
import { generatePdpForCatalog, listPdpDocuments } from "@/lib/pdp/generate";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CHANNELS = ["coupang", "shopee", "amazon"] as const;

/** POST /api/hq/verify/women-channel-export { count?: 10 } — 실검증 배치 */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  try {
    const body = (await req.json().catch(() => ({}))) as { count?: number };
    const count = Math.min(Math.max(body.count ?? 10, 1), 15);

    const { items } = await searchCatalog({
      supplier: "cjdropshipping",
      scope: "active",
      importState: "imported",
      lexiBucket: "women",
      page: 1,
      pageSize: count,
      includeThumb: true,
    });

    if (!items.length) return bad("no imported women catalog items", 404);

    const pdpResults: Array<{
      catalogId: number;
      title: string;
      documentId: number;
      engine?: string;
      skipped?: boolean;
      error?: string;
    }> = [];

    for (const it of items) {
      try {
        if (it.documentId) {
          pdpResults.push({
            catalogId: it.id,
            title: it.title,
            documentId: it.documentId,
            skipped: true,
          });
          continue;
        }
        const r = await generatePdpForCatalog(it.id, { locale: "ko" });
        pdpResults.push({
          catalogId: it.id,
          title: it.title,
          documentId: r.documentId,
          engine: r.engine,
        });
      } catch (e) {
        pdpResults.push({
          catalogId: it.id,
          title: it.title,
          documentId: 0,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const docIds = [...new Set(pdpResults.filter((r) => r.documentId > 0).map((r) => r.documentId))];
    const exportRuns: Array<{
      documentId: number;
      jobs: unknown[];
      processed: unknown[];
    }> = [];

    for (const documentId of docIds) {
      const jobs = await enqueueExport({ documentId, channels: [...CHANNELS] });
      const processed = await processExportQueue(CHANNELS.length + 2);
      exportRuns.push({ documentId, jobs, processed });
    }

    const allJobs = await listExports(300);
    const recent = allJobs.filter((j) => docIds.includes((j as { documentId: number }).documentId));

    const byChannel = Object.fromEntries(
      CHANNELS.map((ch) => {
        const rows = recent.filter((j) => (j as { channelCode: string }).channelCode === ch);
        return [
          ch,
          {
            total: rows.length,
            done: rows.filter((j) => (j as { status: string }).status === "done").length,
            failed: rows.filter((j) => (j as { status: string }).status === "failed").length,
            mock: rows.filter((j) => /MOCK/i.test(String((j as { externalRef?: string }).externalRef ?? ""))).length,
            live: rows.filter((j) => {
              const ref = String((j as { externalRef?: string }).externalRef ?? "");
              return ref && !/MOCK/i.test(ref);
            }).length,
            samples: rows.slice(0, 5).map((j) => ({
              id: (j as { id: number }).id,
              documentId: (j as { documentId: number }).documentId,
              status: (j as { status: string }).status,
              externalRef: (j as { externalRef?: string }).externalRef,
              lastError: (j as { lastError?: string | null }).lastError,
            })),
          },
        ];
      }),
    );

    const failedExports = recent.filter((j) => (j as { status: string }).status === "failed");

    return NextResponse.json({
      ok: failedExports.length === 0 && pdpResults.every((r) => !r.error),
      count: items.length,
      channels: CHANNELS,
      items: items.map((i) => ({ id: i.id, title: i.title, externalId: i.externalId })),
      pdp: pdpResults,
      exportRuns,
      byChannel,
      pdpDocTotal: (await listPdpDocuments(100)).length,
      env: {
        coupang: Boolean(process.env.COUPANG_VENDOR_ID && process.env.COUPANG_ACCESS_KEY),
        shopee: Boolean(process.env.SHOPEE_PARTNER_ID && process.env.SHOPEE_ACCESS_TOKEN),
        amazon: Boolean(process.env.AMAZON_LWA_CLIENT_ID && process.env.AMAZON_REFRESH_TOKEN),
        gemini: Boolean(process.env.GEMINI_API_KEY),
      },
    });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "verify failed", 500);
  }
}
