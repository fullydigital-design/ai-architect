import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { generateSceneWithGemini, generateVideoWithVeo, generateImageAnalysis, generateConceptChat, QuotaExceededError } from '@/services/geminiService';
import { processImageFile } from '@/utils/fileUtils';
import type { RefinementResult, ImageAsset, StylePreset, Enhancement, StudioContextType, ChatMessage } from '@/types/studio';

const StudioContext = createContext<StudioContextType | undefined>(undefined);

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [characterImage, setCharacterImage] = useState<ImageAsset | null>(null);
  const [styleImages, setStyleImages] = useState<ImageAsset[]>([]);
  const [maskImage, setMaskImage] = useState<ImageAsset | null>(null);

  const [prompt, setPrompt] = useState<string>('');
  const [negativePrompt, setNegativePrompt] = useState<string>('');
  const [enhancements, setEnhancements] = useState<Enhancement[]>([]);
  const [currentScene, setCurrentScene] = useState<RefinementResult | null>(null);
  const [sceneHistory, setSceneHistory] = useState<RefinementResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState<number>(1);
  const [stylePresets, setStylePresets] = useState<StylePreset[]>([]);
  
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  
  // New State for Model, Resolution, Aspect Ratio
  const [modelMode, setModelMode] = useState<'concept' | 'image' | 'video'>('concept');
  const [imageSubMode, setImageSubMode] = useState<'generate' | 'edit'>('generate');
  const [imageResolution, setImageResolution] = useState<'1K' | '2K' | '4K' | '720p' | '1080p'>('1K');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');

  // New state for Nano Banana models
  const [selectedModel, setSelectedModel] = useState<'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview'>('gemini-3-pro-image-preview');
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(false);

  // CONCEPT tab enhanced state
  const [conceptModel, setConceptModel] = useState<'gemini-3-flash-preview' | 'gemini-3-pro-preview'>('gemini-3-pro-preview');
  const [conceptGoal, setConceptGoal] = useState<import('@/types/studio').ConceptGoal>('prompt-pack');
  const [conceptTone, setConceptTone] = useState<import('@/types/studio').ConceptTone>('clean-premium');
  const [conceptPlatform, setConceptPlatform] = useState<import('@/types/studio').ConceptPlatform>('instagram-reels');
  const [conceptLanguage, setConceptLanguage] = useState<import('@/types/studio').ConceptLanguage>('English');
  const [conceptWebSearchEnabled, setConceptWebSearchEnabled] = useState<boolean>(false);
  const [savedPromptPacks, setSavedPromptPacks] = useState<import('@/types/studio').SavedPromptPack[]>([]);

  // VIDEO tab enhanced state
  const [videoModel, setVideoModel] = useState<import('@/types/studio').VideoModel>('veo-3.1-fast-generate-preview');
  const [videoGenerationMode, setVideoGenerationMode] = useState<import('@/types/studio').VideoGenerationMode>('text-to-video');
  const [videoNegativePrompt, setVideoNegativePrompt] = useState<string>('');
  const [videoAspectRatio, setVideoAspectRatio] = useState<import('@/types/studio').VideoAspectRatio>('16:9');
  const [videoResolution, setVideoResolution] = useState<import('@/types/studio').VideoResolution>('720p');
  const [videoDuration, setVideoDuration] = useState<import('@/types/studio').VideoDuration>(8);
  const [videoVariations, setVideoVariations] = useState<number>(1);
  const [videoSeed, setVideoSeed] = useState<number | undefined>(undefined);
  const [videoLastFrame, setVideoLastFrame] = useState<ImageAsset | null>(null);
  const [videoReferenceImages, setVideoReferenceImages] = useState<ImageAsset[]>([]);
  const [videoExtendSource, setVideoExtendSource] = useState<RefinementResult | null>(null);

  // Auto-adjust resolution based on selected model (Fast model = 1K only)
  useEffect(() => {
    if (modelMode === 'image' && selectedModel === 'gemini-2.5-flash-image') {
      // Fast model only supports 1K
      if (imageResolution !== '1K' && imageResolution !== '720p' && imageResolution !== '1080p') {
        setImageResolution('1K');
        console.log('Fast model limited to 1K resolution');
      }
    }
  }, [selectedModel, imageResolution, modelMode]);

  // Effect to ensure valid Resolution and Aspect Ratio when switching modes
  useEffect(() => {
    if (modelMode === 'video') {
        // If resolution is an image resolution (1K, 2K, 4K), reset to Video default (720p)
        setImageResolution(prev => (prev === '720p' || prev === '1080p') ? prev : '720p');
        
        // If aspect ratio is not supported by Veo (1:1, 3:4, etc), reset to Video default (16:9)
        setAspectRatio(prev => (prev === '16:9' || prev === '9:16') ? prev : '16:9');
    } else {
        // If switching back to image mode from video, ensure we don't use 720p/1080p
        setImageResolution(prev => (prev === '720p' || prev === '1080p') ? '1K' : prev);
        // Image modes support all aspect ratios, so no forced reset needed for AR
    }
    
    // Clear input fields when switching tabs to prevent confusion
    setPrompt('');
    setCharacterImage(null);
    setStyleImages([]);
    setMaskImage(null);
    setError(null);
  }, [modelMode]);

  useEffect(() => {
    const checkKey = () => {
        const key = localStorage.getItem('gemini_api_key');
        setHasApiKey(!!key && key.trim().length > 0);
    };
    checkKey();
    
    // Listen for storage changes (in case key is set in another tab)
    window.addEventListener('storage', checkKey);
    return () => window.removeEventListener('storage', checkKey);
  }, []);

  useEffect(() => {
    try {
        const savedPresets = localStorage.getItem('stylePresets');
        if (savedPresets) {
            setStylePresets(JSON.parse(savedPresets));
        }
    } catch (e) {
        console.error("Failed to load style presets from localStorage", e);
    }
  }, []);

  const updateAndSavePresets = (presets: StylePreset[]) => {
      setStylePresets(presets);
      try {
          localStorage.setItem('stylePresets', JSON.stringify(presets));
      } catch (e) {
          console.error("Failed to save style presets to localStorage", e);
      }
  };

  const handleCharacterImageChange = useCallback(async (file: File) => {
    try {
        const imageData = await processImageFile(file);
        setCharacterImage(imageData);
        setError(null);
    } catch (err) {
        setError('Failed to process subject image.');
        console.error(err);
    }
  }, []);

  const handleStyleImageUpload = useCallback(async (file: File) => {
    try {
        const imageData = await processImageFile(file);
        
        setStyleImages(prev => {
            if (modelMode === 'image') {
                // Image mode supports up to 14 (extended from 7)
                if (prev.length >= 14) {
                    setError("Maximum 14 reference images allowed.");
                    return prev;
                }
                return [...prev, imageData];
            } else {
                // Video, Text, Concept mode does not support style images in this UI
                return prev;
            }
        });
        setError(null); // Clear any previous errors
    } catch (err) {
        setError('Failed to process style image.');
        console.error(err);
    }
  }, [modelMode]);

  const handleRemoveCharacterImage = useCallback(() => setCharacterImage(null), []);
  
  const handleRemoveStyleImage = useCallback((index: number) => {
      setStyleImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleEnhancePrompt = useCallback((enhancement: { label: string; prompt: string }) => {
    setEnhancements(prev => {
      if (prev.some(e => e.id === enhancement.prompt)) {
        return prev;
      }
      return [...prev, { id: enhancement.prompt, label: enhancement.label }];
    });
  }, []);

  const handleRemoveEnhancement = useCallback((enhancementId: string) => {
    setEnhancements(prev => prev.filter(e => e.id !== enhancementId));
  }, []);
  
  const handleGenerateScene = useCallback(async () => {
    // For image mode in edit sub-mode, we need an image and mask
    if (modelMode === 'image' && imageSubMode === 'edit') {
        if (!characterImage) {
            setError('Please provide an image to edit.');
            return;
        }
        if (!maskImage) {
            setError('Please mark the area you want to edit.');
            return;
        }
    }

    const finalPrompt = `${prompt.trim()} ${enhancements.map(e => e.id).join(', ')}`.trim();
    if (!finalPrompt && !characterImage) {
      setError('Please provide an image or a prompt.');
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      let newScenes: RefinementResult[] = [];

      if (modelMode === 'video') {
          // Video Generation
          const result = await generateVideoWithVeo(
              finalPrompt,
              characterImage,
              imageResolution as '720p' | '1080p',
              aspectRatio
          );
          
          newScenes = [{
              ...result,
              id: `${Date.now()}-${Math.random()}`,
              prompt: finalPrompt,
              negativePrompt: '',
              text: null,
              isFavorite: false,
          }];

      } else if (modelMode === 'concept') {
          // Concept Chat Mode with enhanced features
          const isContinuingChat = currentScene?.type === 'concept';
          const existingHistory = isContinuingChat && currentScene?.chatHistory ? currentScene.chatHistory : [];
          
          // For 'describe' goal, image is required
          if (conceptGoal === 'describe' && !characterImage) {
            setError('Please upload an image to describe.');
            setIsLoading(false);
            return;
          }
          
          // Optimistic UI update: Add user message immediately
          const userMsg: ChatMessage = {
              role: 'user',
              text: finalPrompt || 'Please analyze this image.',
              imageUrl: characterImage?.dataUrl
          };

          // Compose structured prompt with all context
          const { composeConceptPrompt } = await import('@/utils/conceptTemplates');
          const composedPrompt = composeConceptPrompt({
            goal: conceptGoal,
            tone: conceptTone,
            platform: conceptPlatform,
            language: conceptLanguage,
            userInput: finalPrompt || 'Analyze this image in detail.',
            hasImage: !!characterImage
          });

          // Generate response with all new parameters
          const responseText = await generateConceptChat(
            existingHistory, 
            finalPrompt || 'Analyze this image.', 
            characterImage,
            {
              model: conceptModel,
              composedPrompt: composedPrompt,
              webSearchEnabled: conceptWebSearchEnabled
            }
          );
          
          const modelMsg: ChatMessage = {
              role: 'model',
              text: responseText
          };

          const newHistory = [...existingHistory, userMsg, modelMsg];
          
          const conceptScene: RefinementResult = {
              id: isContinuingChat ? currentScene.id : `${Date.now()}-${Math.random()}`,
              type: 'concept',
              imageUrl: '', // Concept chat doesn't have a single main image
              chatHistory: newHistory,
              prompt: finalPrompt, // Store last prompt
              negativePrompt: '',
              text: null,
              isFavorite: false
          };

          setCurrentScene(conceptScene);
          
          // If continuing, update in history. If new, add to history.
          if (isContinuingChat) {
             setSceneHistory(prev => prev.map(s => s.id === conceptScene.id ? conceptScene : s));
          } else {
             setSceneHistory(prev => [conceptScene, ...prev]);
          }
          
          // Clear input for chat feel
          setPrompt('');
          setCharacterImage(null);
          
          setIsLoading(false);
          return; // Return early as we handled state manually

      } else if (modelMode === 'image') {
          // Image Mode - can be Generate or Edit
          if (imageSubMode === 'edit') {
              // Edit Mode
              const result = await generateSceneWithGemini(
                  finalPrompt,
                  negativePrompt,
                  characterImage,
                  [], // Style images not used in edit mode
                  'edit', // Pass 'edit' as the mode to geminiService
                  imageResolution as '1K'|'2K'|'4K',
                  aspectRatio,
                  maskImage // Pass mask
              );
              
              newScenes = [{
                  ...result,
                  id: `${Date.now()}-${Math.random()}`,
                  prompt: finalPrompt,
                  negativePrompt: negativePrompt,
                  isFavorite: false,
              }];
          } else {
              // Generate Mode - combines Light and Pro features
              // Use batch size for batch generation
              const generationPromises = Array(batchSize).fill(null).map(() => 
                  generateSceneWithGemini(
                      finalPrompt, 
                      negativePrompt, 
                      characterImage, 
                      styleImages, 
                      selectedModel === 'gemini-2.5-flash-image' ? 'light' : 'pro',
                      imageResolution as '1K'|'2K'|'4K', 
                      aspectRatio
                  )
              );
              
              const results = await Promise.all(generationPromises);
              
              newScenes = results.map(result => ({
                  ...result,
                  id: `${Date.now()}-${Math.random()}`,
                  prompt: finalPrompt,
                  negativePrompt: negativePrompt,
                  isFavorite: false,
              }));
          }
      }

      if (newScenes.length > 0) {
          setCurrentScene(newScenes[0]);
          setSceneHistory(prev => [...newScenes, ...prev]);
      }
      
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        // QuotaExceededError already contains user-friendly message
        setError(err.message);
      } else {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
        setError(errorMessage);
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, enhancements, characterImage, styleImages, batchSize, negativePrompt, imageResolution, modelMode, imageSubMode, aspectRatio, maskImage, currentScene]);

  const handleStartOver = useCallback(() => {
    // Only reset the current scene if it matches the current mode
    if (currentScene && currentScene.type === modelMode) {
      setCurrentScene(null);
    }
    
    // Reset common fields
    setCharacterImage(null);
    setStyleImages([]);
    setMaskImage(null);
    setError(null);
    setPrompt('');
    setNegativePrompt('');
    setEnhancements([]);
  }, [currentScene, modelMode]);

  const handleSaveImage = useCallback(() => {
    if (!currentScene) return;
    const link = document.createElement('a');
    
    if (currentScene.type === 'video' && currentScene.videoUrl) {
        link.href = currentScene.videoUrl;
        link.download = `waybetter-video-${Date.now()}.mp4`;
    } else if (currentScene.type === 'text' && currentScene.analysis) {
        const textContent = `Description:\n${currentScene.analysis.description}\n\nPrompt:\n${currentScene.analysis.shortPrompt}`;
        const blob = new Blob([textContent], { type: 'text/plain' });
        link.href = URL.createObjectURL(blob);
        link.download = `waybetter-analysis-${Date.now()}.txt`;
    } else if (currentScene.type === 'concept' && currentScene.chatHistory) {
         const chatText = currentScene.chatHistory.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n\n');
         const blob = new Blob([chatText], { type: 'text/plain' });
         link.href = URL.createObjectURL(blob);
         link.download = `waybetter-chat-${Date.now()}.txt`;
    } else {
        link.href = currentScene.imageUrl;
        // Attempt to guess extension from mime type in base64 header
        const match = currentScene.imageUrl.match(/^data:(image\/[a-z]+);base64,/);
        let extension = 'png';
        if (match) {
            extension = match[1].split('/')[1];
        }
        link.download = `waybetter-image-${Date.now()}.${extension}`;
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [currentScene]);

  const handleSelectSceneFromHistory = useCallback((scene: RefinementResult) => {
    setCurrentScene(scene);
  }, []);

  const handleSaveStylePreset = useCallback(() => {
    if (styleImages.length === 0) return;
    const name = window.prompt("Enter a name for this style preset:", "My Style");
    if (name) {
      const newPreset: StylePreset = {
        ...styleImages[0], // Only save the first one for now as a preset
        id: `${Date.now()}`,
        name: name,
      };
      updateAndSavePresets([...stylePresets, newPreset]);
    }
  }, [styleImages, stylePresets]);

  const handleSelectStylePreset = useCallback((id: string) => {
    const preset = stylePresets.find(p => p.id === id);
    if (preset) {
      // Replaces current style images with the preset
      setStyleImages([preset]);
    }
  }, [stylePresets]);

  const handleDeleteStylePreset = useCallback((id: string) => {
    if (window.confirm("Are you sure you want to delete this preset?")) {
      updateAndSavePresets(stylePresets.filter(p => p.id !== id));
    }
  }, [stylePresets]);

  const handleToggleFavorite = useCallback((id: string) => {
    setSceneHistory(prev => prev.map(s => s.id === id ? { ...s, isFavorite: !s.isFavorite } : s));
  }, []);
  
  const handleDeleteScene = useCallback((id: string) => {
    if (window.confirm("Are you sure you want to delete this scene?")) {
      setSceneHistory(prev => {
        const newHistory = prev.filter(s => s.id !== id);
        if (currentScene?.id === id) {
          setCurrentScene(newHistory[0] || null);
        }
        return newHistory;
      });
    }
  }, [currentScene]);

  // CONCEPT tab handlers
  const handleSavePromptPack = useCallback((pack: import('@/types/studio').SavedPromptPack) => {
    setSavedPromptPacks(prev => {
      const updated = [pack, ...prev];
      try {
        localStorage.setItem('savedPromptPacks', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save prompt pack to localStorage', e);
      }
      return updated;
    });
  }, []);

  const handleSendToImage = useCallback((prompts: string[]) => {
    if (prompts.length > 0) {
      // Store prompts for Image tab to access
      try {
        localStorage.setItem('pendingImagePrompts', JSON.stringify(prompts));
        setModelMode('image');
        // Optionally set the first prompt as the active prompt
        setPrompt(prompts[0]);
      } catch (e) {
        console.error('Failed to send prompts to Image tab', e);
      }
    }
  }, []);

  const handleSendToVideo = useCallback((prompts: string[]) => {
    if (prompts.length > 0) {
      // Store prompts for Video tab to access
      try {
        localStorage.setItem('pendingVideoPrompts', JSON.stringify(prompts));
        setModelMode('video');
        // Optionally set the first prompt as the active prompt
        setPrompt(prompts[0]);
      } catch (e) {
        console.error('Failed to send prompts to Video tab', e);
      }
    }
  }, []);

  // VIDEO tab handlers
  const handleVideoReferenceImageUpload = useCallback(async (file: File) => {
    try {
      const imageData = await processImageFile(file);
      setVideoReferenceImages(prev => {
        if (prev.length >= 3) {
          setError("Maximum 3 reference images allowed.");
          return prev;
        }
        return [...prev, imageData];
      });
      setError(null);
    } catch (err) {
      setError('Failed to process reference image.');
      console.error(err);
    }
  }, []);

  const handleRemoveVideoReferenceImage = useCallback((index: number) => {
    setVideoReferenceImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  // VIDEO tab smart constraints
  useEffect(() => {
    if (modelMode !== 'video') return;
    
    // Reference images constraints
    if (videoReferenceImages.length > 0) {
      if (videoAspectRatio !== '16:9') {
        setVideoAspectRatio('16:9');
      }
      if (videoDuration !== 8) {
        setVideoDuration(8);
      }
    }
    
    // High-res constraints
    if (videoResolution === '1080p' || videoResolution === '4k') {
      if (videoDuration !== 8) {
        setVideoDuration(8);
      }
    }
    
    // Extend mode constraints
    if (videoGenerationMode === 'extend') {
      if (videoResolution !== '720p') {
        setVideoResolution('720p');
      }
      if (videoDuration !== 8) {
        setVideoDuration(8);
      }
    }
  }, [modelMode, videoReferenceImages, videoResolution, videoGenerationMode, videoAspectRatio, videoDuration]);

  const value = {
    characterImage,
    styleImages,
    maskImage,
    setMaskImage,
    prompt,
    setPrompt,
    negativePrompt,
    setNegativePrompt,
    enhancements,
    setEnhancements,
    currentScene,
    sceneHistory,
    isLoading,
    error,
    batchSize,
    setBatchSize,
    stylePresets,
    hasApiKey,
    
    modelMode,
    setModelMode,
    imageSubMode,
    setImageSubMode,
    imageResolution,
    setImageResolution,
    aspectRatio,
    setAspectRatio,

    // Nano Banana model states
    selectedModel,
    setSelectedModel,
    webSearchEnabled,
    setWebSearchEnabled,

    // CONCEPT tab enhanced state
    conceptModel,
    setConceptModel,
    conceptGoal,
    setConceptGoal,
    conceptTone,
    setConceptTone,
    conceptPlatform,
    setConceptPlatform,
    conceptLanguage,
    setConceptLanguage,
    conceptWebSearchEnabled,
    setConceptWebSearchEnabled,
    savedPromptPacks,

    // VIDEO tab enhanced state
    videoModel,
    setVideoModel,
    videoGenerationMode,
    setVideoGenerationMode,
    videoNegativePrompt,
    setVideoNegativePrompt,
    videoAspectRatio,
    setVideoAspectRatio,
    videoResolution,
    setVideoResolution,
    videoDuration,
    setVideoDuration,
    videoVariations,
    setVideoVariations,
    videoSeed,
    setVideoSeed,
    videoLastFrame,
    setVideoLastFrame,
    videoReferenceImages,
    videoExtendSource,
    setVideoExtendSource,

    handleCharacterImageChange,
    handleStyleImageUpload,
    handleRemoveCharacterImage,
    handleRemoveStyleImage,
    handleEnhancePrompt,
    handleRemoveEnhancement,
    handleGenerateScene,
    handleStartOver,
    handleSaveImage,
    handleSelectSceneFromHistory,
    handleSaveStylePreset,
    handleSelectStylePreset,
    handleDeleteStylePreset,
    handleToggleFavorite,
    handleDeleteScene,
    handleSavePromptPack,
    handleSendToImage,
    handleSendToVideo,
    handleVideoReferenceImageUpload,
    handleRemoveVideoReferenceImage,
  };

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
};

export const useStudio = (): StudioContextType => {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
};