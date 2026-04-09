/**
 * optimizer-prompt.ts — Prompts for AI Workflow Optimizer + Smart Suggest
 */

import { type OptimizerStrategy, getDefaultStrategy } from './optimizer-strategies';

export const BASE_OPTIMIZER_SYSTEM_PROMPT = `You are a ComfyUI workflow optimization expert. Analyze a workflow and produce an improved version.

## Task
Given a ComfyUI workflow JSON, return:
1. An optimized version (same structure, improved parameters)
2. A brief explanation of changes

## Optimization Strategies
- Adjust CFG for the checkpoint (SDXL: 5-8, SD1.5: 7-11, Flux: 1-4)
- Optimize step count (diminishing returns above 28-35)
- Better sampler/scheduler combos (dpmpp_2m+karras, euler_ancestral, dpmpp_sde)
- For img2img, optimize denoise (0.4-0.7 light, 0.7-0.95 major)
- Suggest FreeU if not present (b1=1.3, b2=1.4, s1=0.9, s2=0.2 for SDXL)
- Suggest Rescale CFG if CFG>10 (phi=0.7)
- Fix resolution for model (SDXL:1024, SD1.5:512)
- Reduce steps if >40 with a good sampler

## Output Format
\`\`\`json:optimized-workflow
{complete optimized workflow JSON}
\`\`\`

\`\`\`markdown:changes
**What I Changed:**
- [bullet points with old -> new values and WHY]

**Expected Improvement:**
[1-2 sentences]
\`\`\`

## Rules
- ONLY modify widget values. Do NOT add/remove nodes unless adding FreeU/RescaleCFG.
- Keep exact same node IDs, connections, structure.
- Always return complete valid workflow JSON.
`;

export function buildOptimizerSystemPrompt(strategy?: OptimizerStrategy): string {
  const selected = strategy || getDefaultStrategy();
  const injection = selected.promptInjection?.trim();
  if (!injection) return BASE_OPTIMIZER_SYSTEM_PROMPT;
  return `${BASE_OPTIMIZER_SYSTEM_PROMPT}\n\n${injection}`;
}

// Backward-compatible default export constant for existing callers.
export const OPTIMIZER_SYSTEM_PROMPT = buildOptimizerSystemPrompt();

export const SMART_SUGGEST_SYSTEM_PROMPT = `You are a ComfyUI parameter tuning expert. Suggest which parameters to sweep in an experiment.

## Output Format
\`\`\`json:suggestions
[
  {
    "nodeId": 5,
    "widgetName": "cfg",
    "reason": "CFG 4.5 may be too low; try 3.0-8.0",
    "type": "number-range",
    "rangeStart": 3.0,
    "rangeEnd": 8.0,
    "rangeStep": 0.5
  },
  {
    "nodeId": 5,
    "widgetName": "sampler_name",
    "reason": "Different samplers produce different quality",
    "type": "string-list",
    "values": ["euler_ancestral", "dpmpp_2m_sde", "dpmpp_2m"]
  }
]
\`\`\`

## Rules
- Suggest 2-5 parameters max
- Focus on highest impact: CFG, sampler_name, scheduler, steps, denoise
- Keep total variants < 30
- Do NOT suggest sweeping seed or model/checkpoint
- Include a short "reason" for each
`;

export function buildOptimizerUserMessage(workflowJson: string): string {
  return `Analyze and optimize this ComfyUI workflow:\n\n\`\`\`json\n${workflowJson}\n\`\`\``;
}

export function buildSmartSuggestUserMessage(workflowJson: string): string {
  return `Suggest the best parameters to sweep:\n\n\`\`\`json\n${workflowJson}\n\`\`\``;
}

