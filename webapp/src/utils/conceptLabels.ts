// This is a temporary helper to import in Studio.tsx
import type { ConceptGoal } from '@/types/studio';

export const GOAL_LABELS: Record<ConceptGoal, string> = {
  'campaign-concept': 'Campaign Concept',
  'creative-brief': 'Creative Brief',
  'prompt-pack': 'Prompt Pack (Image/Video)',
  'shotlist': 'Shotlist',
  'ad-copy': 'Ad Copy (Headlines + Body)',
  'ab-variations': 'A/B Variations',
  'social-hooks': 'Social Hooks',
  'brand-voice': 'Brand Voice Guide',
};

export { TONE_LABELS, PLATFORM_LABELS, PLACEHOLDERS } from './conceptTemplates';
