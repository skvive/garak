/**
 * 실검증 (로컬 DB): 여성패션 imported N건 → PDP → 쿠팡·Shopee·Amazon 익스포트
 * npx tsx scripts/verify-women-channel-export.ts
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.join(process.cwd(), ".env.vercel.prod"), override: true });
  dotenv.config({ path: path.join(process.cwd(), ".env.local") });
  dotenv.config({ path: path.join(process.cwd(), ".env.production.local") });
}
import { searchCatalog } from "../src/lib/catalog/index-store";
import { generatePdpForCatalog, listPdpDocuments } from "../src/lib/pdp/generate";
import { enqueueExport, listExports, processExportQueue } from "../src/lib/export/jobs";

const COUNT = Math.min(Number(process.env.COUNT || 10), 20);
const CHANNELS = (process.env.CHANNELS || "coupang,shopee,amazon").split(",").map((s) => s.trim());
const LOG = "scripts/verify-women-channel-export.log";

function log(line: string) {
  console.log(line);
  fs.appendFileSync(LOG, `${line}\n`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL required — set in .env.local");
  }

  fs.writeFileSync(LOG, `# local verify ${new Date().toISOString()}\n`);
  log(`COUNT=${COUNT} CHANNELS=${CHANNELS.join(",")}`);

  const { items } = await searchCatalog({
    supplier: "cjdropshipping",
    scope: "active",
    importState: "imported",
    lexiBucket: "women",
    page: 1,
    pageSize: COUNT,
    includeThumb: true,
  });

  log(`found ${items.length} women imported items`);
  if (!items.length) throw new Error("no women imported catalog items");

  const selected = items.slice(0, COUNT);
  for (const it of selected) {
    log(`  #${it.id} ${it.title.slice(0, 50)} doc=${it.documentId ?? "none"}`);
  }

  const pdpResults: Array<{ catalogId: number; documentId: number; engine?: string; skipped?: boolean }> = [];

  for (const it of selected) {
    if (it.documentId) {
      log(`PDP skip catalog #${it.id} — existing doc #${it.documentId}`);
      pdpResults.push({ catalogId: it.id, documentId: it.documentId, skipped: true });
      continue;
    }
    log(`PDP generate catalog #${it.id}…`);
    const r = await generatePdpForCatalog(it.id, { locale: "ko" });
    log(`  → doc #${r.documentId} engine=${r.engine}`);
    pdpResults.push({ catalogId: it.id, documentId: r.documentId, engine: r.engine });
  }

  const docIds = [...new Set(pdpResults.map((r) => r.documentId))];
  log(`export ${docIds.length} docs × ${CHANNELS.length} channels`);

  const exportRuns: unknown[] = [];
  for (const documentId of docIds) {
    const jobs = await enqueueExport({ documentId, channels: CHANNELS });
    log(`  enqueued doc #${documentId}: ${jobs.map((j) => `${j.channelCode}(#${(j as { id: number }).id})`).join(", ")}`);
    const processed = await processExportQueue(CHANNELS.length + 2);
    for (const p of processed) {
      log(
        `    job #${p.id} ok=${p.ok} ref=${(p as { externalRef?: string }).externalRef ?? "-"} mock=${(p as { mock?: boolean }).mock} err=${(p as { error?: string }).error ?? ""}`,
      );
    }
    exportRuns.push({ documentId, jobs, processed });
  }

  const allJobs = await listExports(200);
  const recent = allJobs.filter((j) => docIds.includes((j as { documentId: number }).documentId));

  const report = {
    at: new Date().toISOString(),
    items: selected.map((i) => ({ id: i.id, title: i.title, externalId: i.externalId })),
    pdp: pdpResults,
    channels: CHANNELS,
    byChannel: Object.fromEntries(
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
              lastError: (j as { lastError?: string }).lastError,
            })),
          },
        ];
      }),
    ),
    pdpDocCount: (await listPdpDocuments(100)).length,
  };

  log("\n=== REPORT ===");
  log(JSON.stringify(report, null, 2));
  fs.writeFileSync("scripts/verify-women-channel-export.report.json", JSON.stringify(report, null, 2));

  const failed = recent.filter((j) => (j as { status: string }).status === "failed");
  if (failed.length) {
    log(`FAILED exports: ${failed.length}`);
    process.exit(1);
  }
  log("OK — all channel exports completed");
}

main().catch((e) => {
  console.error(e);
  fs.appendFileSync(LOG, `FATAL ${e instanceof Error ? e.message : e}\n`);
  process.exit(1);
});
