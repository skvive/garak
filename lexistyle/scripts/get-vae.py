from huggingface_hub import hf_hub_download, HfApi
import os

os.environ["HF_HOME"] = r"E:\flux-models\.hf-cache"

api = HfApi()
info = api.model_info("AiAF/Flux-Dev1-VAE.safetensors")
siblings = [s for s in info.siblings]

print("All files in AiAF/Flux-Dev1-VAE.safetensors:")
for s in siblings:
    print(f"  {s.rfilename}")

# Try downloading
path = hf_hub_download(
    repo_id="AiAF/Flux-Dev1-VAE.safetensors",
    filename=siblings[0].rfilename,
    local_dir=r"E:\flux-models\vae"
)
sz = os.path.getsize(path)
print(f"\nDownloaded: {path}")
print(f"Size: {sz/1e6:.0f}MB")

# Verify VAELoader can find it
print(f"\nFile: {os.path.basename(path)}")
print(f"Dir: {os.path.dirname(path)}")
# Rename if needed
if "Flux-Dev1-VAE.safetensors" in path:
    import shutil
    newname = os.path.join(r"E:\flux-models\vae", "flux-dev1-vae.safetensors")
    if "Flux-Dev1-VAE" not in path:
        shutil.copy(path, newname)
        print(f"Copied to: {newname}")