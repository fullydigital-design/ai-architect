import { fetchInstalledEnvironment, type InstalledEnvironment } from '../services/comfyui-scanner';
import { getComfyUIBaseUrl } from '../services/api-config';

export function buildEnvironmentPrompt(
  env: InstalledEnvironment,
  options?: { includeModelLists?: boolean },
): string {
  const includeModelLists = options?.includeModelLists !== false;
  const sections: string[] = [];

  sections.push('\n---');
  sections.push('## YOUR COMFYUI ENVIRONMENT');
  sections.push('### Model Selection Rules');
  sections.push('- PREFER models that are already installed in the environment lists below.');
  sections.push('- If the user explicitly requests a specific architecture (Flux, SD3, SDXL, etc.) and models are missing, STILL generate the full workflow with canonical filenames for that architecture.');
  sections.push('- Do NOT refuse workflow generation because models are missing. Generate the workflow and clearly list required missing models in the response.');
  sections.push('- The app includes a Model Download feature that detects missing filenames and offers one-click downloads.\n');
  sections.push('Standard fallback filenames when requested architecture is missing:');
  sections.push('- Flux.1-dev: flux1-dev.safetensors + clip_l.safetensors + t5xxl_fp8_e4m3fn.safetensors + ae.safetensors');
  sections.push('- Flux.1-schnell: flux1-schnell.safetensors + clip_l.safetensors + t5xxl_fp8_e4m3fn.safetensors + ae.safetensors');
  sections.push('- SDXL: sd_xl_base_1.0.safetensors');
  sections.push('- SD 1.5: v1-5-pruned-emaonly.safetensors\n');

  const pushList = (title: string, values: string[]) => {
    if (values.length === 0) return;
    sections.push(`${title} (${values.length})`);
    values.forEach((m) => sections.push(`- ${m}`));
    sections.push('');
  };

  if (includeModelLists) {
    pushList('### Checkpoints - use for ckpt_name', env.checkpoints);
    pushList('### LoRAs - use for lora_name', env.loras);
    pushList('### VAEs - use for vae_name', env.vaes);
    pushList('### UNets/Diffusion Models - use for unet_name', env.unets);
    pushList('### CLIP Models - use for clip_name', env.clips);
    pushList('### CLIP Vision Models - use for clip_name', env.clip_vision);
    pushList('### ControlNet Models', env.controlnets);
    pushList('### Upscale Models', env.upscale_models);
  } else {
    sections.push('### Model filenames');
    sections.push('- Model file lists are provided separately in the Model Library context section.');
    sections.push('');
  }

  sections.push('### Samplers');
  sections.push(env.samplers.join(', '));
  sections.push('');

  sections.push('### Schedulers');
  sections.push(env.schedulers.join(', '));
  sections.push('');

  sections.push(`### Available Node Types (${env.totalNodes} total)`);
  sections.push('Use ONLY these class_type values. Do NOT invent node names.');
  const nodeList = env.nodeTypes.slice(0, 300);
  sections.push(nodeList.join(', '));
  if (env.nodeTypes.length > 300) {
    sections.push(`... and ${env.nodeTypes.length - 300} more specialized nodes.`);
  }
  sections.push('');

  return sections.join('\n');
}

export async function buildEnvironmentPromptFromComfyUI(
  comfyuiUrl = getComfyUIBaseUrl(),
  options?: { includeModelLists?: boolean },
): Promise<{
  prompt: string;
  environment: InstalledEnvironment;
}> {
  const environment = await fetchInstalledEnvironment(comfyuiUrl);
  return {
    prompt: buildEnvironmentPrompt(environment, options),
    environment,
  };
}
