import { wanI2vModel, wanVideoModel } from "./config";
import { wanPollTask, wanPostJson } from "./client";

export type WanVideoResolution = "480P" | "720P" | "1080P";
export type WanVideoRatio = "16:9" | "9:16" | "1:1" | "4:3" | "3:4";

export type WanVideoResult = {
  url: string;
  taskId: string;
  model: string;
  provider: "wan";
};

type SubmitOpts = {
  duration?: number;
  resolution?: WanVideoResolution;
  ratio?: WanVideoRatio;
  seed?: number;
  watermark?: boolean;
  /** fire-and-forget: return taskId without polling */
  wait?: boolean;
  intervalMs?: number;
  maxWaitMs?: number;
};

async function submitAndMaybeWait(
  model: string,
  input: Record<string, unknown>,
  parameters: Record<string, unknown>,
  opts: SubmitOpts,
): Promise<WanVideoResult | { taskId: string; model: string }> {
  const body = { model, input, parameters };
  const resp = await wanPostJson("/services/aigc/video-generation/video-synthesis", body, {
    async: true,
    timeoutMs: 60_000,
  });
  const output = (resp.output as Record<string, unknown>) ?? {};
  const taskId = String(output.task_id ?? "");
  if (!taskId) throw new Error("wan video: no task_id");

  if (opts.wait === false) return { taskId, model };

  const done = await wanPollTask(taskId, {
    intervalMs: opts.intervalMs,
    maxWaitMs: opts.maxWaitMs,
  });
  const out = (done.output as Record<string, unknown>) ?? {};
  const url = String(out.video_url ?? "");
  if (!url) throw new Error(`wan video: no video_url for task ${taskId}`);
  return { url, taskId, model, provider: "wan" };
}

/** 텍스트 → 영상 (마케팅 숏폼/히어로 루프) */
export async function generateWanTextToVideo(
  prompt: string,
  opts: SubmitOpts = {},
): Promise<WanVideoResult | { taskId: string; model: string }> {
  const model = wanVideoModel();
  const parameters: Record<string, unknown> = {
    resolution: opts.resolution ?? "720P",
    duration: opts.duration ?? 5,
    watermark: opts.watermark ?? false,
  };
  if (opts.ratio) parameters.ratio = opts.ratio;
  if (opts.seed != null) parameters.seed = opts.seed;

  return submitAndMaybeWait(model, { prompt }, parameters, { wait: true, ...opts });
}

/** 첫 프레임 이미지 → 영상 (PDP 히어로 → 모션) */
export async function generateWanImageToVideo(
  frameUrl: string,
  prompt: string,
  opts: SubmitOpts = {},
): Promise<WanVideoResult | { taskId: string; model: string }> {
  const model = wanI2vModel();
  const parameters: Record<string, unknown> = {
    resolution: opts.resolution ?? "720P",
    duration: opts.duration ?? 5,
    watermark: opts.watermark ?? false,
  };
  if (opts.seed != null) parameters.seed = opts.seed;

  const useMedia = (process.env.WAN_I2V_INPUT?.trim() || "img_url") === "media";
  const input: Record<string, unknown> = useMedia
    ? {
        prompt,
        media: [{ type: "first_frame", url: frameUrl }],
      }
    : {
        prompt,
        img_url: frameUrl,
      };

  return submitAndMaybeWait(model, input, parameters, { wait: true, ...opts });
}

export async function pollWanVideoTask(taskId: string): Promise<WanVideoResult> {
  const done = await wanPollTask(taskId);
  const out = (done.output as Record<string, unknown>) ?? {};
  const url = String(out.video_url ?? "");
  if (!url) throw new Error(`wan video: no video_url for task ${taskId}`);
  return { url, taskId, model: wanVideoModel(), provider: "wan" };
}
