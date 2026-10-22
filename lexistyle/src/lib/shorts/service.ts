/**
 * CommerceShorts 잡 서비스 — 크레딧 선차감 → 잡 생성 → 워커 claim → 완료/실패(환불).
 * DATABASE_URL 없으면 프로세스 메모리 폴백(개발용, 재시작 시 소멸).
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { db, hasDb, schema } from "@/db";
import { wanConfigured } from "@/lib/wan/config";
import { wanGetJson } from "@/lib/wan/client";
import { generateWanImageToVideo } from "@/lib/wan/video";
import { allowedStrategy, PUBLIC_PLANS } from "./pricing";
import { normalizeShortScript, verifyShortScript, type ShortProduct, type ShortScript } from "./script";

export type ShortPlan = "free" | "starter" | "pro" | "agency";
export const PLANS = PUBLIC_PLANS as Record<ShortPlan, (typeof PUBLIC_PLANS)["free"]>;

export type JobStatus = "queued" | "rendering" | "uploading" | "completed" | "failed";
export type ShortAccount = { email: string; plan: ShortPlan; credits: number };
export type ShortJob = {
  id: number;
  ownerEmail: string;
  productId: number;
  template: string;
  script: ShortScript;
  status: JobStatus;
  progress: number;
  strategy: "wan_i2v" | "remotion";
  wanTaskId: string | null;
  wanVideoUrl: string | null;
  watermark: boolean;
  finalVideoUrl: string | null;
  error: string | null;
  refunded: boolean;
  createdAt: string;
  finishedAt: string | null;
};
export type WorkerJob = ShortJob & { product: ShortProduct };

export class ShortsError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const STALE_CLAIM_MIN = 15;
const WAN_WAIT_MIN = 10;

/* ---------------- memory fallback ---------------- */
type Mem = { accounts: Map<string, ShortAccount>; products: Map<number, { ownerEmail: string; data: ShortProduct }>; jobs: Map<number, ShortJob>; seq: number };
const g = globalThis as unknown as { __shortsMem?: Mem };
const mem = (): Mem => (g.__shortsMem ??= { accounts: new Map(), products: new Map(), jobs: new Map(), seq: 0 });

type JobRow = typeof schema.shortVideoJobs.$inferSelect;
const iso = (d: Date | string | null) => (d == null ? null : new Date(d).toISOString());
function toJob(r: JobRow): ShortJob {
  return {
    id: r.id,
    ownerEmail: r.ownerEmail,
    productId: r.productId,
    template: r.template,
    script: r.scriptData as ShortScript,
    status: r.status as JobStatus,
    progress: r.progress,
    strategy: r.strategy as ShortJob["strategy"],
    wanTaskId: r.wanTaskId,
    wanVideoUrl: r.wanVideoUrl,
    watermark: r.watermark,
    finalVideoUrl: r.finalVideoUrl,
    error: r.error,
    refunded: r.refunded,
    createdAt: iso(r.createdAt)!,
    finishedAt: iso(r.finishedAt),
  };
}

/* ---------------- accounts / credits ---------------- */
export async function getAccount(email: string): Promise<ShortAccount> {
  const key = email.toLowerCase();
  if (!hasDb()) {
    const m = mem();
    if (!m.accounts.has(key)) m.accounts.set(key, { email: key, plan: "free", credits: PLANS.free.monthlyCredits });
    return { ...m.accounts.get(key)! };
  }
  const t = schema.shortAccounts;
  await db().insert(t).values({ email: key }).onConflictDoNothing();
  const [row] = await db().select().from(t).where(eq(t.email, key)).limit(1);
  return { email: row.email, plan: (row.plan in PLANS ? row.plan : "free") as ShortPlan, credits: row.credits };
}

async function spendCredit(email: string, cost: number): Promise<boolean> {
  const key = email.toLowerCase();
  await getAccount(key);
  if (!hasDb()) {
    const a = mem().accounts.get(key)!;
    if (a.credits < cost) return false;
    a.credits -= cost;
    return true;
  }
  const t = schema.shortAccounts;
  const rows = await db()
    .update(t)
    .set({ credits: sql`${t.credits} - ${cost}`, updatedAt: new Date() })
    .where(and(eq(t.email, key), sql`${t.credits} >= ${cost}`))
    .returning({ credits: t.credits });
  return rows.length > 0;
}

async function refundCredit(email: string, cost: number) {
  const key = email.toLowerCase();
  if (!hasDb()) {
    const a = mem().accounts.get(key);
    if (a) a.credits += cost;
    return;
  }
  const t = schema.shortAccounts;
  await db().update(t).set({ credits: sql`${t.credits} + ${cost}`, updatedAt: new Date() }).where(eq(t.email, key));
}

/* ---------------- jobs ---------------- */
export async function createJob(email: string, product: ShortProduct, input: ShortScript): Promise<ShortJob> {
  const owner = email.toLowerCase();
  const script = verifyShortScript(input, product.imageUrls.length) ? input : normalizeShortScript(input, product.imageUrls.length);
  const account = await getAccount(owner);
  const watermark = PLANS[account.plan].watermark;
  const wantsWan =
    wanConfigured() &&
    allowedStrategy(account.plan, script.scenes.some((s) => s.visual === "wan_i2v")) === "wan_i2v";

  if (!(await spendCredit(owner, 1))) {
    throw new ShortsError("크레딧이 부족합니다. 플랜을 업그레이드하면 바로 만들 수 있어요.", 402);
  }

  let wanTaskId: string | null = null;
  if (wantsWan) {
    try {
      const first = script.scenes.find((s) => s.visual === "wan_i2v")!;
      const r = await generateWanImageToVideo(
        product.imageUrls[first.imageIndex] ?? product.imageUrls[0],
        `Premium commerce product video of ${product.title}. Slow cinematic camera push-in, soft studio light, the product stays identical, no text, no people.`,
        { wait: false, duration: 5, resolution: "720P" },
      );
      wanTaskId = r.taskId;
    } catch {
      wanTaskId = null; // Wan 장애는 Remotion 폴백으로 흡수
    }
  }
  const strategy = wanTaskId ? "wan_i2v" : "remotion";

  try {
    if (!hasDb()) {
      const m = mem();
      const productId = ++m.seq;
      m.products.set(productId, { ownerEmail: owner, data: product });
      const job: ShortJob = {
        id: ++m.seq,
        ownerEmail: owner,
        productId,
        template: script.template,
        script,
        status: "queued",
        progress: 5,
        strategy,
        wanTaskId,
        wanVideoUrl: null,
        watermark,
        finalVideoUrl: null,
        error: null,
        refunded: false,
        createdAt: new Date().toISOString(),
        finishedAt: null,
      };
      m.jobs.set(job.id, job);
      return { ...job };
    }
    const [p] = await db()
      .insert(schema.shortProducts)
      .values({
        ownerEmail: owner,
        sourceUrl: product.sourceUrl,
        title: product.title,
        priceAmount: product.priceAmount != null ? String(product.priceAmount) : null,
        currency: product.currency,
        data: product,
      })
      .returning({ id: schema.shortProducts.id });
    const [row] = await db()
      .insert(schema.shortVideoJobs)
      .values({ ownerEmail: owner, productId: p.id, template: script.template, scriptData: script, strategy, wanTaskId, watermark })
      .returning();
    return toJob(row);
  } catch (e) {
    await refundCredit(owner, 1);
    throw e;
  }
}

export async function getJob(id: number): Promise<ShortJob | null> {
  if (!hasDb()) {
    const j = mem().jobs.get(id);
    return j ? { ...j } : null;
  }
  const [row] = await db().select().from(schema.shortVideoJobs).where(eq(schema.shortVideoJobs.id, id)).limit(1);
  return row ? toJob(row) : null;
}

export async function listJobs(email: string, limit = 20): Promise<ShortJob[]> {
  const owner = email.toLowerCase();
  if (!hasDb()) {
    return [...mem().jobs.values()].filter((j) => j.ownerEmail === owner).sort((a, b) => b.id - a.id).slice(0, limit);
  }
  const t = schema.shortVideoJobs;
  const rows = await db().select().from(t).where(eq(t.ownerEmail, owner)).orderBy(desc(t.id)).limit(limit);
  return rows.map(toJob);
}

async function patchJob(id: number, patch: Partial<JobRow>) {
  if (!hasDb()) {
    const j = mem().jobs.get(id);
    if (!j) return;
    const { scriptData: _s, claimedAt: _c, createdAt: _cr, finishedAt, ...rest } = patch;
    Object.assign(j, rest, finishedAt !== undefined ? { finishedAt: iso(finishedAt) } : {});
    return;
  }
  await db().update(schema.shortVideoJobs).set(patch).where(eq(schema.shortVideoJobs.id, id));
}

/** Wan 대기 잡 상태 갱신: 성공 → 클립 URL, 실패·지연 → Remotion 폴백 */
async function refreshWanJobs() {
  const pending = hasDb()
    ? (
        await db()
          .select()
          .from(schema.shortVideoJobs)
          .where(and(eq(schema.shortVideoJobs.status, "queued"), eq(schema.shortVideoJobs.strategy, "wan_i2v"), sql`${schema.shortVideoJobs.wanVideoUrl} is null`))
          .limit(5)
      ).map(toJob)
    : [...mem().jobs.values()].filter((j) => j.status === "queued" && j.strategy === "wan_i2v" && !j.wanVideoUrl).slice(0, 5);

  for (const j of pending) {
    const tooOld = Date.now() - new Date(j.createdAt).getTime() > WAN_WAIT_MIN * 60_000;
    try {
      const r = await wanGetJson(`/tasks/${j.wanTaskId}`, 10_000);
      const out = (r.output as Record<string, unknown>) ?? {};
      const status = String(out.task_status ?? "UNKNOWN");
      if (status === "SUCCEEDED" && out.video_url) await patchJob(j.id, { wanVideoUrl: String(out.video_url), progress: 30 });
      else if (["FAILED", "CANCELED", "UNKNOWN"].includes(status) || tooOld) await patchJob(j.id, { strategy: "remotion" });
      else await patchJob(j.id, { progress: 20 });
    } catch {
      if (tooOld) await patchJob(j.id, { strategy: "remotion" });
    }
  }
}

/** 워커: 렌더 가능한 가장 오래된 잡 1건 점유 */
export async function claimJob(): Promise<WorkerJob | null> {
  if (wanConfigured()) await refreshWanJobs();

  if (!hasDb()) {
    const m = mem();
    const j = [...m.jobs.values()]
      .filter((x) => x.status === "queued" && (x.strategy === "remotion" || x.wanVideoUrl))
      .sort((a, b) => a.id - b.id)[0];
    if (!j) return null;
    Object.assign(j, { status: "rendering", progress: 40 });
    return { ...j, product: m.products.get(j.productId)!.data };
  }

  const t = schema.shortVideoJobs;
  await db()
    .update(t)
    .set({ status: "queued", progress: 5 })
    .where(and(eq(t.status, "rendering"), sql`${t.claimedAt} < now() - interval '${sql.raw(String(STALE_CLAIM_MIN))} minutes'`));

  const res = await db().execute(sql`
    update short_video_jobs set status = 'rendering', progress = 40, claimed_at = now()
    where id = (
      select id from short_video_jobs
      where status = 'queued' and (strategy = 'remotion' or wan_video_url is not null)
      order by id limit 1 for update skip locked
    )
    returning id`);
  const rows = (res as unknown as { rows: { id: number | string }[] }).rows ?? [];
  if (!rows.length) return null;
  const job = await getJob(Number(rows[0].id));
  if (!job) return null;
  const [p] = await db().select().from(schema.shortProducts).where(eq(schema.shortProducts.id, job.productId)).limit(1);
  return { ...job, product: p.data as ShortProduct };
}

export async function reportJob(
  id: number,
  r: { status: "rendering" | "uploading" | "completed" | "failed"; progress?: number; url?: string; error?: string },
): Promise<ShortJob> {
  const job = await getJob(id);
  if (!job) throw new ShortsError("잡을 찾을 수 없습니다.", 404);
  if (job.status === "completed" || job.status === "failed") return job;

  if (r.status === "completed") {
    if (!r.url || !/^https:\/\//.test(r.url)) throw new ShortsError("완료 보고에는 https 영상 URL이 필요합니다.");
    await patchJob(id, { status: "completed", progress: 100, finalVideoUrl: r.url, finishedAt: new Date() });
  } else if (r.status === "failed") {
    await patchJob(id, { status: "failed", error: (r.error ?? "렌더 실패").slice(0, 500), finishedAt: new Date(), refunded: true });
    if (!job.refunded) await refundCredit(job.ownerEmail, 1);
  } else {
    const progress = Math.max(job.progress, Math.min(95, Math.round(r.progress ?? job.progress)));
    await patchJob(id, { status: r.status, progress });
  }
  return (await getJob(id))!;
}
