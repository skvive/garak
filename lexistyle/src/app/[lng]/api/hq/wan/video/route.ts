import { NextResponse } from "next/server";
import { bad, hqActor, unauthorized } from "@/lib/hq/auth";
import { wanConfigured } from "@/lib/wan/config";
import {
  generateWanImageToVideo,
  generateWanTextToVideo,
  pollWanVideoTask,
  type WanVideoRatio,
  type WanVideoResolution,
} from "@/lib/wan/video";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Body = {
  mode?: "t2v" | "i2v" | "poll";
  prompt?: string;
  /** i2v: 첫 프레임 공개 URL */
  imageUrl?: string;
  taskId?: string;
  duration?: number;
  resolution?: WanVideoResolution;
  ratio?: WanVideoRatio;
  seed?: number;
  /** true면 task_id만 반환(폴링은 클라이언트/별도 호출) */
  async?: boolean;
};

/**
 * Wan MaaS 마케팅 영상 생성.
 * POST { mode: "t2v"|"i2v"|"poll", prompt?, imageUrl?, taskId?, duration?, resolution?, ratio? }
 */
export async function POST(req: Request) {
  if (!(await hqActor(req))) return unauthorized();
  if (!wanConfigured()) {
    return bad("WAN_API_KEY (or DASHSCOPE_API_KEY) not configured", 503);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("invalid json");
  }

  const mode = body.mode ?? (body.taskId ? "poll" : body.imageUrl ? "i2v" : "t2v");

  try {
    if (mode === "poll") {
      if (!body.taskId?.trim()) return bad("taskId required");
      const result = await pollWanVideoTask(body.taskId.trim());
      return NextResponse.json({ ok: true, ...result });
    }

    const prompt = body.prompt?.trim();
    if (!prompt) return bad("prompt required");

    const opts = {
      duration: body.duration,
      resolution: body.resolution,
      ratio: body.ratio,
      seed: body.seed,
      wait: !body.async,
    };

    if (mode === "i2v") {
      if (!body.imageUrl?.trim()) return bad("imageUrl required for i2v");
      const result = await generateWanImageToVideo(body.imageUrl.trim(), prompt, opts);
      return NextResponse.json({ ok: true, ...result });
    }

    const result = await generateWanTextToVideo(prompt, opts);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "wan video failed", 502);
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: wanConfigured(),
    modes: ["t2v", "i2v", "poll"],
  });
}
