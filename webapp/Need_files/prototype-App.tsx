/**
 * PASTE YOUR App.tsx CODE HERE
 * 
 * From: /App.tsx (root file)
 * 
 * This is how your prototype is structured
 */

import React from 'react';
import Header from './components/Header';
import ImageEditor from './components/ImageEditor';
import ReferenceImageUploader from './components/ReferenceImageUploader';
import MaskEditor from './components/MaskEditor';
import GenerationGallery from './components/GenerationGallery';
import Spinner from './components/Spinner';
import { SparklesIcon, DownloadIcon, XIcon } from './components/Icons';
import { useAppContext } from './contexts/AppContext';

const App: React.FC = () => {
  const {
    characterImage,
    styleImages,
    maskImage,
    setMaskImage,
    prompt,
    setPrompt,
    negativePrompt,
    setNegativePrompt,
    currentScene,
    sceneHistory,
    isLoading,
    error,
    handleCharacterImageChange,
    handleStyleImageUpload,
    handleRemoveCharacterImage,
    handleRemoveStyleImage,
    handleGenerateScene,
    handleStartOver,
    handleSaveImage,
    handleSelectSceneFromHistory,
    batchSize,
    setBatchSize,
    stylePresets,
    handleSaveStylePreset,
    handleSelectStylePreset,
    handleToggleFavorite,
    handleDeleteScene,
    hasApiKey,
    handleSelectApiKey,
    imageResolution,
    setImageResolution,
    modelMode,
    setModelMode,
    aspectRatio,
    setAspectRatio
  } = useAppContext();

  if (!hasApiKey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6">
         <div className="max-w-md w-full bg-zinc-900 p-8 rounded-2xl border border-zinc-800 text-center shadow-2xl">
             <h2 className="text-2xl font-bold mb-4 text-[#e93263]">Welcome</h2>
             <p className="mb-8 text-gray-300 leading-relaxed text-sm">
               To create high-fidelity images with <strong>Gemini</strong>, please select a valid API key from a paid Google Cloud project.
             </p>
             <button 
                onClick={handleSelectApiKey} 
                className="w-full py-3 px-6 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors mb-6 text-xs uppercase tracking-widest"
             >
               Select API Key
             </button>
             <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] text-zinc-500 hover:text-[#e93263] transition-colors underline underline-offset-4 uppercase tracking-widest"
             >
                Billing Information & Documentation
             </a>
         </div>
      </div>
    );
  }

  const availableResolutions = modelMode === 'video' 
      ? ['720p', '1080p'] 
      : ['1K', '2K', '4K'];
  
  const availableAspectRatios = modelMode === 'video'
      ? ['16:9', '9:16']
      : ['1:1', '3:4', '4:3', '9:16', '16:9'];
      
  const isTextMode = modelMode === 'text';
  const isEditMode = modelMode === 'edit';
  const isConceptMode = modelMode === 'concept';

  const handleMaskChange = (base64: string | null, mimeType: string) => {
      if (base64) {
          setMaskImage({ base64, dataUrl: `data:${mimeType};base64,${base64}`, mimeType });
      } else {
          setMaskImage(null);
      }
  };

  return (
    <div className="min-h-screen lg:h-screen flex flex-col items-center p-4 md:p-6 lg:overflow-hidden bg-[#000000]">
      <div className="w-full max-w-7xl mx-auto flex flex-col h-full">
        <Header />
        
        <main className="mt-2 md:mt-4 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:min-h-0">
            {/* Controls Panel */}
            <div className="lg:col-span-4 bg-[#121214] rounded-2xl p-4 sm:p-6 shadow-xl border border-zinc-800/50 flex flex-col lg:overflow-y-auto custom-scrollbar">
              <div className="flex-grow">
                {/* Tabs Switcher */}
                <div className="flex bg-zinc-800/50 p-1.5 rounded-xl mb-8 overflow-x-auto shrink-0 gap-1">
                    {[
                      { id: 'text', label: 'Text' },
                      { id: 'concept', label: 'Concept' },
                      { id: 'light', label: 'Light' },
                      { id: 'pro', label: 'Pro' },
                      { id: 'edit', label: 'Edit' },
                      { id: 'video', label: 'Video' }
                    ].map((tab) => (
                      <button 
                          key={tab.id}
                          onClick={() => setModelMode(tab.id as any)}
                          disabled={isLoading}
                          className={`flex-1 py-2 px-3 text-[10px] sm:text-[11px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap
                            ${modelMode === tab.id 
                                ? 'bg-[#e93263] text-white shadow-lg shadow-[#e93263]/20' 
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
                      >
                          {tab.label}
                      </button>
                    ))}
                </div>

                {/* Section 1: Subject */}
                <h3 className="text-sm font-bold text-[#e93263] mb-4 tracking-tighter">
                    {modelMode === 'video' ? '1. Input Image' : 
                     isEditMode ? '1. Image to Edit' : 
                     isConceptMode ? '1. Optional Input Image' :
                     '1. Subject Image'}
                </h3>
                
                {isEditMode && characterImage ? (
                    <MaskEditor 
                        imageUrl={characterImage.dataUrl} 
                        onMaskChange={handleMaskChange} 
                    />
                ) : (
                    <ReferenceImageUploader
                        onImageChange={handleCharacterImageChange}
                        onImageRemove={handleRemoveCharacterImage}
                        imageDataUrl={characterImage?.dataUrl ?? null}
                        disabled={isLoading}
                        placeholderText={
                            isConceptMode ? "Attach Image (Optional)" : 
                            modelMode === 'video' || isTextMode || isEditMode ? "Upload Image" : "Upload Subject"
                        }
                    />
                )}
                
                {isEditMode && characterImage && (
                    <button 
                        onClick={handleRemoveCharacterImage}
                        className="mt-2 text-[10px] text-zinc-500 hover:text-red-400 uppercase tracking-widest w-full text-center"
                    >
                        [ Remove Image ]
                    </button>
                )}
                
                {/* Style Images Section */}
                {!isTextMode && modelMode !== 'video' && !isEditMode && !isConceptMode && (
                    <div className="mt-8">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-[#e93263] tracking-tighter">
                              2. Style Image{modelMode === 'pro' && 's'}
                            </h3>
                            {stylePresets.length > 0 && (
                                <select 
                                    onChange={(e) => handleSelectStylePreset(e.target.value)} 
                                    disabled={isLoading}
                                    className="bg-black/40 border border-zinc-800 text-[10px] uppercase font-bold text-zinc-500 rounded px-2 py-1 focus:ring-1 focus:ring-[#e93263]"
                                    value=""
                                >
                                    <option value="">Presets</option>
                                    {stylePresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            )}
                        </div>
                        
                        {modelMode === 'light' ? (
                           <ReferenceImageUploader
                                onImageChange={handleStyleImageUpload}
                                onImageRemove={() => handleRemoveStyleImage(0)}
                                imageDataUrl={styleImages[0]?.dataUrl ?? null}
                                disabled={isLoading}
                                placeholderText="Upload Style"
                                onSaveStyle={styleImages.length > 0 ? handleSaveStylePreset : undefined}
                            />
                        ) : (
                            <div className="space-y-3">
                                {styleImages.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2">
                                        {styleImages.map((img, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-zinc-800 group">
                                                <img src={img.dataUrl} alt={`Style ${idx}`} className="w-full h-full object-cover" />
                                                <button 
                                                    onClick={() => handleRemoveStyleImage(idx)}
                                                    disabled={isLoading}
                                                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <XIcon className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {styleImages.length < 7 && (
                                    <ReferenceImageUploader
                                        onImageChange={handleStyleImageUpload}
                                        onImageRemove={() => {}} 
                                        imageDataUrl={null}
                                        disabled={isLoading}
                                        placeholderText={styleImages.length === 0 ? "Upload Style Reference" : "Add Another"}
                                        onSaveStyle={styleImages.length > 0 ? handleSaveStylePreset : undefined}
                                        className={styleImages.length > 0 ? "h-24" : "aspect-video"}
                                    />
                                )}
                                <p className="text-[9px] font-bold text-zinc-600 text-right uppercase tracking-widest">{styleImages.length} / 7 images</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Section 3: Prompt */}
                {!isTextMode && (
                    <div className="mt-8">
                        <h3 className="text-sm font-bold text-[#e93263] mb-4 tracking-tighter">
                            {modelMode === 'video' ? '2. Describe the Video' : 
                             isEditMode ? '2. How to edit?' : 
                             isConceptMode ? '2. Brainstorming Input' :
                             '3. Describe the Scene'}
                        </h3>
                        <textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder={
                              modelMode === 'video' ? "e.g., 'A cinematic shot of the car driving through rain...'" : 
                              isEditMode ? "e.g., 'Change the red car to blue'" :
                              isConceptMode ? "Ask a question or describe an idea..." :
                              "e.g., 'The character walking through the city...'"
                          }
                          className="w-full h-28 p-4 bg-black/40 text-gray-200 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-[#e93263] transition-all duration-200 resize-none text-xs leading-relaxed font-mono"
                          disabled={isLoading}
                        />
                    </div>
                )}
              </div>

              <div className="pt-6 border-t border-zinc-800/50 mt-auto">
                <div className="space-y-3">
                   {/* Technical Parameters */}
                   {!isTextMode && !isEditMode && !isConceptMode && (
                       modelMode === 'light' ? (
                           <div className="mb-4">
                              <h4 className="text-[9px] font-black text-zinc-600 mb-2 tracking-[0.2em] uppercase text-center">Batch Size</h4>
                              <div className="flex justify-center gap-1">
                                  {[1, 2, 4].map(size => (
                                      <button key={size} onClick={() => setBatchSize(size)}
                                          className={`flex-1 py-1 text-[10px] font-black rounded-md transition-all ${batchSize === size ? 'bg-[#e93263] text-white' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
                                          disabled={isLoading}
                                      >{size}</button>
                                  ))}
                              </div>
                           </div>
                       ) : (
                           <div className="grid grid-cols-2 gap-3 mb-4">
                              <div>
                                  <h4 className="text-[9px] font-black text-zinc-600 mb-2 tracking-[0.2em] uppercase text-center">Resolution</h4>
                                  <div className="flex justify-center gap-1">
                                      {availableResolutions.map((res: any) => (
                                          <button key={res} onClick={() => setImageResolution(res)}
                                              className={`flex-1 py-1 text-[10px] font-black rounded-md transition-all ${imageResolution === res ? 'bg-[#e93263] text-white' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
                                              disabled={isLoading}
                                          >{res}</button>
                                      ))}
                                  </div>
                              </div>
                              <div>
                                  <h4 className="text-[9px] font-black text-zinc-600 mb-2 tracking-[0.2em] uppercase text-center">Ratio</h4>
                                  <select 
                                      value={aspectRatio} 
                                      onChange={(e) => setAspectRatio(e.target.value)}
                                      className="w-full py-1 text-[10px] font-black rounded-md bg-zinc-900 text-zinc-500 border border-zinc-800 focus:ring-1 focus:ring-[#e93263] outline-none"
                                      disabled={isLoading}
                                  >
                                      {availableAspectRatios.map(ratio => (
                                          <option key={ratio} value={ratio}>{ratio}</option>
                                      ))}
                                  </select>
                              </div>
                           </div>
                       )
                   )}

                  <button
                    onClick={handleGenerateScene}
                    disabled={
                        (!isTextMode && !isEditMode && !isConceptMode && !prompt.trim() && !characterImage) || 
                        (isTextMode && !characterImage) || 
                        (isEditMode && (!characterImage || !maskImage || !prompt.trim())) ||
                        (isConceptMode && !prompt.trim() && !characterImage) ||
                        isLoading
                    }
                    className={`w-full py-3 px-4 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-all
                        ${isLoading ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-[#e93263] text-white hover:bg-[#ff467a] shadow-lg shadow-[#e93263]/20'}
                    `}
                  >
                    {isLoading ? (
                      <>
                        <Spinner size="sm" />
                        PROCESSING...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="w-4 h-4" />
                        {modelMode === 'video' ? 'GENERATE VIDEO' : 
                         modelMode === 'text' ? 'ANALYZE IMAGE' : 
                         modelMode === 'edit' ? 'RUN EDIT' :
                         modelMode === 'concept' ? 'CHAT' :
                         `GENERATE ${modelMode.toUpperCase()}`}
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleSaveImage}
                        disabled={!currentScene || isLoading}
                        className="py-2 px-3 flex items-center justify-center gap-2 bg-black/40 border border-zinc-800 text-zinc-400 text-[9px] font-black uppercase tracking-widest rounded-lg hover:text-white hover:border-zinc-500 transition-all disabled:opacity-30"
                      >
                        <DownloadIcon className="w-3.5 h-3.5" />
                        SAVE
                      </button>
                      <button
                        onClick={handleStartOver}
                        disabled={isLoading}
                        className="py-2 px-3 bg-black/40 border border-zinc-800 text-zinc-400 text-[9px] font-black uppercase tracking-widest rounded-lg hover:text-white hover:border-zinc-500 transition-all disabled:opacity-30"
                      >
                        RESET
                      </button>
                  </div>
                </div>

                {error && !isLoading && (
                  <div className="mt-4 text-center text-red-400 bg-red-950/20 border border-red-900/30 p-3 rounded-lg">
                    <p className="font-bold text-[10px] uppercase tracking-widest mb-1">Warning</p>
                    <p className="text-[10px] opacity-80">{error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Display & Library Panel */}
            <div className="lg:col-span-8 flex flex-col gap-6 lg:h-full lg:overflow-hidden">
                <div className="h-[500px] lg:h-auto lg:flex-1 flex flex-col justify-center items-center relative bg-[#121214] rounded-3xl p-6 shadow-2xl border border-zinc-800/40 overflow-hidden">
                   <div className="w-full flex-grow flex justify-center items-center relative h-full">
                    <ImageEditor
                        scene={currentScene}
                        isLoading={isLoading}
                    />
                   </div>
                    {currentScene?.text && !isLoading && !isTextMode && !isConceptMode && (
                        <div className="w-full mt-6 p-4 bg-black/60 rounded-xl border border-zinc-800/50">
                          <p className="text-[#e93263] text-[10px] font-black uppercase tracking-[0.2em] mb-2">Model Note:</p>
                          <p className="text-zinc-400 text-xs leading-relaxed italic">"{currentScene.text}"</p>
                        </div>
                    )}
                </div>

                {sceneHistory.length > 0 && (
                  <div className="bg-[#121214] rounded-2xl p-4 sm:p-6 shadow-xl border border-zinc-800/50 flex-shrink-0">
                    <h3 className="text-[10px] font-black text-[#e93263] mb-4 uppercase tracking-[0.3em] opacity-80">LIBRARY</h3>
                    <GenerationGallery
                      scenes={sceneHistory}
                      onSelectScene={handleSelectSceneFromHistory}
                      selectedSceneId={currentScene?.id ?? null}
                      onToggleFavorite={handleToggleFavorite}
                      onDeleteScene={handleDeleteScene}
                    />
                  </div>
                )}
            </div>
          </main>
      </div>
    </div>
  );
};

export default App;
