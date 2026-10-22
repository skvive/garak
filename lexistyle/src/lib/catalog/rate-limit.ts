/** CJ quota-aware rate limiter — 기본 2 rps */

const g = globalThis as unknown as {
  __lexiCjQueue?: Promise<void>;
  __lexiCjLast?: number;
};

function maxRps() {
  const n = Number(process.env.CJ_MAX_RPS || 2);
  return Number.isFinite(n) && n > 0 ? n : 2;
}

export async function cjThrottle(): Promise<void> {
  const minGap = Math.ceil(1000 / maxRps());
  const prev = g.__lexiCjQueue ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  g.__lexiCjQueue = prev.then(() => gate);
  await prev;
  const last = g.__lexiCjLast ?? 0;
  const wait = Math.max(0, minGap - (Date.now() - last));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  g.__lexiCjLast = Date.now();
  release();
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: { retries?: number },
): Promise<T> {
  const retries = opts?.retries ?? 4;
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      await cjThrottle();
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      const retryable = /429|rate|timeout|ECONNRESET|503/i.test(msg);
      if (!retryable || i === retries) break;
      const backoff = Math.min(30_000, 500 * 2 ** i + Math.random() * 200);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastErr;
}
