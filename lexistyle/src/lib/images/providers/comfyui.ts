/**
 * ComfyUI 로컬 이미지 생성 프로바이더
 * http://127.0.0.1:8188 — ComfyUI API
 *
 * 워크플로우 구조 (FLUX.1 schnell — UNet-only checkpoint + 별도 CLIP/VAE):
 *   CheckpointLoaderSimple → UNet (model)
 *   DualCLIPLoader → clip (t5xxl + clip_l)
 *   VAELoader → vae
 *   CLIPTextEncodeFlux → conditioning (clip_l + t5xxl 텍스트)
 *   KSampler → generate
 *   VAEDecode + SaveImage
 */
import type { GeneratedImage, ImageProvider, ImageSize } from "../types";

const COMFY_BASE = process.env.COMFYUI_BASE_URL || "http://127.0.0.1:8188";
const TIMEOUT_MS = 300_000; // 5분

const CKPT = "FLUX.1-schnell-dev-merged-fp8.safetensors";

// FLUX 워크플로우: CheckpointLoaderSimple(UNet) + DualCLIPLoader + VAELoader + CLIPTextEncodeFlux
const WF_T2I_FLUX = `{
  "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "${CKPT}"}},
  "2": {"class_type": "DualCLIPLoader", "inputs": {"clip_name1": "t5xxl_fp8_e4m3fn.safetensors", "clip_name2": "clip_l.safetensors", "type": "flux"}},
  "3": {"class_type": "VAELoader", "inputs": {"vae_name": "flux1-ae.safetensors"}},
  "4": {"class_type": "EmptyLatentImage", "inputs": {"width": 1024, "height": 1024, "batch_size": 1}},
  "5": {"class_type": "CLIPTextEncodeFlux", "inputs": {"clip": ["2", 0], "clip_l": "CLIP_L_PROMPT", "t5xxl": "T5XXL_PROMPT", "guidance": 3.5}},
  "5n": {"class_type": "CLIPTextEncodeFlux", "inputs": {"clip": ["2", 0], "clip_l": "", "t5xxl": "", "guidance": 3.5}},
  "6": {"class_type": "KSampler", "inputs": {"seed": 42, "steps": 4, "cfg": 1, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["1", 0], "positive": ["5", 0], "negative": ["5n", 0], "latent_image": ["4", 0]}},
  "7": {"class_type": "VAEDecode", "inputs": {"samples": ["6", 0], "vae": ["3", 0]}},
  "8": {"class_type": "SaveImage", "inputs": {"filename_prefix": "lexi-comfy-", "images": ["7", 0]}}
}`;

const SIZE_MAP: Record<ImageSize, { width: number; height: number }> = {
  square: { width: 1024, height: 1024 },
  portrait: { width: 768, height: 1344 },
  landscape: { width: 1344, height: 768 },
};

async function comfyPost(endpoint: string, body: unknown): Promise<any> {
  const res = await fetch(`${COMFY_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ComfyUI ${endpoint} ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function comfyGet(endpoint: string): Promise<any> {
  const res = await fetch(`${COMFY_BASE}${endpoint}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`ComfyUI GET ${endpoint} ${res.status}`);
  return res.json();
}

async function waitForImage(promptId: string, maxWaitMs = TIMEOUT_MS): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const history = await comfyGet(`/history/${promptId}`);
      const item = history[promptId];
      if (!item?.outputs) continue;
      for (const nodeId of Object.keys(item.outputs)) {
        const output = item.outputs[nodeId];
        const images = output?.images;
        if (images?.length > 0) {
          const img = images[0];
          return `${COMFY_BASE}/view?filename=${img.filename}&subfolder=${img.subfolder ?? ""}&type=${img.type ?? "output"}`;
        }
      }
    } catch {
      // 아직 처리 중
    }
  }
  throw new Error(`ComfyUI timeout (${maxWaitMs}ms): no image for prompt ${promptId}`);
}

async function workflowPrompt(workflowJson: string): Promise<string> {
  const body = { prompt: JSON.parse(workflowJson) };
  const result = await comfyPost("/prompt", body);
  return result.prompt_id;
}

export const comfyuiImageProvider: ImageProvider = {
  code: "comfyui",

  async textToImage(
    prompt: string,
    opts?: { size?: ImageSize; seed?: number },
  ): Promise<GeneratedImage> {
    const size = SIZE_MAP[opts?.size ?? "square"];
    // FLUX: clip_l(short) + t5xxl(detailed)
    const clipLPrompt = prompt.slice(0, 256);
    const t5xxlPrompt = prompt;

    let wf = WF_T2I_FLUX
      .replace("CLIP_L_PROMPT", clipLPrompt.replace(/"/g, "'").replace(/\n/g, " "))
      .replace("T5XXL_PROMPT", t5xxlPrompt.replace(/"/g, "'").replace(/\n/g, " "))
      .replace('"width": 1024', `"width": ${size.width}`)
      .replace('"height": 1024', `"height": ${size.height}`);

    if (opts?.seed != null) {
      wf = wf.replace('"seed": 42', `"seed": ${opts.seed}`);
    }

    const promptId = await workflowPrompt(wf);
    const url = await waitForImage(promptId);

    return {
      url,
      provider: "comfyui",
      model: "flux1-schnell-comfy",
    };
  },

  async removeBackground(url: string): Promise<GeneratedImage> {
    const wf = `{
      "10": {"class_type": "LoadImage", "inputs": {"image": "${url}"}},
      "3": {"class_type": "VAELoader", "inputs": {"vae_name": "flux1-ae.safetensors"}},
      "11": {"class_type": "BiRefNet", "inputs": {"images": ["10", 0]}},
      "12": {"class_type": "SaveImage", "inputs": {"filename_prefix": "lexi-comfy-rmbg-", "images": ["11", 0]}}
    }`;
    const promptId = await workflowPrompt(wf);
    const outUrl = await waitForImage(promptId);
    return {
      url: outUrl,
      provider: "comfyui",
      model: "birefnet-comfy",
    };
  },

  async editImage(url: string, instruction: string): Promise<GeneratedImage> {
    const wf = `{
      "20": {"class_type": "LoadImage", "inputs": {"image": "${url}"}},
      "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "${CKPT}"}},
      "2": {"class_type": "DualCLIPLoader", "inputs": {"clip_name1": "t5xxl_fp8_e4m3fn.safetensors", "clip_name2": "clip_l.safetensors", "type": "flux"}},
      "3": {"class_type": "VAELoader", "inputs": {"vae_name": "flux1-ae.safetensors"}},
"21": {"class_type": "CLIPTextEncodeFlux", "inputs": {"clip": ["2", 0], "clip_l": "${instruction.replace(/"/g, "'").slice(0,256)}", "t5xxl": "${instruction.replace(/"/g, "'")}", "guidance": 3.5}},
  "21n": {"class_type": "CLIPTextEncodeFlux", "inputs": {"clip": ["2", 0], "clip_l": "", "t5xxl": "", "guidance": 3.5}},
  "22": {"class_type": "KSampler", "inputs": {"seed": 42, "steps": 4, "cfg": 1, "sampler_name": "euler", "scheduler": "normal", "denoise": 0.6, "model": ["1", 0], "positive": ["21", 0], "negative": ["21n", 0], "latent_image": ["23", 0]}},
      "23": {"class_type": "VAEEncode", "inputs": {"pixels": ["20", 0], "vae": ["3", 0]}},
      "24": {"class_type": "SaveImage", "inputs": {"filename_prefix": "lexi-comfy-edit-", "images": ["22", 0]}}
    }`;
    const promptId = await workflowPrompt(wf);
    const outUrl = await waitForImage(promptId);
    return {
      url: outUrl,
      provider: "comfyui",
      model: "flux-kontext-comfy",
    };
  },
};