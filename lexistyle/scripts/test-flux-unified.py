"""FLUX 테스트 — E: 통합 ComfyUI (v0.28.0)"""
import json, urllib.request, time, sys

prompt = {"prompt": {
    "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "FLUX.1-schnell-dev-merged-fp8.safetensors"}},
    "2": {"class_type": "DualCLIPLoader", "inputs": {"clip_name1": "t5xxl_fp8_e4m3fn.safetensors", "clip_name2": "clip_l.safetensors", "type": "flux"}},
    "3": {"class_type": "VAELoader", "inputs": {"vae_name": "flux1-ae.safetensors"}},
    "4": {"class_type": "EmptyLatentImage", "inputs": {"width": 768, "height": 1024, "batch_size": 1}},
    "5": {"class_type": "CLIPTextEncodeFlux", "inputs": {"clip": ["2", 0], "clip_l": "chic fashion, elegant female model", "t5xxl": "Asian female model wearing elegant fashion studio portrait, soft lighting, full body, 4:5 vertical, high detail, editorial lookbook style, cream backdrop", "guidance": 3.5}},
    "6": {"class_type": "CLIPTextEncodeFlux", "inputs": {"clip": ["2", 0], "clip_l": "", "t5xxl": "", "guidance": 3.5}},
    "7": {"class_type": "KSampler", "inputs": {"seed": 42, "steps": 4, "cfg": 1, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["1", 0], "positive": ["5", 0], "negative": ["6", 0], "latent_image": ["4", 0]}},
    "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["3", 0]}},
    "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": "flux-test-", "images": ["8", 0]}}
}}

BASE = "http://127.0.0.1:8188"
req = urllib.request.Request(f"{BASE}/prompt", data=json.dumps(prompt).encode(), headers={"Content-Type": "application/json"})
resp = json.loads(urllib.request.urlopen(req, timeout=60).read())
pid = resp["prompt_id"]
print(f"Queued: {pid}", flush=True)

for i in range(300):
    time.sleep(2)
    try:
        h = json.loads(urllib.request.urlopen(f"{BASE}/history/{pid}", timeout=10).read())
        item = h.get(pid)
        if item:
            s = item.get("status", {})
            if s.get("status_str") == "error":
                print(f"ERROR: {s.get('error_message','?')}", flush=True)
                sys.exit(1)
            outputs = item.get("outputs", {})
            for nid in outputs:
                imgs = outputs[nid].get("images", [])
                if imgs:
                    fn = imgs[0]["filename"]
                    print(f"OK in {i*2}s: {fn}", flush=True)
                    img_data = urllib.request.urlopen(f"{BASE}/view?filename={fn}&type=output").read()
                    out = r"E:\cursor_HS\lexistyle\public\comfy-unified-test.png"
                    with open(out, "wb") as f:
                        f.write(img_data)
                    print(f"Saved {out} ({round(len(img_data)/1024,1)}KB)", flush=True)
                    sys.exit(0)
    except:
        if i % 10 == 0:
            print(f"  waiting {i*2}s...", flush=True)

print("TIMEOUT", flush=True)
sys.exit(1)