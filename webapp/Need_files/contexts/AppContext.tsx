/**
 * PASTE YOUR AppContext.tsx CODE HERE
 * 
 * From: /contexts/AppContext.tsx
 * 
 * This should include state management for the entire app
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { generateSceneWithGemini, generateVideoWithVeo, generateImageAnalysis, generateConceptChat } from '../services/geminiService';
import { processImageFile } from '../utils/fileUtils';
import type { RefinementResult, ImageAsset, StylePreset, Enhancement, AppContextType, ChatMessage } from '../types';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
  const [modelMode, setModelMode] = useState<'light' | 'pro' | 'video' | 'text' | 'edit' | 'concept'>('pro');
  const [imageResolution, setImageResolution] = useState<'1K' | '2K' | '4K' | '720p' | '1080p'>('1K');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');

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
  }, [modelMode]);

  useEffect(() => {
    const checkKey = async () => {
        if (window.aistudio) {
            const has = await window.aistudio.hasSelectedApiKey();
            setHasApiKey(has);
        } else {
            setHasApiKey(true);
        }
    };
    checkKey();
  }, []);

  const handleSelectApiKey = useCallback(async () => {
      if (window.aistudio) {
          await window.aistudio.openSelectKey();
          setHasApiKey(true);
      }
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
    } catch (err) {
        setError('Failed to process subject image.');
        console.error(err);
    }
  }, []);

  const handleStyleImageUpload = useCallback(async (file: File) => {
    try {
        const imageData = await processImageFile(file);
        
        setStyleImages(prev => {
            if (modelMode === 'light') {
                // Light mode only supports 1 image
                return [imageData];
            } else if (modelMode === 'pro') {
                // Pro mode supports up to 7
                if (prev.length >= 7) {
                    setError("Maximum 7 reference images allowed for Pro model.");
                    return prev;
                }
                return [...prev, imageData];
            } else {
                // Video, Text, Edit, Concept mode does not support style images in this UI
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
    // For text mode and edit mode, we need an image
    if ((modelMode === 'text' || modelMode === 'edit') && !characterImage) {
        setError('Please provide an image.');
        return;
    }

    if (modelMode === 'edit' && !maskImage) {
        setError('Please mark the object you want to edit.');
        return;
    }

    const finalPrompt = `${prompt.trim()} ${enhancements.map(e => e.id).join(', ')}`.trim();
    if (modelMode !== 'text' && !finalPrompt && !characterImage) {
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

      } else if (modelMode === 'text') {
           // Text Analysis
           if (!characterImage) throw new Error("Image required for analysis");
           const analysis = await generateImageAnalysis(characterImage);
           newScenes = [{
               id: `${Date.now()}-${Math.random()}`,
               type: 'text',
               imageUrl: characterImage.dataUrl,
               analysis: analysis,
               prompt: "Image Analysis",
               negativePrompt: "",
               text: null,
               isFavorite: false
           }];

      } else if (modelMode === 'concept') {
          // Concept Chat Mode
          // We either start a new chat or continue the existing one if it's already a concept scene
          const isContinuingChat = currentScene?.type === 'concept';
          const existingHistory = isContinuingChat && currentScene?.chatHistory ? currentScene.chatHistory : [];
          
          // Optimistic UI update: Add user message immediately
          const userMsg: ChatMessage = {
              role: 'user',
              text: finalPrompt,
              imageUrl: characterImage?.dataUrl
          };

          const responseText = await generateConceptChat(existingHistory, finalPrompt, characterImage);
          
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

          // If continuing, we update in place in history list? 
          // For simplicity in this app structure, we push a new version or update current
          setCurrentScene(conceptScene);
          
          // If it was a new chat, add to history. If continuing, update the history item.
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

      } else if (modelMode === 'edit') {
          // Edit Mode
           const result = await generateSceneWithGemini(
                finalPrompt,
                negativePrompt,
                characterImage,
                [], // Style images not used in simple edit mode
                modelMode, // 'edit'
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
          // Image Generation (Light/Pro)
          // If Light mode, batch size applies. If Pro mode, batch size is effectively 1
          const effectiveBatchSize = modelMode === 'light' ? batchSize : 1;
          
          const generationPromises = Array(effectiveBatchSize).fill(null).map(() => 
            generateSceneWithGemini(
                finalPrompt, 
                negativePrompt, 
                characterImage, 
                styleImages, 
                modelMode, 
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

      if (newScenes.length > 0) {
          setCurrentScene(newScenes[0]);
          setSceneHistory(prev => [...newScenes, ...prev]);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      
      if (errorMessage.includes("Requested entity was not found")) {
          setHasApiKey(false);
          if (window.aistudio) {
              await window.aistudio.openSelectKey();
              setHasApiKey(true);
              setError("API Key re-selected. Please try generating again.");
          } else {
              setError(`API Key Error: ${errorMessage}`);
          }
      } else {
          setError(`Failed to generate: ${errorMessage}`);
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, enhancements, characterImage, styleImages, batchSize, negativePrompt, imageResolution, modelMode, aspectRatio, maskImage, currentScene]);

  const handleStartOver = useCallback(() => {
    setCharacterImage(null);
    setStyleImages([]);
    setMaskImage(null);
    setCurrentScene(null);
    setError(null);
    setPrompt('');
    setNegativePrompt('');
    setEnhancements([]);
  }, []);

  const handleSaveImage = useCallback(() => {
    if (!currentScene) return;
    const link = document.createElement('a');
    
    if (currentScene.type === 'video' && currentScene.videoUrl) {
        link.href = currentScene.videoUrl;
        link.download = `veo-video-${Date.now()}.mp4`;
    } else if (currentScene.type === 'text' && currentScene.analysis) {
        const textContent = `Description:\n${currentScene.analysis.description}\n\nPrompt:\n${currentScene.analysis.shortPrompt}`;
        const blob = new Blob([textContent], { type: 'text/plain' });
        link.href = URL.createObjectURL(blob);
        link.download = `analysis-${Date.now()}.txt`;
    } else if (currentScene.type === 'concept' && currentScene.chatHistory) {
         const chatText = currentScene.chatHistory.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n\n');
         const blob = new Blob([chatText], { type: 'text/plain' });
         link.href = URL.createObjectURL(blob);
         link.download = `concept-chat-${Date.now()}.txt`;
    } else {
        link.href = currentScene.imageUrl;
        // Attempt to guess extension from mime type in base64 header
        const match = currentScene.imageUrl.match(/^data:(image\/[a-z]+);base64,/);
        let extension = 'png';
        if (match) {
            extension = match[1].split('/')[1];
        }
        link.download = `gemini-scene-${Date.now()}.${extension}`;
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
    handleSelectApiKey,
    
    modelMode,
    setModelMode,
    imageResolution,
    setImageResolution,
    aspectRatio,
    setAspectRatio,

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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};