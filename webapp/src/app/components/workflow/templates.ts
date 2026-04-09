import { Node, Edge } from 'reactflow';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'concept' | 'image' | 'video' | 'advanced';
  gradient: string;
  nodes: Omit<Node, 'id'>[];
  edges: Omit<Edge, 'id' | 'source' | 'target'>[];
  nodeMapping: { [key: string]: string }; // temp id -> node type mapping
}

export const GOOGLE_TEMPLATES: WorkflowTemplate[] = [
  // FULL-FEATURED TEMPLATES
  {
    id: 'full-concept',
    name: '🎯 Full Concept Studio',
    description: 'Complete CONCEPT tab with all controls',
    icon: '🤖',
    category: 'concept',
    gradient: 'from-fuchsia-600 via-purple-600 to-pink-600',
    nodes: [
      {
        type: 'apiKey',
        position: { x: 100, y: 150 },
        data: { apiKey: '', isValid: false },
      },
      {
        type: 'geminiFull',
        position: { x: 450, y: 150 },
        data: { 
          model: 'gemini-2.0-flash-exp',
          goalType: 'marketing',
          tone: 'clean',
          platform: 'instagram',
          language: 'english',
          webSearch: false,
          prompt: 'Create a luxury car campaign for Instagram Reels',
          isExpanded: true,
        },
      },
      {
        type: 'textDisplay',
        position: { x: 800, y: 150 },
        data: { result: '' },
      },
    ],
    edges: [],
    nodeMapping: {
      'node_0': 'apiKey',
      'node_1': 'geminiFull',
      'node_2': 'textDisplay',
    },
  },
  {
    id: 'full-image',
    name: '🖼️ Full Image Studio',
    description: 'Complete IMAGE tab with all controls',
    icon: '🎨',
    category: 'image',
    gradient: 'from-pink-500 to-rose-500',
    nodes: [
      {
        type: 'apiKey',
        position: { x: 100, y: 150 },
        data: { apiKey: '', isValid: false },
      },
      {
        type: 'nanoBananaFull',
        position: { x: 450, y: 150 },
        data: { 
          model: 'nano-banana-pro',
          mode: 'generate',
          resolution: '2K',
          aspectRatio: '16:9',
          webSearch: false,
          prompt: 'Futuristic sports car in neon cyberpunk city at night',
          isExpanded: true,
        },
      },
      {
        type: 'imagePreview',
        position: { x: 800, y: 150 },
        data: {},
      },
    ],
    edges: [],
    nodeMapping: {
      'node_0': 'apiKey',
      'node_1': 'nanoBananaFull',
      'node_2': 'imagePreview',
    },
  },
  {
    id: 'full-video',
    name: '🎬 Full Video Studio',
    description: 'Complete VIDEO tab with all controls',
    icon: '🎥',
    category: 'video',
    gradient: 'from-blue-500 to-cyan-500',
    nodes: [
      {
        type: 'apiKey',
        position: { x: 100, y: 150 },
        data: { apiKey: '', isValid: false },
      },
      {
        type: 'veoFull',
        position: { x: 450, y: 150 },
        data: { 
          model: 'veo-3.1',
          generationMode: 'text-to-video',
          resolution: '1080p',
          aspectRatio: '16:9',
          duration: '6s',
          prompt: 'Cinematic drone shot of mountain landscape at sunset, slow motion',
          negativePrompt: '',
          variations: 1,
          seed: '',
          isExpanded: true,
        },
      },
      {
        type: 'videoPreview',
        position: { x: 800, y: 150 },
        data: {},
      },
    ],
    edges: [],
    nodeMapping: {
      'node_0': 'apiKey',
      'node_1': 'veoFull',
      'node_2': 'videoPreview',
    },
  },
  {
    id: 'complete-pipeline',
    name: '🚀 Complete Pipeline',
    description: 'API Setup → Concept → Image → Video',
    icon: '⚡',
    category: 'advanced',
    gradient: 'from-orange-500 via-red-500 to-pink-500',
    nodes: [
      {
        type: 'apiKey',
        position: { x: 100, y: 250 },
        data: { apiKey: '', isValid: false },
      },
      {
        type: 'geminiFull',
        position: { x: 400, y: 100 },
        data: { 
          model: 'gemini-2.0-flash-exp',
          goalType: 'marketing',
          prompt: 'Luxury tech product campaign',
          isExpanded: false,
        },
      },
      {
        type: 'nanoBananaFull',
        position: { x: 700, y: 250 },
        data: { 
          resolution: '4K',
          aspectRatio: '16:9',
          prompt: '',
          isExpanded: false,
        },
      },
      {
        type: 'veoFull',
        position: { x: 1000, y: 250 },
        data: { 
          generationMode: 'image-to-video',
          resolution: '1080p',
          duration: '8s',
          isExpanded: false,
        },
      },
      {
        type: 'videoPreview',
        position: { x: 1300, y: 250 },
        data: {},
      },
    ],
    edges: [],
    nodeMapping: {
      'node_0': 'apiKey',
      'node_1': 'geminiFull',
      'node_2': 'nanoBananaFull',
      'node_3': 'veoFull',
      'node_4': 'videoPreview',
    },
  },

  // COMPACT TEMPLATES (Original ones)
  {
    id: 'text-prompt',
    name: 'Text Prompt',
    description: 'Simple AI text generation with Gemini',
    icon: '💬',
    category: 'concept',
    gradient: 'from-purple-500 to-indigo-500',
    nodes: [
      {
        type: 'textPrompt',
        position: { x: 100, y: 150 },
        data: { value: 'Write a creative ad campaign for eco-friendly water bottles' },
      },
      {
        type: 'gemini',
        position: { x: 400, y: 150 },
        data: { model: 'gemini-2.0-flash-exp', goalType: 'marketing' },
      },
    ],
    edges: [],
    nodeMapping: {
      'node_0': 'textPrompt',
      'node_1': 'gemini',
    },
  },
  {
    id: 'image-spread',
    name: 'Image Spread',
    description: 'Generate beautiful images with Nano Banana',
    icon: '🖼️',
    category: 'image',
    gradient: 'from-pink-500 to-rose-500',
    nodes: [
      {
        type: 'textPrompt',
        position: { x: 100, y: 150 },
        data: { value: 'Futuristic sports car in neon cyberpunk city' },
      },
      {
        type: 'nanoBanana',
        position: { x: 400, y: 150 },
        data: { resolution: '2K', aspectRatio: '16:9' },
      },
      {
        type: 'imagePreview',
        position: { x: 700, y: 150 },
        data: {},
      },
      {
        type: 'download',
        position: { x: 700, y: 300 },
        data: { format: 'png' },
      },
    ],
    edges: [],
    nodeMapping: {
      'node_0': 'textPrompt',
      'node_1': 'nanoBanana',
      'node_2': 'imagePreview',
      'node_3': 'download',
    },
  },
  {
    id: 'style-reference',
    name: 'Style Reference',
    description: 'Image generation with custom style references',
    icon: '🎨',
    category: 'image',
    gradient: 'from-yellow-500 to-amber-500',
    nodes: [
      {
        type: 'textPrompt',
        position: { x: 100, y: 100 },
        data: { value: 'Modern minimalist product photography' },
      },
      {
        type: 'styleReference',
        position: { x: 100, y: 280 },
        data: { styles: [] },
      },
      {
        type: 'nanoBanana',
        position: { x: 400, y: 150 },
        data: { resolution: '4K', aspectRatio: '1:1' },
      },
      {
        type: 'imagePreview',
        position: { x: 700, y: 150 },
        data: {},
      },
    ],
    edges: [],
    nodeMapping: {
      'node_0': 'textPrompt',
      'node_1': 'styleReference',
      'node_2': 'nanoBanana',
      'node_3': 'imagePreview',
    },
  },
  {
    id: 'content-visual',
    name: 'Content & Visual',
    description: 'Generate text concept + matching visual',
    icon: '✨',
    category: 'advanced',
    gradient: 'from-fuchsia-600 via-purple-600 to-pink-600',
    nodes: [
      {
        type: 'textPrompt',
        position: { x: 100, y: 150 },
        data: { value: 'Create a social media campaign for sustainable fashion' },
      },
      {
        type: 'gemini',
        position: { x: 400, y: 80 },
        data: { model: 'gemini-2.0-flash-exp', goalType: 'social' },
      },
      {
        type: 'nanoBanana',
        position: { x: 400, y: 250 },
        data: { resolution: '2K', aspectRatio: '1:1' },
      },
      {
        type: 'imagePreview',
        position: { x: 700, y: 250 },
        data: {},
      },
    ],
    edges: [],
    nodeMapping: {
      'node_0': 'textPrompt',
      'node_1': 'gemini',
      'node_2': 'nanoBanana',
      'node_3': 'imagePreview',
    },
  },
  {
    id: 'video-generation',
    name: 'Veo 3.1',
    description: 'Professional video generation from text',
    icon: '🎬',
    category: 'video',
    gradient: 'from-blue-500 to-cyan-500',
    nodes: [
      {
        type: 'textPrompt',
        position: { x: 100, y: 150 },
        data: { value: 'Cinematic drone shot of mountain landscape at sunset' },
      },
      {
        type: 'veo',
        position: { x: 400, y: 150 },
        data: { mode: 'text-to-video', resolution: '1080p', duration: '10s' },
      },
      {
        type: 'videoPreview',
        position: { x: 700, y: 150 },
        data: {},
      },
      {
        type: 'download',
        position: { x: 700, y: 300 },
        data: { format: 'mp4' },
      },
    ],
    edges: [],
    nodeMapping: {
      'node_0': 'textPrompt',
      'node_1': 'veo',
      'node_2': 'videoPreview',
      'node_3': 'download',
    },
  },
  {
    id: 'image-to-video',
    name: 'Nano-Remix Pro',
    description: 'Image upload to animated video',
    icon: '🎥',
    category: 'video',
    gradient: 'from-indigo-500 to-purple-500',
    nodes: [
      {
        type: 'imageUpload',
        position: { x: 100, y: 150 },
        data: {},
      },
      {
        type: 'veo',
        position: { x: 400, y: 150 },
        data: { mode: 'image-to-video', resolution: '720p', duration: '5s' },
      },
      {
        type: 'videoPreview',
        position: { x: 700, y: 150 },
        data: {},
      },
      {
        type: 'download',
        position: { x: 700, y: 300 },
        data: { format: 'mp4' },
      },
    ],
    edges: [],
    nodeMapping: {
      'node_0': 'imageUpload',
      'node_1': 'veo',
      'node_2': 'videoPreview',
      'node_3': 'download',
    },
  },
  {
    id: 'advanced-pipeline',
    name: 'Advanced Pipeline',
    description: 'Complete workflow: Concept → Image → Video',
    icon: '🚀',
    category: 'advanced',
    gradient: 'from-orange-500 to-red-500',
    nodes: [
      {
        type: 'textPrompt',
        position: { x: 100, y: 200 },
        data: { value: 'Luxury tech product reveal' },
      },
      {
        type: 'gemini',
        position: { x: 350, y: 100 },
        data: { model: 'gemini-2.0-flash-exp', goalType: 'marketing' },
      },
      {
        type: 'nanoBanana',
        position: { x: 350, y: 250 },
        data: { resolution: '4K', aspectRatio: '16:9' },
      },
      {
        type: 'veo',
        position: { x: 650, y: 250 },
        data: { mode: 'image-to-video', resolution: '1080p', duration: '10s' },
      },
      {
        type: 'videoPreview',
        position: { x: 950, y: 250 },
        data: {},
      },
    ],
    edges: [],
    nodeMapping: {
      'node_0': 'textPrompt',
      'node_1': 'gemini',
      'node_2': 'nanoBanana',
      'node_3': 'veo',
      'node_4': 'videoPreview',
    },
  },
];

// Get templates by category
export function getTemplatesByCategory(category: string): WorkflowTemplate[] {
  return GOOGLE_TEMPLATES.filter(t => t.category === category);
}