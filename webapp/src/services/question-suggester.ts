/**
 * Question Suggester — Phase 4 of Workflow Study Mode
 *
 * Generates contextual suggested questions based on the workflow analysis.
 * These are rendered as clickable pills so the user can quickly start
 * exploring an imported workflow in Study mode.
 */

import type { WorkflowAnalysis } from './workflow-analyzer';

export interface SuggestedQuestion {
  /** Short label shown on the pill */
  label: string;
  /** Full question sent to chat when clicked */
  question: string;
  /** Category for optional grouping / colour coding */
  category: 'overview' | 'technique' | 'node' | 'model' | 'pack' | 'improve';
}

const ARCH_NAMES: Record<string, string> = {
  sd15: 'Stable Diffusion 1.5',
  sdxl: 'SDXL',
  flux: 'FLUX',
  sd3: 'SD3',
  cascade: 'Stable Cascade',
  unknown: 'this architecture',
};

/**
 * Generate a set of suggested questions tailored to the given analysis.
 * Returns 5–8 questions, prioritised by relevance.
 */
export function generateSuggestedQuestions(analysis: WorkflowAnalysis): SuggestedQuestion[] {
  const questions: SuggestedQuestion[] = [];
  const arch = ARCH_NAMES[analysis.architecture] ?? analysis.architecture;

  // ── 1. Always: overview question ──────────────────────────────
  questions.push({
    label: 'Explain this workflow',
    question: 'Walk me through this entire workflow step by step. What does each stage do and how do the nodes connect?',
    category: 'overview',
  });

  // ── 2. Architecture ───────────────────────────────────────────
  if (analysis.architecture !== 'unknown') {
    questions.push({
      label: `Why ${arch}?`,
      question: `Why is this workflow built for ${arch}? What are the key settings and nodes specific to ${arch}, and how would it differ if converted to a different architecture?`,
      category: 'overview',
    });
  }

  // ── 3. Technique branches ─────────────────────────────────────
  const branchMap: Record<string, { label: string; question: string }> = {
    controlnet: {
      label: 'ControlNet setup',
      question: 'How does the ControlNet branch work in this workflow? What preprocessor and control model are used, and how do they influence the final image?',
    },
    ipadapter: {
      label: 'IP-Adapter usage',
      question: 'How is IP-Adapter used in this workflow? What does it contribute to the output, and what are the key settings like weight and noise?',
    },
    upscaling: {
      label: 'Upscale pipeline',
      question: 'How does the upscaling pipeline work? Is it using model-based or latent upscaling, and what denoise level is used for the second pass?',
    },
    inpainting: {
      label: 'Inpainting setup',
      question: 'How is inpainting set up in this workflow? What mask is being used and how is the VAE encoding handled for the inpaint region?',
    },
    animation: {
      label: 'Animation / video',
      question: 'How does the animation/video pipeline work in this workflow? What motion module is used and what are the frame settings?',
    },
    face: {
      label: 'Face processing',
      question: 'How does face detection and processing work in this workflow? What models and nodes are used for face restoration or swapping?',
    },
    lora: {
      label: 'LoRA setup',
      question: 'How are LoRAs applied in this workflow? What are the strength values, and where in the chain are they injected?',
    },
  };

  for (const branch of analysis.branches) {
    const key = branch.toLowerCase().replace(/[^a-z]/g, '');
    // Fuzzy match
    for (const [bk, bv] of Object.entries(branchMap)) {
      if (key.includes(bk)) {
        questions.push({ ...bv, category: 'technique' });
        break;
      }
    }
  }

  // ── 4. Model questions ────────────────────────────────────────
  if (analysis.modelSlots.length > 0) {
    const checkpoints = analysis.modelSlots.filter(s => s.category === 'checkpoint');
    if (checkpoints.length > 0) {
      const modelName = checkpoints[0].currentValue;
      questions.push({
        label: 'Model choice',
        question: `This workflow uses "${modelName}" as its checkpoint. What kind of model is this, what is it optimized for, and what would be good alternatives?`,
        category: 'model',
      });
    }

    const loraSlots = analysis.modelSlots.filter(s => s.category === 'lora');
    if (loraSlots.length > 0) {
      questions.push({
        label: 'LoRA recommendations',
        question: `What types of LoRAs would work well with this workflow? Are there specific LoRA categories (style, character, concept) that would complement the current setup?`,
        category: 'model',
      });
    }
  }

  // ── 5. Pack-specific questions ────────────────────────────────
  if (analysis.detectedPacks.length > 0) {
    const topPack = analysis.detectedPacks.sort((a, b) => b.nodeTypesUsed.length - a.nodeTypesUsed.length)[0];
    questions.push({
      label: `${topPack.packTitle} nodes`,
      question: `What nodes from ${topPack.packTitle} are used in this workflow, and what does each one do? Are there alternative nodes from the same pack that could enhance the result?`,
      category: 'pack',
    });

    if (analysis.detectedPacks.length > 1) {
      questions.push({
        label: 'Required packs',
        question: `What custom node packs does this workflow require? Which are essential vs optional, and where can I install them?`,
        category: 'pack',
      });
    }
  }

  // ── 6. Unknown nodes ──────────────────────────────────────────
  if (analysis.unknownNodes.length > 0) {
    questions.push({
      label: 'Unknown nodes',
      question: `There are ${analysis.unknownNodes.length} unrecognized node type(s) in this workflow: ${analysis.unknownNodes.slice(0, 5).join(', ')}${analysis.unknownNodes.length > 5 ? '...' : ''}. What might these nodes do based on their names and connections?`,
      category: 'node',
    });
  }

  // ── 7. KSampler settings (almost always present) ──────────────
  questions.push({
    label: 'Sampler settings',
    question: 'What sampler, scheduler, CFG, and step count settings are used in this workflow? Why were these values chosen, and what would happen if I changed them?',
    category: 'node',
  });

  // ── 8. Improvement suggestions ────────────────────────────────
  if (analysis.complexity === 'simple' || analysis.complexity === 'moderate') {
    questions.push({
      label: 'How to improve',
      question: 'What additions or modifications could improve the output quality of this workflow? Consider techniques like upscaling, ControlNet, IP-Adapter, or LoRA.',
      category: 'improve',
    });
  } else {
    questions.push({
      label: 'Simplify this',
      question: 'This workflow is quite complex. Could it be simplified while maintaining similar output quality? What nodes or branches could be removed or consolidated?',
      category: 'improve',
    });
  }

  // Deduplicate by label and cap at 8
  const seen = new Set<string>();
  return questions.filter(q => {
    if (seen.has(q.label)) return false;
    seen.add(q.label);
    return true;
  }).slice(0, 8);
}
