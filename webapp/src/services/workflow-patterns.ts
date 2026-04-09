/**
 * Phase 11B - Golden Workflow Patterns
 *
 * Compact known-correct connection snippets to improve AI generation quality.
 */

export const WORKFLOW_PATTERNS = `
=== COMFYUI CONNECTION PATTERNS (reference for correct workflow generation) ===

TYPE RULES:
- MODEL: Checkpoint/UNet Loader -> LoRA Loader(s) -> KSampler.model
- CLIP: Checkpoint Loader -> CLIPTextEncode.clip (for positive and negative)
- CONDITIONING: CLIPTextEncode -> KSampler.positive / KSampler.negative
- LATENT: EmptyLatentImage -> KSampler.latent_image -> VAEDecode.samples
- IMAGE: VAEDecode -> SaveImage/PreviewImage, or LoadImage -> processors
- VAE: Checkpoint Loader -> VAEDecode.vae (required)
- NEVER connect MODEL to CLIP, LATENT to IMAGE directly, or CONDITIONING to MODEL

PATTERN 1: Basic txt2img (API format)
{"1":{"class_type":"CheckpointLoaderSimple","inputs":{"ckpt_name":"<checkpoint>"}},"2":{"class_type":"CLIPTextEncode","inputs":{"text":"<positive prompt>","clip":["1",1]}},"3":{"class_type":"CLIPTextEncode","inputs":{"text":"<negative prompt>","clip":["1",1]}},"4":{"class_type":"EmptyLatentImage","inputs":{"width":1024,"height":1024,"batch_size":1}},"5":{"class_type":"KSampler","inputs":{"model":["1",0],"positive":["2",0],"negative":["3",0],"latent_image":["4",0],"seed":0,"steps":20,"cfg":7,"sampler_name":"euler","scheduler":"normal","denoise":1}},"6":{"class_type":"VAEDecode","inputs":{"samples":["5",0],"vae":["1",2]}},"7":{"class_type":"SaveImage","inputs":{"images":["6",0],"filename_prefix":"output"}}}

KEY SLOTS (CheckpointLoaderSimple outputs):
[0]=MODEL, [1]=CLIP, [2]=VAE

PATTERN 2: img2img
Replace EmptyLatentImage with LoadImage + VAEEncode:
LoadImage[0]=IMAGE -> VAEEncode.pixels, Checkpoint[2]=VAE -> VAEEncode.vae, VAEEncode[0]=LATENT -> KSampler.latent_image.
Use KSampler denoise 0.5-0.8.

PATTERN 3: LoRA
Insert LoraLoader between Checkpoint and CLIPTextEncode:
LoraLoader.model <- Checkpoint[0], LoraLoader.clip <- Checkpoint[1]
Then use LoraLoader[0]=MODEL for sampler and LoraLoader[1]=CLIP for encoders.

PATTERN 4: Upscale chain
UpscaleModelLoader[0]=UPSCALE_MODEL -> ImageUpscaleWithModel.upscale_model
VAEDecode[0]=IMAGE -> ImageUpscaleWithModel.image -> SaveImage.images

PATTERN 5: ControlNet
ControlNetLoader[0]=CONTROL_NET -> ControlNetApplyAdvanced.control_net
Preprocessor[0]=IMAGE -> ControlNetApplyAdvanced.image
CLIP conditioning -> ControlNetApplyAdvanced positive/negative -> KSampler positive/negative

=== END PATTERNS ===
`;

export function getWorkflowPatterns(): string {
  return WORKFLOW_PATTERNS;
}

export function getTypeSystemCheatSheet(): string {
  return `
COMFYUI TYPE SYSTEM:
CheckpointLoaderSimple outputs: [0]=MODEL [1]=CLIP [2]=VAE
KSampler requires: model:MODEL, positive:CONDITIONING, negative:CONDITIONING, latent_image:LATENT
CLIPTextEncode requires: text:STRING, clip:CLIP -> [0]=CONDITIONING
VAEDecode requires: samples:LATENT, vae:VAE -> [0]=IMAGE
VAEEncode requires: pixels:IMAGE, vae:VAE -> [0]=LATENT
EmptyLatentImage -> [0]=LATENT
SaveImage requires: images:IMAGE
LoadImage -> [0]=IMAGE [1]=MASK
LoraLoader requires: model:MODEL, clip:CLIP -> [0]=MODEL [1]=CLIP
ControlNetLoader -> [0]=CONTROL_NET
`;
}

