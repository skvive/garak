from huggingface_hub import HfApi
api = HfApi()

# Search for non-gated FLUX schnell full checkpoints
# These are community uploads containing model+clip+vae in one file
search_terms = ["flux1-schnell", "flux.1-schnell", "schnell-fp8", "schnell.safetensors"]
for term in search_terms:
    models = api.list_models(search=term, limit=20)
    for m in models:
        try:
            info = api.model_info(m.modelId)
            for f in info.siblings:
                if f.rfilename.endswith(".safetensors") and "flux" in f.rfilename.lower() and "schnell" in f.rfilename.lower():
                    size = getattr(f, "size", 0)
                    sz_gb = size / 1e9 if size else 0
                    print(f"{m.modelId}: {f.rfilename} ({sz_gb:.1f}GB)")
        except:
            pass