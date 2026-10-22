import { wanAuthHeaders, wanDashScopeBase } from "./config";

export type WanTaskStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED" | "UNKNOWN" | string;

export async function wanPostJson(
  path: string,
  body: unknown,
  opts?: { async?: boolean; timeoutMs?: number },
): Promise<Record<string, unknown>> {
  const url = path.startsWith("http") ? path : `${wanDashScopeBase()}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: wanAuthHeaders(Boolean(opts?.async)),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(opts?.timeoutMs ?? 300_000),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      (typeof json.message === "string" && json.message) ||
      (typeof json.code === "string" && json.code) ||
      `HTTP ${res.status}`;
    throw new Error(`wan ${path}: ${msg}`);
  }
  if (typeof json.code === "string" && json.code && json.code !== "Success") {
    throw new Error(`wan ${path}: ${json.code}: ${String(json.message ?? "")}`);
  }
  return json;
}

export async function wanGetJson(path: string, timeoutMs = 60_000): Promise<Record<string, unknown>> {
  const url = path.startsWith("http") ? path : `${wanDashScopeBase()}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: wanAuthHeaders(false),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`wan GET ${path}: ${String(json.message ?? res.status)}`);
  }
  return json;
}

export async function wanPollTask(
  taskId: string,
  opts?: { intervalMs?: number; maxWaitMs?: number },
): Promise<Record<string, unknown>> {
  const interval = opts?.intervalMs ?? 8_000;
  const maxWait = opts?.maxWaitMs ?? 600_000;
  const deadline = Date.now() + maxWait;
  let last: string | null = null;

  while (Date.now() < deadline) {
    const r = await wanGetJson(`/tasks/${taskId}`);
    const out = (r.output as Record<string, unknown> | undefined) ?? {};
    const status = String(out.task_status ?? "UNKNOWN") as WanTaskStatus;
    if (status !== last) last = status;
    if (status === "SUCCEEDED" || status === "FAILED" || status === "CANCELED" || status === "UNKNOWN") {
      if (status !== "SUCCEEDED") {
        const msg = String(out.message ?? out.code ?? status);
        throw new Error(`wan task ${taskId}: ${msg}`);
      }
      return r;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`wan task ${taskId}: timed out after ${maxWait}ms (last=${last})`);
}
