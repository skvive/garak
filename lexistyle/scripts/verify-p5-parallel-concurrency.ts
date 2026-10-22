/**
 * P3/P5/#5 실검증 — PDP 5개 병렬 생성 + 동시 생성 충돌 방지 검증
 *
 * 1) runJob이 pLimit(5)로 동시에 5개까지만 실행하는지
 * 2) startPdpJob의 in-flight 락이 동일 catalogId 중복 생성을 막는지
 *
 * 실행: npx tsx scripts/verify-p5-parallel-concurrency.ts
 */
import { runJob } from "../src/lib/jobs/runner";
import { getJob } from "../src/lib/jobs/store";
import { startPdpJob, startImportJob } from "../src/lib/jobs/executors";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("[verify] P2~P5 병렬·동시성 실검증 시작");

  // 1) 병렬 실행기: 최대 동시 실행 수 캡처
  console.log("\n[1] runJob pLimit(5) 동시성 검증");
  let active = 0;
  let peak = 0;
  const concurrency = 5;
  const job = runJob({
    kind: "pdp",
    targets: Array.from({ length: 12 }, (_, i) => ({ refId: i + 1, label: `상품 #${i + 1}` })),
    concurrency,
    run: async () => {
      active++;
      peak = Math.max(peak, active);
      await sleep(60);
      active--;
    },
  });
  await sleep(150);
  const j1 = getJob(job.jobId);
  const runningTasks = j1?.tasks.filter((t) => t.status === "running").length ?? 0;
  console.log(`   - 초기 실행 중 작업 수: ${runningTasks} (≤ ${concurrency} → ${runningTasks <= concurrency ? "PASS" : "FAIL"})`);
  await sleep(800);
  const j1Done = getJob(job.jobId);
  const doneCount = j1Done?.tasks.filter((t) => t.status === "done").length ?? 0;
  console.log(`   - 완료 작업 수: ${doneCount} / 12 (${doneCount === 12 ? "PASS" : "FAIL"})`);
  console.log(`   - 측정된 최대 동시 실행: ${peak} (≤ ${concurrency} → ${peak <= concurrency ? "PASS" : "FAIL"})`);

  // 2) Import/pdp executor 로드 검증
  console.log("\n[2] import/pdp executor 로드 검증");
  const importJob = startImportJob([{ refId: 999999, label: "없는상품(실패케이스)" }]);
  const pdpJob = startPdpJob([{ refId: 999998, label: "없는상품(실패케이스)" }]);
  console.log(`   - import 잡 ID: ${importJob.jobId} (${importJob.kind})`);
  console.log(`   - pdp 잡 ID: ${pdpJob.jobId} (${pdpJob.kind})`);

  // 3) #5 동시 생성 락: 같은 catalogId로 두 번 생성 시도 시 두 번째가 실패해야 함
  console.log("\n[3] #5 동시 생성 충돌 검증 (in-flight 락)");
  const g = globalThis as unknown as { __lexiPdpInFlight?: Set<number> };
  if (!g.__lexiPdpInFlight) g.__lexiPdpInFlight = new Set();
  const targetId = 700001;
  g.__lexiPdpInFlight.add(targetId);
  const secondAttempt = startPdpJob([{ refId: targetId, label: "중복 생성 시도" }]);
  await sleep(400);
  const j2 = getJob(secondAttempt.jobId);
  const task = j2?.tasks[0];
  const failedWithLock = task?.status === "failed" && /이미 생성 중/.test(task?.error ?? "");
  console.log(`   - 두 번째 동시 생성: status=${task?.status}, error=${task?.error ?? "none"} → ${failedWithLock ? "PASS" : "FAIL"}`);
  g.__lexiPdpInFlight.delete(targetId);

  const allPass = runningTasks <= concurrency && doneCount === 12 && peak <= concurrency && failedWithLock;
  console.log(`\n${allPass ? "✅ 전 항목 PASS" : "❌ 일부 항목 FAIL"}`);
  process.exit(allPass ? 0 : 1);
}

void main();