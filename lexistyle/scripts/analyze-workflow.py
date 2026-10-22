import os
from huggingface_hub import hf_hub_download
import json

# Download workflow file
os.environ["HF_HOME"] = r"E:\flux-models\.hf-cache"
path = hf_hub_download(
    repo_id="drbaph/FLUX.1-schnell-dev-merged-fp8",
    filename="ComfyUI Workflow/ComfyUI Workflow_Flux.1-Schnell-Dev-merged-fp8 + Upscaler.json",
    local_dir=r"E:\flux-models\tmp"
)
print("Workflow downloaded to:", path)

with open(path, encoding="utf-8") as f:
    wf = json.load(f)

# Print all node types and checkpoints/VAEs/CLIPs
for nid, node in wf.items():
    if not isinstance(node, dict):
        continue
    ct = node.get("class_type", "")
    inputs = node.get("inputs", {})
    print(f"Node {nid}: {ct}")
    for k, v in inputs.items():
        if isinstance(v, list):
            print(f"    {k}: -> [{v[0]}, ref]")
        elif isinstance(v, str) and (".safetensors" in v or ".bin" in v or ".pt" in v or "/" in v):
            print(f'    {k}: "{v}"')