# FLUX Workflow Builder

Build and execute a ComfyUI workflow for a FLUX or FLUX 2 model.

## How to use

The user will describe what they want to generate. Ask if not specified:
- Which model variant? (FLUX 1 Dev/Schnell, FLUX 2 Klein 9B, FLUX 2 Full)
- What is the positive prompt?
- Resolution (default 1024×1024)
- Steps (default 25), seed (default random)

Then build and call `mcp__comfyui-architect__execute_workflow` with the correct node graph below.

---

## Architecture Reference

### FLUX 1 Dev / Schnell

```
DualCLIPLoader  clip_name1=clip_l.safetensors  clip_name2=t5xxl_enconly.safetensors  type=flux
CLIPTextEncodeFlux  clip_l="short booster"  t5xxl="full detailed prompt"  guidance=3.5
CLIPTextEncodeFlux  clip_l=""  t5xxl=""  guidance=3.5   ← separate node for negative
UNETLoader  unet_name=<flux1-dev.safetensors or flux1-schnell.safetensors>  weight_dtype=default
VAELoader  vae_name=ae.safetensors   (or Flux\flux1-vae.safetensors)
EmptyLatentImage  width=1024  height=1024  batch_size=1
ModelSamplingFlux  max_shift=1.15  base_shift=0.5  width=1024  height=1024
KSampler  cfg=1.0  sampler_name=euler  scheduler=simple  steps=20  denoise=1.0
VAEDecode
SaveImage  filename_prefix=Flux1_Output
```

**CLIP note:** CLIPTextEncodeFlux outputs ONE conditioning (slot 0). Never reference slot 1 as negative — always use a second CLIPTextEncodeFlux node with empty strings for negative.

---

### FLUX 2 Klein 9B  ← VERIFIED WORKING

**Text encoder:** Qwen3-8B. It extracts hidden states from layers 9, 18, 27 and concatenates them → 3 × 4096 = **12,288-dim** embeddings. The model's `txt_in` layer expects exactly 12,288.

**DO NOT use:**
- `DualCLIPLoader` with `clip_l` + `mistral_3_small_flux2` + type `flux` → wrong dims, crashes in txt_in
- `CLIPTextEncodeFlux` → designed for FLUX 1 dual-encoder format

**Correct setup:**
```
CLIPLoader  clip_name=qwen_3_8b_fp8mixed.safetensors  type=flux2
CLIPTextEncode  text="<full prompt>"  → FluxGuidance  guidance=3.5   ← positive
CLIPTextEncode  text=""               → FluxGuidance  guidance=3.5   ← negative
UNETLoader  unet_name=flux-2-klein-9b.safetensors  weight_dtype=default
VAELoader  vae_name=Flux\flux2-vae.safetensors
EmptyFlux2LatentImage  width=1024  height=1024  batch_size=1
ModelSamplingFlux  max_shift=1.15  base_shift=0.5  width=1024  height=1024
KSampler  cfg=1.0  sampler_name=euler  scheduler=simple  steps=25  denoise=1.0
VAEDecode
SaveImage  filename_prefix=Klein9B_Output
```

**Verified workflow JSON (ready to copy into execute_workflow):**

```json
{
  "1": { "class_type": "UNETLoader", "inputs": { "unet_name": "flux-2-klein-9b.safetensors", "weight_dtype": "default" } },
  "2": { "class_type": "CLIPLoader", "inputs": { "clip_name": "qwen_3_8b_fp8mixed.safetensors", "type": "flux2" } },
  "3": { "class_type": "VAELoader", "inputs": { "vae_name": "Flux\\flux2-vae.safetensors" } },
  "4": { "class_type": "CLIPTextEncode", "inputs": { "clip": ["2", 0], "text": "POSITIVE_PROMPT_HERE" } },
  "11": { "class_type": "FluxGuidance", "inputs": { "conditioning": ["4", 0], "guidance": 3.5 } },
  "10": { "class_type": "CLIPTextEncode", "inputs": { "clip": ["2", 0], "text": "" } },
  "12": { "class_type": "FluxGuidance", "inputs": { "conditioning": ["10", 0], "guidance": 3.5 } },
  "5": { "class_type": "EmptyFlux2LatentImage", "inputs": { "width": 1024, "height": 1024, "batch_size": 1 } },
  "6": { "class_type": "ModelSamplingFlux", "inputs": { "model": ["1", 0], "max_shift": 1.15, "base_shift": 0.5, "width": 1024, "height": 1024 } },
  "7": { "class_type": "KSampler", "inputs": { "model": ["6", 0], "positive": ["11", 0], "negative": ["12", 0], "latent_image": ["5", 0], "seed": 42, "steps": 25, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0 } },
  "8": { "class_type": "VAEDecode", "inputs": { "samples": ["7", 0], "vae": ["3", 0] } },
  "9": { "class_type": "SaveImage", "inputs": { "images": ["8", 0], "filename_prefix": "Klein9B_Output" } }
}
```

---

### FLUX 2 Full (Mistral 24B encoder)

```
CLIPLoader  clip_name=mistral_3_small_flux2.safetensors  type=flux2
CLIPTextEncode  → FluxGuidance  guidance=3.5
(same pipeline as Klein but with mistral encoder)
```

---

## Installed models (E:\_AI_IMG\_models)

| Role | File |
|------|------|
| FLUX 2 Klein 9B UNET | `flux-2-klein-9b.safetensors` |
| FLUX 2 VAE | `Flux\flux2-vae.safetensors` |
| Qwen3-8B (fp8) | `qwen_3_8b_fp8mixed.safetensors` |
| Qwen3-8B (full) | `qwen_3_8b.safetensors` |
| Qwen3-4B | `qwen_3_4b.safetensors` |
| Mistral 3 Small | `mistral_3_small_flux2.safetensors` |
| CLIP-L | `clip_l.safetensors` |
| T5-XXL | `t5xxl_enconly.safetensors` |

---

## Known fixes / gotchas

1. **Windows OSError [Errno 22] in logger.py** — `E:\_AI_IMG\ComfyUI\app\logger.py` has been patched to catch OSError in `write()`. If this reappears after a ComfyUI update, re-apply the try/except around `super().write(data)` on the write method.

2. **Negative conditioning null crash** — `CLIPTextEncodeFlux` has only 1 output (slot 0). Using `["node_id", 1]` for negative returns null and crashes in `convert_cond`. Always use a dedicated separate encoder node for negative.

3. **FLUX 2 uses EmptyFlux2LatentImage** not `EmptyLatentImage`.

4. **ModelSamplingFlux is required** for both FLUX 1 and FLUX 2 — it adjusts the sigma schedule for flow matching.

5. **Portrait aspect:** Use 832×1216 or 896×1152 for portrait; landscape use 1216×832.
