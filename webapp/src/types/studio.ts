import React from 'react';

export interface ImageAsset {
  base64: string;
  dataUrl: string;
  mimeType: string;
}

export interface StylePreset extends ImageAsset {
    id: string;
    name: string;
}

export interface Enhancement {
  id: string; // The full prompt string, used as a unique ID
  label: string;
}

export interface AnalysisResult {
    description: string;
    shortPrompt: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    imageUrl?: string;
}

export type ConceptGoal = 
  | 'describe'
  | 'campaign-concept'
  | 'creative-brief'
  | 'prompt-pack'
  | 'shotlist'
  | 'ad-copy'
  | 'ab-variations'
  | 'social-hooks'
  | 'brand-voice';

export type ConceptTone = 
  | 'clean-premium'
  | 'bold-hype'
  | 'minimal-editorial'
  | 'corporate-b2b'
  | 'playful-social';

export type ConceptPlatform = 
  | 'instagram-reels'
  | 'tiktok'
  | 'youtube-shorts'
  | 'meta-ads'
  | 'display-banner'
  | 'landing-page';

export type ConceptLanguage = 'English' | 'German' | 'Russian';

export type VideoModel = 'veo-3.1-generate-preview' | 'veo-3.1-fast-generate-preview';
export type VideoGenerationMode = 'text-to-video' | 'image-to-video' | 'interpolation' | 'extend';
export type VideoResolution = '720p' | '1080p' | '4k';
export type VideoAspectRatio = '16:9' | '9:16';
export type VideoDuration = 4 | 6 | 8;

export interface ParsedConceptResponse {
  content: string;
  imagePrompts?: string[];
  videoPrompts?: string[];
  parsed: boolean;
  confidence: 'high' | 'medium' | 'low';
}

export interface SavedPromptPack {
  id: string;
  goal: ConceptGoal;
  tone: ConceptTone;
  platform: ConceptPlatform;
  language: ConceptLanguage;
  content: string;
  timestamp: number;
  imagePrompts?: string[];
  videoPrompts?: string[];
}

export interface RefinementResult {
  id: string;
  type: 'image' | 'video' | 'text' | 'concept';
  imageUrl: string; // For video/text/concept, this might be the thumbnail or empty
  videoUrl?: string; // Only present if type is 'video'
  analysis?: AnalysisResult; // Only present if type is 'text'
  chatHistory?: ChatMessage[]; // Only present if type is 'concept'
  text: string | null;
  prompt: string;
  negativePrompt: string;
  isFavorite: boolean;
}

export interface StudioContextType {
  characterImage: ImageAsset | null;
  styleImages: ImageAsset[];
  maskImage: ImageAsset | null;
  setMaskImage: React.Dispatch<React.SetStateAction<ImageAsset | null>>;

  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  negativePrompt: string;
  setNegativePrompt: React.Dispatch<React.SetStateAction<string>>;
  enhancements: Enhancement[];
  setEnhancements: React.Dispatch<React.SetStateAction<Enhancement[]>>;
  currentScene: RefinementResult | null;
  sceneHistory: RefinementResult[];
  isLoading: boolean;
  error: string | null;
  batchSize: number;
  setBatchSize: React.Dispatch<React.SetStateAction<number>>;
  stylePresets: StylePreset[];
  
  hasApiKey: boolean;
  
  modelMode: 'concept' | 'image' | 'video';
  setModelMode: React.Dispatch<React.SetStateAction<'concept' | 'image' | 'video'>>;
  
  imageSubMode: 'generate' | 'edit';
  setImageSubMode: React.Dispatch<React.SetStateAction<'generate' | 'edit'>>;
  
  imageResolution: '1K' | '2K' | '4K' | '720p' | '1080p';
  setImageResolution: React.Dispatch<React.SetStateAction<'1K' | '2K' | '4K' | '720p' | '1080p'>>;
  
  aspectRatio: string;
  setAspectRatio: React.Dispatch<React.SetStateAction<string>>;

  // Nano Banana model selection
  selectedModel: 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview';
  setSelectedModel: React.Dispatch<React.SetStateAction<'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview'>>;
  
  webSearchEnabled: boolean;
  setWebSearchEnabled: React.Dispatch<React.SetStateAction<boolean>>;

  // CONCEPT tab enhanced controls
  conceptModel: 'gemini-3-flash-preview' | 'gemini-3-pro-preview';
  setConceptModel: React.Dispatch<React.SetStateAction<'gemini-3-flash-preview' | 'gemini-3-pro-preview'>>;
  
  conceptGoal: ConceptGoal;
  setConceptGoal: React.Dispatch<React.SetStateAction<ConceptGoal>>;
  
  conceptTone: ConceptTone;
  setConceptTone: React.Dispatch<React.SetStateAction<ConceptTone>>;
  
  conceptPlatform: ConceptPlatform;
  setConceptPlatform: React.Dispatch<React.SetStateAction<ConceptPlatform>>;
  
  conceptLanguage: ConceptLanguage;
  setConceptLanguage: React.Dispatch<React.SetStateAction<ConceptLanguage>>;
  
  conceptWebSearchEnabled: boolean;
  setConceptWebSearchEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  
  savedPromptPacks: SavedPromptPack[];
  handleSavePromptPack: (pack: SavedPromptPack) => void;
  handleSendToImage: (prompts: string[]) => void;
  handleSendToVideo: (prompts: string[]) => void;

  // VIDEO tab enhanced controls
  videoModel: VideoModel;
  setVideoModel: React.Dispatch<React.SetStateAction<VideoModel>>;
  
  videoGenerationMode: VideoGenerationMode;
  setVideoGenerationMode: React.Dispatch<React.SetStateAction<VideoGenerationMode>>;
  
  videoNegativePrompt: string;
  setVideoNegativePrompt: React.Dispatch<React.SetStateAction<string>>;
  
  videoAspectRatio: VideoAspectRatio;
  setVideoAspectRatio: React.Dispatch<React.SetStateAction<VideoAspectRatio>>;
  
  videoResolution: VideoResolution;
  setVideoResolution: React.Dispatch<React.SetStateAction<VideoResolution>>;
  
  videoDuration: VideoDuration;
  setVideoDuration: React.Dispatch<React.SetStateAction<VideoDuration>>;
  
  videoVariations: number;
  setVideoVariations: React.Dispatch<React.SetStateAction<number>>;
  
  videoSeed: number | undefined;
  setVideoSeed: React.Dispatch<React.SetStateAction<number | undefined>>;
  
  videoLastFrame: ImageAsset | null;
  setVideoLastFrame: React.Dispatch<React.SetStateAction<ImageAsset | null>>;
  
  videoReferenceImages: ImageAsset[];
  handleVideoReferenceImageUpload: (file: File) => Promise<void>;
  handleRemoveVideoReferenceImage: (index: number) => void;
  
  videoExtendSource: RefinementResult | null;
  setVideoExtendSource: React.Dispatch<React.SetStateAction<RefinementResult | null>>;

  handleCharacterImageChange: (file: File) => Promise<void>;
  handleStyleImageUpload: (file: File) => Promise<void>;
  handleRemoveCharacterImage: () => void;
  handleRemoveStyleImage: (index: number) => void;
  
  handleEnhancePrompt: (enhancement: { label: string; prompt: string }) => void;
  handleRemoveEnhancement: (enhancementId: string) => void;
  handleGenerateScene: () => Promise<void>;
  handleStartOver: () => void;
  handleSaveImage: () => void;
  handleSelectSceneFromHistory: (scene: RefinementResult) => void;
  handleSaveStylePreset: () => void;
  handleSelectStylePreset: (id: string) => void;
  handleDeleteStylePreset: (id: string) => void;
  handleToggleFavorite: (id: string) => void;
  handleDeleteScene: (id: string) => void;
}