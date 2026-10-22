/**
 * Alibaba MaaS Wan (완) — LEXI 마케팅 이미지·영상.
 * 호스트는 워크스페이스별 ws-*.maas.aliyuncs.com.
 * 이미지/영상은 OpenAI compatible 가 아니라 DashScope `/api/v1` 네이티브.
 */

const DEFAULT_HOST = "ws-0yo9dfushj918w65.ap-southeast-1.maas.aliyuncs.com";

export function wanApiKey(): string | null {
  const key =
    process.env.WAN_API_KEY?.trim() ||
    process.env.DASHSCOPE_API_KEY?.trim() ||
    process.env.ALIBABA_TOKEN_PLAN_API_KEY?.trim() ||
    "";
  return key || null;
}

export function wanConfigured(): boolean {
  return Boolean(wanApiKey());
}

/** 예: https://ws-xxx.ap-southeast-1.maas.aliyuncs.com */
export function wanHost(): string {
  const raw =
    process.env.WAN_API_HOST?.trim() ||
    process.env.WAN_MAAS_HOST?.trim() ||
    DEFAULT_HOST;
  const host = raw.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `https://${host}`;
}

export function wanDashScopeBase(): string {
  return `${wanHost()}/api/v1`;
}

export function wanCompatibleBase(): string {
  return `${wanHost()}/compatible-mode/v1`;
}

export function wanImageModel(): string {
  return process.env.WAN_IMAGE_MODEL?.trim() || "wan2.7-image";
}

/** t2v 기본 — 워크스페이스에 없으면 WAN_VIDEO_MODEL로 교체 */
export function wanVideoModel(): string {
  return process.env.WAN_VIDEO_MODEL?.trim() || "wan2.6-t2v";
}

export function wanI2vModel(): string {
  return process.env.WAN_I2V_MODEL?.trim() || "wan2.6-i2v";
}

export function wanAuthHeaders(asyncMode = false): Record<string, string> {
  const key = wanApiKey();
  if (!key) throw new Error("WAN_API_KEY (or DASHSCOPE_API_KEY) not set");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (asyncMode) headers["X-DashScope-Async"] = "enable";
  return headers;
}
