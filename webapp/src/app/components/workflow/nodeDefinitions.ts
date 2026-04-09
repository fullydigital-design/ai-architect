import { MessageSquare, Sparkles, Image, Video, Eye, Download, Upload, Palette } from 'lucide-react';
import { NodeDefinition, NodeCategory, Provider, DataType } from './types';

// Google API Node Definitions
export const GOOGLE_NODES: NodeDefinition[] = [
  // INPUT NODES
  {
    id: 'google-api-key',
    type: 'apiKey',
    label: 'API Key Setup',
    description: 'Configure Google API credentials',
    category: NodeCategory.INPUT,
    provider: Provider.GOOGLE,
    icon: MessageSquare,
    color: '#10b981',
    gradient: 'from-green-500 to-emerald-500',
    handles: {
      inputs: [],
      outputs: [
        { id: 'api-output', type: 'source', dataType: DataType.TEXT, label: 'API Key' }
      ],
    },
    configurable: true,
    config: {
      apiKey: '',
      isValid: false,
    },
  },
  {
    id: 'google-text-prompt',
    type: 'textPrompt',
    label: 'Text Prompt',
    description: 'Enter text prompt for AI generation',
    category: NodeCategory.INPUT,
    provider: Provider.GOOGLE,
    icon: MessageSquare,
    color: '#a855f7',
    gradient: 'from-purple-500 to-indigo-500',
    handles: {
      inputs: [],
      outputs: [
        { id: 'text-output', type: 'source', dataType: DataType.TEXT, label: 'Text' }
      ],
    },
    configurable: true,
    config: {
      value: '',
      placeholder: 'Enter your prompt...',
    },
  },
  {
    id: 'google-image-upload',
    type: 'imageUpload',
    label: 'Image Upload',
    description: 'Upload reference image',
    category: NodeCategory.INPUT,
    provider: Provider.GOOGLE,
    icon: Upload,
    color: '#ec4899',
    gradient: 'from-pink-500 to-rose-500',
    handles: {
      inputs: [],
      outputs: [
        { id: 'image-output', type: 'source', dataType: DataType.IMAGE, label: 'Image' }
      ],
    },
    configurable: true,
    config: {
      image: null,
    },
  },
  {
    id: 'google-style-reference',
    type: 'styleReference',
    label: 'Style Reference',
    description: 'Upload style reference images',
    category: NodeCategory.INPUT,
    provider: Provider.GOOGLE,
    icon: Palette,
    color: '#eab308',
    gradient: 'from-yellow-500 to-amber-500',
    handles: {
      inputs: [],
      outputs: [
        { id: 'style-output', type: 'source', dataType: DataType.STYLE, label: 'Style' }
      ],
    },
    configurable: true,
    config: {
      styles: [],
      maxStyles: 14,
    },
  },

  // AI MODEL NODES
  {
    id: 'google-gemini-full',
    type: 'geminiFull',
    label: 'Gemini Full Control',
    description: 'Complete CONCEPT tab with all controls',
    category: NodeCategory.MODEL,
    provider: Provider.GOOGLE,
    icon: Sparkles,
    color: '#d946ef',
    gradient: 'from-fuchsia-600 via-purple-600 to-pink-600',
    handles: {
      inputs: [
        { id: 'text-input', type: 'target', dataType: DataType.TEXT, label: 'Prompt' }
      ],
      outputs: [
        { id: 'text-output', type: 'source', dataType: DataType.TEXT, label: 'Response' }
      ],
    },
    configurable: true,
    config: {
      model: 'gemini-2.0-flash-exp',
      goalType: 'general',
      tone: 'clean',
      platform: 'instagram',
      language: 'english',
      webSearch: false,
      prompt: '',
      isExpanded: true,
    },
  },
  {
    id: 'google-nano-banana-full',
    type: 'nanoBananaFull',
    label: 'Imagen 3 Full Control',
    description: 'Complete IMAGE tab with all controls',
    category: NodeCategory.MODEL,
    provider: Provider.GOOGLE,
    icon: Image,
    color: '#ec4899',
    gradient: 'from-pink-500 to-rose-500',
    handles: {
      inputs: [
        { id: 'text-input', type: 'target', dataType: DataType.TEXT, label: 'Prompt' },
        { id: 'style-input', type: 'target', dataType: DataType.STYLE, label: 'Style' }
      ],
      outputs: [
        { id: 'image-output', type: 'source', dataType: DataType.IMAGE, label: 'Image' }
      ],
    },
    configurable: true,
    config: {
      model: 'nano-banana-pro',
      mode: 'generate',
      resolution: '1K',
      aspectRatio: '1:1',
      webSearch: false,
      prompt: '',
      isExpanded: true,
    },
  },
  {
    id: 'google-veo-full',
    type: 'veoFull',
    label: 'Veo Full Control',
    description: 'Complete VIDEO tab with all controls',
    category: NodeCategory.MODEL,
    provider: Provider.GOOGLE,
    icon: Video,
    color: '#3b82f6',
    gradient: 'from-blue-500 to-cyan-500',
    handles: {
      inputs: [
        { id: 'text-input', type: 'target', dataType: DataType.TEXT, label: 'Prompt' },
        { id: 'image-input', type: 'target', dataType: DataType.IMAGE, label: 'Image' }
      ],
      outputs: [
        { id: 'video-output', type: 'source', dataType: DataType.VIDEO, label: 'Video' }
      ],
    },
    configurable: true,
    config: {
      model: 'veo-3.1',
      generationMode: 'text-to-video',
      resolution: '720p',
      aspectRatio: '16:9',
      duration: '6s',
      prompt: '',
      negativePrompt: '',
      variations: 1,
      seed: '',
      isExpanded: true,
    },
  },
  {
    id: 'google-gemini',
    type: 'gemini',
    label: 'Gemini 2.0 Flash',
    description: 'AI text generation and concept development',
    category: NodeCategory.MODEL,
    provider: Provider.GOOGLE,
    icon: Sparkles,
    color: '#d946ef',
    gradient: 'from-fuchsia-600 via-purple-600 to-pink-600',
    handles: {
      inputs: [
        { id: 'text-input', type: 'target', dataType: DataType.TEXT, label: 'Prompt' }
      ],
      outputs: [
        { id: 'text-output', type: 'source', dataType: DataType.TEXT, label: 'Response' }
      ],
    },
    configurable: true,
    config: {
      model: 'gemini-2.0-flash-exp',
      goalType: 'general',
      temperature: 0.7,
    },
  },
  {
    id: 'google-nano-banana',
    type: 'nanoBanana',
    label: 'Imagen 3 Pro',
    description: 'Generate high-quality images from text',
    category: NodeCategory.MODEL,
    provider: Provider.GOOGLE,
    icon: Image,
    color: '#ec4899',
    gradient: 'from-pink-500 to-rose-500',
    handles: {
      inputs: [
        { id: 'text-input', type: 'target', dataType: DataType.TEXT, label: 'Prompt' },
        { id: 'style-input', type: 'target', dataType: DataType.STYLE, label: 'Style' }
      ],
      outputs: [
        { id: 'image-output', type: 'source', dataType: DataType.IMAGE, label: 'Image' }
      ],
    },
    configurable: true,
    config: {
      resolution: '1K',
      aspectRatio: '1:1',
      styleReferences: [],
    },
  },
  {
    id: 'google-veo',
    type: 'veo',
    label: 'Veo 3.1',
    description: 'Generate professional videos',
    category: NodeCategory.MODEL,
    provider: Provider.GOOGLE,
    icon: Video,
    color: '#3b82f6',
    gradient: 'from-blue-500 to-cyan-500',
    handles: {
      inputs: [
        { id: 'text-input', type: 'target', dataType: DataType.TEXT, label: 'Prompt' },
        { id: 'image-input', type: 'target', dataType: DataType.IMAGE, label: 'Image' }
      ],
      outputs: [
        { id: 'video-output', type: 'source', dataType: DataType.VIDEO, label: 'Video' }
      ],
    },
    configurable: true,
    config: {
      mode: 'text-to-video',
      resolution: '720p',
      duration: '5s',
    },
  },

  // OUTPUT NODES
  {
    id: 'google-text-display',
    type: 'textDisplay',
    label: 'Text Output',
    description: 'Display generated text results',
    category: NodeCategory.OUTPUT,
    provider: Provider.GOOGLE,
    icon: Eye,
    color: '#6366f1',
    gradient: 'from-indigo-500 to-purple-500',
    handles: {
      inputs: [
        { id: 'text-input', type: 'target', dataType: DataType.TEXT, label: 'Text' }
      ],
      outputs: [],
    },
    configurable: false,
    config: {
      result: '',
    },
  },
  {
    id: 'google-image-preview',
    type: 'imagePreview',
    label: 'Image Preview',
    description: 'Display generated images',
    category: NodeCategory.OUTPUT,
    provider: Provider.GOOGLE,
    icon: Eye,
    color: '#ec4899',
    gradient: 'from-pink-500 to-rose-500',
    handles: {
      inputs: [
        { id: 'image-input', type: 'target', dataType: DataType.IMAGE, label: 'Image' }
      ],
      outputs: [],
    },
    configurable: false,
  },
  {
    id: 'google-video-preview',
    type: 'videoPreview',
    label: 'Video Preview',
    description: 'Display generated videos',
    category: NodeCategory.OUTPUT,
    provider: Provider.GOOGLE,
    icon: Eye,
    color: '#3b82f6',
    gradient: 'from-blue-500 to-cyan-500',
    handles: {
      inputs: [
        { id: 'video-input', type: 'target', dataType: DataType.VIDEO, label: 'Video' }
      ],
      outputs: [],
    },
    configurable: false,
  },
  {
    id: 'google-download',
    type: 'download',
    label: 'Download',
    description: 'Save output to device',
    category: NodeCategory.OUTPUT,
    provider: Provider.GOOGLE,
    icon: Download,
    color: '#10b981',
    gradient: 'from-green-500 to-emerald-500',
    handles: {
      inputs: [
        { id: 'any-input', type: 'target', dataType: DataType.ANY, label: 'Content' }
      ],
      outputs: [],
    },
    configurable: true,
    config: {
      format: 'png',
    },
  },
];

// Get nodes by category
export function getNodesByCategory(category: NodeCategory): NodeDefinition[] {
  return GOOGLE_NODES.filter(node => node.category === category);
}

// Get node definition by type
export function getNodeDefinition(type: string): NodeDefinition | undefined {
  return GOOGLE_NODES.find(node => node.type === type);
}