import os, json, struct

path = r"E:\flux-models\FLUX.1-schnell-dev-merged-fp8.safetensors"
with open(path, "rb") as f:
    header_len = struct.unpack("<Q", f.read(8))[0]
    header = json.loads(f.read(header_len))

keys = list(header.keys())
print(f"Total tensors: {len(keys)}")

# Print first 20 keys to understand structure
print("\nFirst 20 keys:")
for k in keys[:20]:
    dt = header[k]
    print(f"  {k}: {dt.get('dtype','?')} shape={dt.get('shape',[])}")

# Check for VAE-related
vae_keys = [k for k in keys if "vae" in k.lower()]
print(f"\nVAE keys: {len(vae_keys)}")
for k in vae_keys[:3]:
    print(f"  {k}: {header[k].get('dtype','?')} shape={header[k].get('shape',[])}")

# Check for clip-related
clip_keys = [k for k in keys if any(x in k.lower() for x in ['clip', 'text_enc', 't5', 'encoder'])]
print(f"\nCLIP/encoder keys: {len(clip_keys)}")
for k in clip_keys[:5]:
    print(f"  {k}: {header[k].get('dtype','?')} shape={header[k].get('shape',[])}")