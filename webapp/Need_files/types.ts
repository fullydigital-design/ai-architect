/**
 * PASTE YOUR types.ts CODE HERE
 * 
 * From: /types.ts (root file)
 * 
 * All TypeScript type definitions
 */
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

export interface AppContextType {
  characterImage: ImageAsset | null;
  styleImages: ImageAsset[];
  // New: Mask Image for Edit mode
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
  handleSelectApiKey: () => Promise<void>;
  
  modelMode: 'light' | 'pro' | 'video' | 'text' | 'edit' | 'concept';
  setModelMode: React.Dispatch<React.SetStateAction<'light' | 'pro' | 'video' | 'text' | 'edit' | 'concept'>>;
  
  imageResolution: '1K' | '2K' | '4K' | '720p' | '1080p';
  setImageResolution: React.Dispatch<React.SetStateAction<'1K' | '2K' | '4K' | '720p' | '1080p'>>;
  
  aspectRatio: string;
  setAspectRatio: React.Dispatch<React.SetStateAction<string>>;

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