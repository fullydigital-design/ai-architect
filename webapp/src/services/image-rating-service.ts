/**
 * AI Image Rating Service
 * Sends generated images to a vision-capable AI model for quality assessment.
 */

export interface ImageRating {
  imageUrl: string;
  variantLabel: string;
  scores: {
    overall: number;
    promptAdherence: number;
    aesthetics: number;
    detail: number;
    artifacts: number;
  } & Record<string, number>;
  reasoning: string;
  rank: number;
  weightedScore?: number;
}

export interface RatingResult {
  ratings: ImageRating[];
  bestVariant: string;
  summary: string;
  success: boolean;
  error?: string;
}

export interface RatingMode {
  id: string;
  name: string;
  icon: string;
  description: string;
  criteria: RatingCriterion[];
  promptExtra: string;
}

export interface RatingCriterion {
  key: string;
  label: string;
  weight: number;
  description: string;
}

export const RATING_MODES: RatingMode[] = [
  {
    id: 'overall',
    name: 'Overall Quality',
    icon: '⭐',
    description: 'Balanced assessment of all quality aspects',
    criteria: [
      { key: 'overall', label: 'Overall', weight: 1.0, description: 'General image quality' },
      { key: 'promptAdherence', label: 'Prompt Match', weight: 1.0, description: 'How well it matches the text prompt' },
      { key: 'aesthetics', label: 'Aesthetics', weight: 1.0, description: 'Composition, color, lighting' },
      { key: 'detail', label: 'Detail', weight: 1.0, description: 'Sharpness and fine detail' },
      { key: 'artifacts', label: 'No Artifacts', weight: 1.0, description: 'Absence of visual defects' },
    ],
    promptExtra: 'Rate all criteria equally - give a balanced overall assessment.',
  },
  {
    id: 'quality-focus',
    name: 'Quality Focus',
    icon: '💎',
    description: 'Emphasize visual fidelity, detail, and technical quality',
    criteria: [
      { key: 'overall', label: 'Overall', weight: 1.0, description: 'General image quality' },
      { key: 'promptAdherence', label: 'Prompt Match', weight: 0.7, description: 'How well it matches the text prompt' },
      { key: 'aesthetics', label: 'Aesthetics', weight: 1.2, description: 'Composition, color, lighting' },
      { key: 'detail', label: 'Detail', weight: 1.5, description: 'Sharpness and fine detail - MOST IMPORTANT' },
      { key: 'artifacts', label: 'No Artifacts', weight: 1.3, description: 'Absence of visual defects - HIGH PRIORITY' },
    ],
    promptExtra: `RATING FOCUS: TECHNICAL QUALITY
Pay extra attention to:
- Fine detail quality - mentally zoom in for sharp textures and clean edges
- Artifact detection - blur, banding, deformations, broken geometry
- Overall rendering polish
Prompt adherence is less important than raw visual quality for this rating.`,
  },
  {
    id: 'speed-vs-quality',
    name: 'Speed vs Quality',
    icon: '⚡',
    description: 'Judge quality relative to generation speed',
    criteria: [
      { key: 'overall', label: 'Overall', weight: 0.8, description: 'General image quality' },
      { key: 'promptAdherence', label: 'Prompt Match', weight: 0.7, description: 'How well it matches the text prompt' },
      { key: 'aesthetics', label: 'Aesthetics', weight: 0.8, description: 'Composition, color, lighting' },
      { key: 'detail', label: 'Detail', weight: 0.6, description: 'Sharpness (less important for speed)' },
      { key: 'artifacts', label: 'No Artifacts', weight: 0.9, description: 'Absence of visual defects' },
      { key: 'efficiency', label: 'Efficiency', weight: 1.5, description: 'Quality per unit time - MOST IMPORTANT' },
    ],
    promptExtra: `RATING FOCUS: SPEED VS QUALITY TRADEOFF
Consider generation times provided with each image:
- If quality is close, faster image should score higher
- Minor quality loss is acceptable when speed gain is significant
- Add "efficiency" score (1-10) for quality per unit time
Include this field in scores: "efficiency": <1-10>`,
  },
  {
    id: 'prompt-match',
    name: 'Prompt Match',
    icon: '🎯',
    description: 'Focus on prompt adherence',
    criteria: [
      { key: 'overall', label: 'Overall', weight: 0.8, description: 'General image quality' },
      { key: 'promptAdherence', label: 'Prompt Match', weight: 1.8, description: 'How well it matches the text prompt - MOST IMPORTANT' },
      { key: 'aesthetics', label: 'Aesthetics', weight: 0.6, description: 'Composition, color, lighting' },
      { key: 'detail', label: 'Detail', weight: 0.7, description: 'Sharpness and fine detail' },
      { key: 'artifacts', label: 'No Artifacts', weight: 0.8, description: 'Absence of visual defects' },
    ],
    promptExtra: `RATING FOCUS: PROMPT ADHERENCE
Check whether prompt subjects, objects, style, mood, and details are present and accurate.
Prompt matching is most important for this rating.`,
  },
  {
    id: 'aesthetic',
    name: 'Aesthetic Judge',
    icon: '🎨',
    description: 'Evaluate artistic quality and visual impact',
    criteria: [
      { key: 'overall', label: 'Overall', weight: 1.0, description: 'General image quality' },
      { key: 'promptAdherence', label: 'Prompt Match', weight: 0.5, description: 'How well it matches the text prompt' },
      { key: 'aesthetics', label: 'Aesthetics', weight: 1.8, description: 'Composition, color harmony, lighting - MOST IMPORTANT' },
      { key: 'detail', label: 'Detail', weight: 1.0, description: 'Sharpness and fine detail' },
      { key: 'artifacts', label: 'No Artifacts', weight: 0.8, description: 'Absence of visual defects' },
      { key: 'style', label: 'Style', weight: 1.5, description: 'Artistic style quality and consistency' },
    ],
    promptExtra: `RATING FOCUS: ARTISTIC QUALITY
Judge composition, color harmony, lighting, visual impact, and style consistency.
Add "style" score (1-10) and include it in scores: "style": <1-10>.`,
  },
];

export function getRatingModeById(id: string): RatingMode | undefined {
  return RATING_MODES.find((mode) => mode.id === id);
}

/**
 * Get the best matching rating mode for an optimizer strategy.
 */
export function getRatingModeForStrategy(strategyId: string): RatingMode {
  const mapping: Record<string, string> = {
    'max-quality': 'quality-focus',
    'max-speed': 'speed-vs-quality',
    balanced: 'overall',
    'prompt-adherence': 'prompt-match',
    'style-enhance': 'aesthetic',
    'vram-optimize': 'speed-vs-quality',
    custom: 'overall',
  };
  return getRatingModeById(mapping[strategyId] || 'overall') || RATING_MODES[0];
}

/**
 * Calculate weighted overall score using rating mode weights.
 */
export function calculateWeightedScore(scores: Record<string, number>, mode: RatingMode): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const criterion of mode.criteria) {
    const score = scores[criterion.key];
    if (score === undefined || !Number.isFinite(score)) continue;
    weightedSum += score * criterion.weight;
    totalWeight += criterion.weight;
  }

  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;
}

/**
 * Build the rating prompt for the AI vision model.
 */
export function buildRatingSystemPrompt(
  prompt: string,
  imageCount: number,
  ratingMode?: RatingMode,
): string {
  const mode = ratingMode || RATING_MODES[0];

  const criteriaList = mode.criteria.map((criterion) =>
    `- **${criterion.key}**: ${criterion.description}${criterion.weight > 1.2 ? ' HIGH PRIORITY' : criterion.weight < 0.7 ? ' (lower priority)' : ''}`,
  ).join('\n');

  return `You are an expert AI image quality judge. You will be shown ${imageCount} generated image(s) from a Stable Diffusion / Flux workflow.

The generation prompt was: "${prompt}"

RATING MODE: ${mode.name} (${mode.description})

Rate EACH image on these criteria (1-10 scale):
${criteriaList}

${mode.promptExtra}

Respond ONLY with valid JSON in this exact format:
\`\`\`json
{
  "ratings": [
    {
      "imageIndex": 0,
      "scores": { ${mode.criteria.map((criterion) => `"${criterion.key}": 7`).join(', ')} },
      "reasoning": "Brief 1-2 sentence explanation"
    }
  ],
  "bestIndex": 0,
  "summary": "Brief overall comparison (1-2 sentences)"
}
\`\`\`

Be critical and differentiated - avoid giving all images the same score. Look for real differences.`;
}

/**
 * Parse the AI rating response into structured RatingResult.
 */
export function parseRatingResponse(
  response: string,
  images: { url: string; label: string }[],
  ratingMode?: RatingMode,
): RatingResult {
  try {
    console.log('[ImageRating] Raw response length:', response.length);
    console.log('[ImageRating] Raw response preview:', response.substring(0, 300));

    const patterns = [
      /```json\s*\n([\s\S]*?)```/,
      /```\s*\n(\{[\s\S]*?\})\s*```/,
      /(\{[\s\S]*"ratings"[\s\S]*\})/,
    ];

    let jsonStr: string | null = null;
    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (!match) continue;
      try {
        JSON.parse(match[1].trim());
        jsonStr = match[1].trim();
        break;
      } catch {
        // try next format
      }
    }

    if (!jsonStr) {
      console.error('[ImageRating] Could not find rating JSON in response:', response);
      return {
        ratings: [],
        bestVariant: '',
        summary: 'Failed to parse AI rating response',
        success: false,
        error: 'Could not parse rating response from AI',
      };
    }

    const parsed = JSON.parse(jsonStr);

    const clampScore = (value: unknown): number => {
      const n = Number(value);
      if (!Number.isFinite(n)) return 5;
      return Math.max(1, Math.min(10, Math.round(n * 10) / 10));
    };

    const mode = ratingMode || RATING_MODES[0];
    const criteriaKeys = new Set(mode.criteria.map((criterion) => criterion.key));
    const baseKeys = ['overall', 'promptAdherence', 'aesthetics', 'detail', 'artifacts'];

    const ratings: ImageRating[] = (parsed.ratings || []).map((r: any, i: number) => {
      const idx = r.imageIndex ?? i;
      const img = images[idx] || images[i] || { url: '', label: `Image ${i + 1}` };
      const parsedScores = r.scores && typeof r.scores === 'object' ? r.scores as Record<string, unknown> : {};

      const dynamicScores: Record<string, number> = {};
      for (const key of Object.keys(parsedScores)) {
        if (criteriaKeys.has(key) || baseKeys.includes(key)) {
          dynamicScores[key] = clampScore(parsedScores[key]);
        }
      }

      const scores: ImageRating['scores'] = {
        overall: clampScore(parsedScores.overall),
        promptAdherence: clampScore(parsedScores.promptAdherence),
        aesthetics: clampScore(parsedScores.aesthetics),
        detail: clampScore(parsedScores.detail),
        artifacts: clampScore(parsedScores.artifacts),
        ...dynamicScores,
      };

      return {
        imageUrl: img.url,
        variantLabel: img.label,
        scores,
        reasoning: r.reasoning || '',
        rank: 0,
        weightedScore: 0,
      };
    });

    for (const rating of ratings) {
      rating.weightedScore = calculateWeightedScore(rating.scores, mode);
    }

    const sorted = [...ratings].sort((a, b) => (b.weightedScore || 0) - (a.weightedScore || 0));
    sorted.forEach((r, i) => {
      r.rank = i + 1;
    });

    const bestByIndex = Number.isFinite(Number(parsed.bestIndex))
      ? ratings[Number(parsed.bestIndex)]?.variantLabel
      : '';
    const bestVariant = sorted[0]?.variantLabel || bestByIndex || '';

    return {
      ratings,
      bestVariant,
      summary: parsed.summary || `Best result: ${bestVariant}`,
      success: true,
    };
  } catch (err: any) {
    console.error('[ImageRating] Parse error:', err);
    return {
      ratings: [],
      bestVariant: '',
      summary: '',
      success: false,
      error: `Rating parse failed: ${err.message}`,
    };
  }
}

/**
 * Convert a ComfyUI image URL to a base64 data URL for vision API calls.
 * Falls back to the URL if conversion fails.
 */
export async function imageToBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('[ImageRating] Could not convert image to base64:', err);
    return imageUrl;
  }
}
