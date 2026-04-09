import type { ReactNode } from 'react';
import { Search, Boxes, Sparkles, Zap, ArrowUpCircle, Palette, Brain, ExternalLink } from 'lucide-react';
import type { ComfyUIWorkflow } from '../../../types/comfyui';
import { NODE_REGISTRY } from '../../../data/node-registry';
import { getLiveNodeCache } from '../../../services/comfyui-backend';

export interface BrainstormChip {
  id: string;
  label: string;
  icon: ReactNode;
  prompt: string;
  category: 'model' | 'pack' | 'technique' | 'explore' | 'convert';
  forceBuildMode?: boolean;
}

export const BRAINSTORM_CHIPS: BrainstormChip[] = [
  {
    id: 'best-checkpoint',
    label: 'Best checkpoint',
    icon: <Sparkles className="w-3 h-3" />,
    prompt: 'What is the best quality Stable Diffusion / FLUX checkpoint model available right now for photorealistic image generation? Give me your top 3 recommendations with download links from HuggingFace or CivitAI, including VRAM requirements and the correct ComfyUI install folder path.',
    category: 'model',
  },
  {
    id: 'best-lora',
    label: 'Best LoRA',
    icon: <Palette className="w-3 h-3" />,
    prompt: 'What are the best LoRA models for photorealistic portraits right now? Give me your top 3 with download links, recommended strength settings, and which base model they work with.',
    category: 'model',
  },
  {
    id: 'best-clip',
    label: 'Best CLIP encoder',
    icon: <Brain className="w-3 h-3" />,
    prompt: 'What is the latest and highest quality CLIP / CLIP Vision encoder model available today? Compare the top options (OpenCLIP, SigCLIP, EVA-CLIP, etc.), tell me which to use with FLUX vs SDXL, and give download links.',
    category: 'model',
  },
  {
    id: 'best-upscaler',
    label: 'Best upscaler',
    icon: <ArrowUpCircle className="w-3 h-3" />,
    prompt: 'What are the best upscaler models for ComfyUI right now? Compare RealESRGAN, 4x-UltraSharp, NMKD-Siax, etc. Give me top 3 with download links and which works best for photos vs anime.',
    category: 'model',
  },
  {
    id: 'best-pack-workflow',
    label: 'Best pack for this',
    icon: <Boxes className="w-3 h-3" />,
    prompt: "Based on what we've been discussing and my current workflow, what custom node pack would improve it the most? Give me the pack name, what it adds, GitHub link, and how to install it.",
    category: 'pack',
  },
  {
    id: 'latest-packs',
    label: 'Latest node packs',
    icon: <Zap className="w-3 h-3" />,
    prompt: 'What are the most important new ComfyUI custom node packs released recently? Focus on packs that add genuinely useful new capabilities. Give GitHub links and a brief description of each.',
    category: 'pack',
  },
  {
    id: 'explain-technique',
    label: 'Explain technique',
    icon: <Search className="w-3 h-3" />,
    prompt: "I want to understand this image generation technique better. Can you explain how it works in ComfyUI, which nodes to use, and the typical workflow pattern? [I'll describe the technique]",
    category: 'technique',
  },
  {
    id: 'compare-approaches',
    label: 'Compare approaches',
    icon: <ExternalLink className="w-3 h-3" />,
    prompt: "Can you compare different ways to achieve the same result in ComfyUI? I want to understand the tradeoffs between speed, quality, and VRAM usage for each approach. [I'll describe what I want]",
    category: 'technique',
  },
];

function getNonCoreNodeTypes(workflow: ComfyUIWorkflow | null | undefined): string[] {
  if (!workflow?.nodes?.length) return [];
  const types = new Set<string>();
  const liveNodeTypes = new Set(Object.keys(getLiveNodeCache()?.nodes || {}));
  for (const node of workflow.nodes) {
    const type = String(node?.type || '').trim();
    if (!type) continue;
    const inLiveCache = liveNodeTypes.has(type);
    const inStaticRegistry = NODE_REGISTRY.has(type);
    if (type.startsWith('Swarm') || (!inLiveCache && !inStaticRegistry)) {
      types.add(type);
    }
  }
  return [...types].sort((a, b) => a.localeCompare(b));
}

function buildConvertToNativePrompt(nonCoreNodeTypes: string[]): string {
  const list = nonCoreNodeTypes.map((type) => `- ${type}`).join('\n');
  return `Convert this workflow to use only native ComfyUI nodes. Replace these custom nodes with standard equivalents:\n${list}\n\nKeep all model references, settings, and connections intact. Output the complete converted workflow.`;
}

export function getContextualChips(
  lastAiMessage: string,
  hasWorkflow: boolean,
  workflow?: ComfyUIWorkflow | null,
): BrainstormChip[] {
  const chips: BrainstormChip[] = [];
  const nonCoreNodeTypes = getNonCoreNodeTypes(workflow);

  if (/checkpoint|safetensors|\.ckpt/i.test(lastAiMessage)) {
    chips.push({
      id: 'find-model-link',
      label: 'Find download link',
      icon: <ExternalLink className="w-3 h-3" />,
      prompt: 'Can you give me the direct download link for the model you just mentioned? Include HuggingFace and CivitAI links if available, plus the correct install folder path.',
      category: 'model',
    });
  }

  if (/node.?pack|custom.?node|github\.com.*comfyui/i.test(lastAiMessage)) {
    chips.push({
      id: 'find-pack-link',
      label: 'Get install link',
      icon: <Boxes className="w-3 h-3" />,
      prompt: 'Give me the GitHub repository link and installation instructions for the node pack you just mentioned.',
      category: 'pack',
    });
  }

  if (hasWorkflow) {
    chips.push({
      id: 'apply-to-workflow',
      label: 'Apply to my workflow',
      icon: <Sparkles className="w-3 h-3" />,
      prompt: 'Switch to Build and apply these brainstorm changes to my current workflow.',
      category: 'technique',
    });
  }

  if (hasWorkflow && nonCoreNodeTypes.length > 0) {
    chips.push({
      id: 'convert-to-native',
      label: '⚡ Convert to Native',
      icon: <Zap className="w-3 h-3" />,
      prompt: buildConvertToNativePrompt(nonCoreNodeTypes),
      category: 'convert',
      forceBuildMode: true,
    });
  }

  chips.push({
    id: 'why-this',
    label: 'Why this choice?',
    icon: <Search className="w-3 h-3" />,
    prompt: 'Can you explain in more detail why you recommended this specific option over the alternatives? What are the technical advantages?',
    category: 'explore',
  });

  return chips;
}

const CHIP_CATEGORY_STYLES: Record<string, string> = {
  model: 'border-purple-500/25 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400/40',
  pack: 'border-cyan-500/25 text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-400/40',
  technique: 'border-amber-500/25 text-amber-300 hover:bg-amber-500/10 hover:border-amber-400/40',
  explore: 'border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-400/40',
  convert: 'border-orange-500/35 text-orange-300 hover:bg-orange-500/10 hover:border-orange-400/50',
};

interface BrainstormChipsBarProps {
  chips: BrainstormChip[];
  onSelect: (chip: BrainstormChip) => void;
  label?: string;
}

export function BrainstormChipsBar({ chips, onSelect, label }: BrainstormChipsBarProps) {
  if (chips.length === 0) return null;

  return (
    <div className="mt-2 px-1">
      {label && (
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="w-3 h-3 text-primary/70" />
          <span className="text-[10px] text-content-muted">{label}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <button
            key={chip.id}
            onClick={() => onSelect(chip)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border transition-all cursor-pointer ${CHIP_CATEGORY_STYLES[chip.category] || CHIP_CATEGORY_STYLES.explore}`}
            title={chip.prompt}
          >
            {chip.icon}
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
