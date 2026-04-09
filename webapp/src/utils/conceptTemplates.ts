import type { ConceptGoal, ConceptTone, ConceptPlatform, ConceptLanguage, ParsedConceptResponse } from '@/types/studio';

// Display labels for UI
export const GOAL_LABELS: Record<ConceptGoal, string> = {
  'describe': 'Describe Image',
  'campaign-concept': 'Campaign Concept',
  'creative-brief': 'Creative Brief',
  'prompt-pack': 'Prompt Pack (Image/Video)',
  'shotlist': 'Shotlist',
  'ad-copy': 'Ad Copy (Headlines + Body)',
  'ab-variations': 'A/B Variations',
  'social-hooks': 'Social Hooks',
  'brand-voice': 'Brand Voice Guide',
};

export const TONE_LABELS: Record<ConceptTone, string> = {
  'clean-premium': 'Clean / Premium',
  'bold-hype': 'Bold / Hype',
  'minimal-editorial': 'Minimal / Editorial',
  'corporate-b2b': 'Corporate / B2B',
  'playful-social': 'Playful / Social',
};

export const PLATFORM_LABELS: Record<ConceptPlatform, string> = {
  'instagram-reels': 'Instagram Reels',
  'tiktok': 'TikTok',
  'youtube-shorts': 'YouTube Shorts',
  'meta-ads': 'Meta Ads',
  'display-banner': 'Display Banner',
  'landing-page': 'Landing Page',
};

// Placeholder texts based on goal
export const PLACEHOLDERS: Record<ConceptGoal, string> = {
  'describe': 'Upload an image to analyze its content, style, and generate a prompt...',
  'campaign-concept': 'Describe your campaign vision, target audience, and key message...',
  'creative-brief': 'Describe the project: objective, audience, deliverables, and tone...',
  'prompt-pack': 'Describe your product, audience, and goal… e.g. "Luxury car campaign for Reels, night mood, premium look."',
  'shotlist': 'Describe the commercial/video concept and what story you want to tell...',
  'ad-copy': 'Describe product benefits, unique value proposition, and target audience...',
  'ab-variations': 'Describe the core message and what elements you want to test...',
  'social-hooks': 'Describe your content theme, audience pain points, and platform...',
  'brand-voice': 'Describe your brand personality, values, and communication style...',
};

// Compose full prompt with system instruction + context + user input
export function composeConceptPrompt(params: {
  goal: ConceptGoal;
  tone: ConceptTone;
  platform: ConceptPlatform;
  language: ConceptLanguage;
  userInput: string;
  hasImage: boolean;
}): string {
  const { goal, tone, platform, language, userInput, hasImage } = params;

  // Base role
  const role = "You are an expert creative strategist and advertising copywriter.";

  // Output rules
  const rules = `
OUTPUT RULES:
- Be concise, production-ready, not generic.
- Return structured sections with clear headings.
- No filler marketing language.
- If assumptions are made, list them briefly.
`;

  // Context injection
  const context = `
CONTEXT:
- Goal: ${GOAL_LABELS[goal]}
- Tone: ${TONE_LABELS[tone]}
- Platform: ${PLATFORM_LABELS[platform]}
- Language: ${language}
`;

  // Image context if present
  const imageContext = hasImage
    ? "\n- Visual Reference: Use the attached image to infer style, mood, composition, and visual direction.\n"
    : "";

  // Goal-specific instructions
  const goalInstructions = getGoalInstructions(goal);

  // Final composed prompt
  return `${role}

${rules}
${context}${imageContext}

${goalInstructions}

USER REQUEST:
${userInput}`;
}

// Get goal-specific formatting instructions
function getGoalInstructions(goal: ConceptGoal): string {
  const instructions: Record<ConceptGoal, string> = {
    'describe': `
FORMAT YOUR RESPONSE AS:

## 🎨 DESCRIPTION
(Write a detailed, technical description of the image: composition, subjects, lighting, colors, textures, mood, style. Be specific about visual elements, camera angle, and artistic choices.)

## ✨ GENERATED PROMPT
(Write a concise, production-ready image generation prompt based on the description. Focus on key elements: subject, style, lighting, camera, mood. Keep it under 100 characters for optimal use.)
`,

    'campaign-concept': `
FORMAT YOUR RESPONSE AS:

## CONCEPT SUMMARY
(2-3 lines)

## KEY MESSAGE
(Core message)

## VISUAL DIRECTION
(Style, mood, color palette)

## EXECUTION ANGLES
1. First angle
2. Second angle
3. Third angle
`,
    
    'creative-brief': `
FORMAT YOUR RESPONSE AS:

## OBJECTIVE
(What we're trying to achieve)

## TARGET AUDIENCE
(Who we're speaking to)

## KEY MESSAGE
(Main communication)

## TONE + STYLE
(Voice and aesthetic)

## DELIVERABLES
- Item 1
- Item 2
- Item 3

## DO / DON'T
DO:
- Guideline 1
- Guideline 2

DON'T:
- Avoid 1
- Avoid 2
`,

    'prompt-pack': `
FORMAT YOUR RESPONSE AS:

## IMAGE PROMPTS
1. [Full detailed image prompt with camera, lighting, composition]
2. [Full detailed image prompt with camera, lighting, composition]
3. [Full detailed image prompt with camera, lighting, composition]
4. [Full detailed image prompt with camera, lighting, composition]
5. [Full detailed image prompt with camera, lighting, composition]

## VIDEO PROMPTS
1. [Short ad-ready video prompt with motion description]
2. [Short ad-ready video prompt with motion description]
3. [Short ad-ready video prompt with motion description]

## MODIFIERS
(10 variation keywords: color, mood, lens, environment, time of day, weather, etc.)
- Modifier 1
- Modifier 2
...
- Modifier 10
`,

    'shotlist': `
FORMAT YOUR RESPONSE AS:

## SHOTLIST

**Shot 1: [Name]**
- Framing: [Wide/Medium/Close-up]
- Camera: [Lens + movement]
- Action: [What happens]
- Key Detail: [What to emphasize]
- Purpose: [Story beat]

(Repeat for 8 shots total)
`,

    'ad-copy': `
FORMAT YOUR RESPONSE AS:

## HEADLINES (12)
1. Headline option 1
2. Headline option 2
...
12. Headline option 12

## PRIMARY TEXT (6)
1. Body copy option 1
2. Body copy option 2
...
6. Body copy option 6

## CALLS TO ACTION (6)
1. CTA 1
2. CTA 2
...
6. CTA 6
`,

    'ab-variations': `
FORMAT YOUR RESPONSE AS:

## A/B TEST VARIATIONS

**Variation 1A:**
[Copy/concept]

**Variation 1B:**
[Alternative]
*What changes:* [Explanation]

(Repeat for 6 A/B pairs total)
`,

    'social-hooks': `
FORMAT YOUR RESPONSE AS:

## HOOKS (15)
1. Hook line 1
2. Hook line 2
...
15. Hook line 15

## OPENING LINES FOR SCRIPTS (5)
1. "Opening line 1..."
2. "Opening line 2..."
...
5. "Opening line 5..."
`,

    'brand-voice': `
FORMAT YOUR RESPONSE AS:

## BRAND VOICE PRINCIPLES
- Principle 1
- Principle 2
- Principle 3

## WORDS TO USE
- Word/phrase 1
- Word/phrase 2
...

## WORDS TO AVOID
- Avoid 1
- Avoid 2
...

## EXAMPLE LINES (5)
1. "Example line 1"
2. "Example line 2"
...
5. "Example line 5"
`,
  };

  return instructions[goal];
}

// Parse response and extract prompts if possible
export function parseConceptResponse(responseText: string, goal: ConceptGoal): ParsedConceptResponse {
  let imagePrompts: string[] | undefined;
  let videoPrompts: string[] | undefined;
  let parsed = false;
  let confidence: 'high' | 'medium' | 'low' = 'low';

  try {
    // Only try to extract prompts for 'prompt-pack' goal
    if (goal === 'prompt-pack') {
      imagePrompts = extractImagePrompts(responseText);
      videoPrompts = extractVideoPrompts(responseText);
      
      if (imagePrompts.length > 0 || videoPrompts.length > 0) {
        parsed = true;
        confidence = imagePrompts.length >= 3 && videoPrompts.length >= 2 ? 'high' : 'medium';
      }
    } else {
      // For other goals, just check if response has expected structure
      const hasHeadings = responseText.includes('##') || responseText.includes('**');
      if (hasHeadings) {
        parsed = true;
        confidence = 'medium';
      }
    }
  } catch (e) {
    console.error('Failed to parse concept response:', e);
  }

  return {
    content: responseText,
    imagePrompts,
    videoPrompts,
    parsed,
    confidence,
  };
}

// Extract image prompts from response
export function extractImagePrompts(responseText: string): string[] {
  const prompts: string[] = [];
  
  // Look for "IMAGE PROMPTS" section
  const imageSection = responseText.match(/##?\s*IMAGE PROMPTS?\s*\n([\s\S]*?)(?=\n##|$)/i);
  
  if (imageSection && imageSection[1]) {
    const lines = imageSection[1].split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // Match numbered lines: "1. Prompt text" or "- Prompt text"
      const match = trimmed.match(/^(?:\d+\.|-)\s*(.+)/);
      if (match && match[1] && match[1].length > 20) {
        prompts.push(match[1].trim());
      }
    }
  }
  
  return prompts;
}

// Extract video prompts from response
export function extractVideoPrompts(responseText: string): string[] {
  const prompts: string[] = [];
  
  // Look for "VIDEO PROMPTS" section
  const videoSection = responseText.match(/##?\s*VIDEO PROMPTS?\s*\n([\s\S]*?)(?=\n##|$)/i);
  
  if (videoSection && videoSection[1]) {
    const lines = videoSection[1].split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // Match numbered lines: "1. Prompt text" or "- Prompt text"
      const match = trimmed.match(/^(?:\d+\.|-)\s*(.+)/);
      if (match && match[1] && match[1].length > 20) {
        prompts.push(match[1].trim());
      }
    }
  }
  
  return prompts;
}