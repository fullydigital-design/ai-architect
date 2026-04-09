export interface OptimizerStrategy {
  id: string;
  name: string;
  icon: string;
  description: string;
  shortDescription: string;
  promptInjection: string;
  ratingWeights?: {
    overall: number;
    promptAdherence: number;
    aesthetics: number;
    detail: number;
    artifacts: number;
    speed?: number;
  };
}

export const OPTIMIZER_STRATEGIES: OptimizerStrategy[] = [
  {
    id: 'max-quality',
    name: 'Max Quality',
    icon: '💎',
    description: 'Push visual fidelity to the absolute maximum. Higher steps, better samplers, add refinement nodes.',
    shortDescription: 'Maximum visual fidelity',
    promptInjection: `OPTIMIZATION GOAL: MAXIMUM IMAGE QUALITY
Focus exclusively on producing the highest quality output possible. Speed is not a concern.
Specific tactics to consider:
- Increase KSampler steps to 30-50 range for maximum detail
- Use high-quality samplers: dpmpp_3m_sde, dpmpp_2m_sde with karras/exponential scheduler
- Add FreeU node with SDXL-optimized parameters (b1=1.3, b2=1.4, s1=0.9, s2=0.2) if not present
- Add a refiner pass (second KSampler at lower denoise 0.2-0.3) if model supports it
- Suggest upscale pipeline (latent upscale + second pass) if not already present
- Set CFG to sweet spot for the model type (SDXL: 7-8, SD1.5: 7-9, Flux: 1-2)
- Use optimal resolution for the model architecture
- Do NOT sacrifice quality for speed under any circumstance`,
    ratingWeights: { overall: 1.0, promptAdherence: 0.8, aesthetics: 1.2, detail: 1.3, artifacts: 1.1 },
  },
  {
    id: 'max-speed',
    name: 'Max Speed',
    icon: '⚡',
    description: 'Fastest possible generation. Reduce steps, use efficient samplers, trim unnecessary nodes.',
    shortDescription: 'Fastest generation time',
    promptInjection: `OPTIMIZATION GOAL: MAXIMUM SPEED
Focus exclusively on reducing generation time while maintaining acceptable quality.
Specific tactics to consider:
- Reduce KSampler steps to 15-20 (or even 8-12 with LCM/Turbo/Lightning)
- Use fast samplers: euler, euler_ancestral, lcm, uni_pc with normal/simple scheduler
- Remove unnecessary post-processing nodes (upscalers, refiners, face detectors) if present
- Lower resolution to model's base (SDXL: 1024x1024, SD1.5: 512x512)
- Use fp16 VAE decode if available
- Remove FreeU or other quality-enhancement nodes that add latency
- Suggest LCM LoRA or Turbo/Lightning model variant if applicable
- CFG can be lowered (4-6) for faster convergence
- Quality loss is acceptable if it significantly improves speed`,
    ratingWeights: { overall: 0.8, promptAdherence: 0.7, aesthetics: 0.6, detail: 0.5, artifacts: 0.7, speed: 1.5 },
  },
  {
    id: 'balanced',
    name: 'Balanced',
    icon: '⚖️',
    description: 'Best quality-to-speed ratio. Smart optimizations that improve quality without major speed cost.',
    shortDescription: 'Best quality/speed ratio',
    promptInjection: `OPTIMIZATION GOAL: BALANCED QUALITY AND SPEED
Find the sweet spot between image quality and generation speed. Every optimization should have a good quality-to-time ratio.
Specific tactics to consider:
- Set KSampler steps to efficient range: 22-28 (diminishing returns above 30)
- Use efficient high-quality samplers: dpmpp_2m_karras, dpmpp_2m_sde_karras
- Add FreeU if not present (minimal speed cost, noticeable quality gain)
- Keep resolution at model's native or slightly above
- Remove redundant or duplicate nodes
- CFG at the model's sweet spot (SDXL: 7, SD1.5: 7, Flux: 1)
- Only add upscale/refiner if the workflow is simple enough that speed won't double
- Do NOT add nodes that more than double generation time`,
    ratingWeights: { overall: 1.0, promptAdherence: 0.9, aesthetics: 1.0, detail: 1.0, artifacts: 1.0, speed: 0.8 },
  },
  {
    id: 'prompt-adherence',
    name: 'Prompt Match',
    icon: '🎯',
    description: 'Maximize how closely the output matches the text prompt. Better CFG, CLIP tuning, prompt structure.',
    shortDescription: 'Better prompt matching',
    promptInjection: `OPTIMIZATION GOAL: MAXIMUM PROMPT ADHERENCE
Focus on making the generated image match the text prompt as closely as possible.
Specific tactics to consider:
- Increase CFG scale to 7-9 range (stronger prompt guidance) but avoid over-saturation
- If using dual CLIP (SDXL), ensure both text encoders have the prompt
- Suggest prompt improvements: move important subjects to the front, use parentheses for emphasis
- Add CLIP text encode with negative prompt if missing (quality safeguards)
- Consider adding a ControlNet or IP-Adapter node for structural guidance if applicable
- Use samplers that respect CFG well: dpmpp_2m_karras, dpmpp_sde
- Avoid very low step counts that may not fully converge on the prompt
- Keep the same aesthetic quality but prioritize prompt faithfulness
- If the prompt mentions specific objects/subjects, ensure the workflow has enough steps to render them`,
    ratingWeights: { overall: 0.9, promptAdherence: 1.5, aesthetics: 0.7, detail: 0.8, artifacts: 0.9 },
  },
  {
    id: 'style-enhance',
    name: 'Style Enhance',
    icon: '🎨',
    description: 'Boost artistic and aesthetic quality. Better composition, colors, artistic sampler settings.',
    shortDescription: 'Artistic & aesthetic boost',
    promptInjection: `OPTIMIZATION GOAL: STYLE AND AESTHETIC ENHANCEMENT
Focus on making the image more visually striking and artistically appealing.
Specific tactics to consider:
- Use artistic samplers: dpmpp_3m_sde with karras/exponential scheduler for painterly quality
- Add FreeU with style-focused parameters if not present
- Suggest adding a style LoRA or aesthetic embedding if the workflow supports it
- Slightly increase steps (28-35) for smoother gradients and better composition
- CFG at moderate level (6-8) to allow creative interpretation while staying on-prompt
- Suggest adding color/contrast adjustment nodes if workflow supports post-processing
- Use high-quality VAE (sdxl_vae or model-specific) for better color reproduction
- Consider adding a second refiner pass at low denoise for extra polish
- Maintain artistic creativity — don't over-constrain the generation`,
    ratingWeights: { overall: 1.0, promptAdherence: 0.6, aesthetics: 1.5, detail: 1.0, artifacts: 0.9 },
  },
  {
    id: 'vram-optimize',
    name: 'VRAM Optimize',
    icon: '🖥️',
    description: 'Optimize for low-VRAM GPUs. Tiled VAE, lower resolution, memory-efficient settings.',
    shortDescription: 'Low VRAM / memory efficient',
    promptInjection: `OPTIMIZATION GOAL: MINIMIZE VRAM USAGE
Focus on making the workflow run on GPUs with limited VRAM (4-8GB) without out-of-memory errors.
Specific tactics to consider:
- Add VAETiledDecode / VAETiledEncode if not present (critical for low VRAM)
- Lower resolution to model's base (SDXL: 1024x1024, SD1.5: 512x512)
- Set batch size to 1 if it's higher
- Remove upscale nodes that increase tensor size in VRAM
- Use fp16 precision where available
- Reduce steps moderately (20-25) to reduce total VRAM peaks
- Avoid multiple simultaneous model loads (don't add refiner if base model is already loaded)
- If using ControlNet, suggest preprocessor-only mode with lower resolution
- Remove FreeU if VRAM is critical (it adds a small overhead)
- Quality can be slightly reduced to prevent OOM crashes`,
    ratingWeights: { overall: 0.8, promptAdherence: 0.7, aesthetics: 0.7, detail: 0.6, artifacts: 0.9, speed: 1.0 },
  },
  {
    id: 'custom',
    name: 'Custom Goal',
    icon: '✏️',
    description: 'Write your own optimization goal. Describe what you want the AI to focus on.',
    shortDescription: 'Your own optimization goal',
    promptInjection: '',
    ratingWeights: { overall: 1.0, promptAdherence: 1.0, aesthetics: 1.0, detail: 1.0, artifacts: 1.0 },
  },
];

export function getStrategyById(id: string): OptimizerStrategy | undefined {
  return OPTIMIZER_STRATEGIES.find((s) => s.id === id);
}

export function getDefaultStrategy(): OptimizerStrategy {
  return OPTIMIZER_STRATEGIES.find((s) => s.id === 'balanced')!;
}

