/** Check export failures reason */
import { listExports } from "@/lib/export/jobs";

async function main() {
  const all = await listExports(600);
  const failed = all.filter((e: any) => e.status === "failed");
  const done = all.filter((e: any) => e.status === "done");
  const mock = all.filter((e: any) => {
    const ref = String(e.externalRef ?? "");
    return /MOCK/i.test(ref) || (e.responsePayload && (e.responsePayload as any)?.mock);
  });

  console.log(`Total: ${all.length}, Done: ${done.length}, Failed: ${failed.length}, Mock: ${mock.length}`);

  // Unique errors
  const errorMap = new Map<string, number>();
  for (const f of failed) {
    const err = (f as any).lastError || "?";
    // Extract first meaningful part
    const key = err.slice(0, 120);
    errorMap.set(key, (errorMap.get(key) ?? 0) + 1);
  }

  console.log("\nFailure reasons:");
  for (const [err, count] of [...errorMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  x${count}: ${err}`);
  }

  // Check if done ones are mock
  const mockDone = done.filter((d: any) => {
    const ref = String(d.externalRef ?? "");
    return /MOCK/i.test(ref);
  });
  console.log(`\nDone but mock: ${mockDone.length}`);

  // Show a sample done export
  if (done.length > 0) {
    const sample = done[0] as any;
    console.log(`\nSample done export:`);
    console.log(`  docId=${sample.documentId} ch=${sample.channelCode} status=${sample.status}`);
    console.log(`  ref=${sample.externalRef}`);
    console.log(`  response=${JSON.stringify(sample.responsePayload)?.slice(0, 200)}`);
  }

  // Show a sample failed export
  if (failed.length > 0) {
    const sample = failed[0] as any;
    console.log(`\nSample failed export:`);
    console.log(`  docId=${sample.documentId} ch=${sample.channelCode}`);
    console.log(`  error=${sample.lastError?.slice(0, 300)}`);
    console.log(`  response=${JSON.stringify(sample.responsePayload)?.slice(0, 200)}`);
  }
}

main().catch(console.error);