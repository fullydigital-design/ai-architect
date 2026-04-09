/**
 * PASTE YOUR GenerationGallery.tsx CODE HERE
 * 
 * From: /components/GenerationGallery.tsx
 */
import React from 'react';
import type { RefinementResult } from '../types';
import { StarIcon, TrashIcon } from './Icons';

interface GenerationGalleryProps {
  scenes: RefinementResult[];
  onSelectScene: (scene: RefinementResult) => void;
  selectedSceneId: string | null;
  onToggleFavorite: (id: string) => void;
  onDeleteScene: (id: string) => void;
}

const VideoIconOverlay = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors pointer-events-none">
        <div className="bg-black/60 rounded-full p-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
        </div>
    </div>
);

const ConceptThumbnail = () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 p-2 group-hover:bg-zinc-800 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-green-500 mb-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
        </svg>
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider group-hover:text-zinc-200">Concept</span>
    </div>
);

const GenerationGallery: React.FC<GenerationGalleryProps> = ({ scenes, onSelectScene, selectedSceneId, onToggleFavorite, onDeleteScene }) => {
  const sortedScenes = [...scenes].sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
  
  return (
    <div className="flex space-x-3 overflow-x-auto py-2 -mx-4 sm:-mx-6 px-4 sm:px-6">
      {sortedScenes.map((scene) => (
        <div key={scene.id} className="relative group flex-shrink-0">
          <button
            onClick={() => onSelectScene(scene)}
            className={`w-24 h-24 rounded-lg overflow-hidden border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-[#e93263] relative
              ${selectedSceneId === scene.id ? 'border-[#e93263] scale-105' : 'border-zinc-700 hover:border-zinc-500'}
            `}
            aria-label={`Select generated scene`}
            title={`Prompt: ${scene.prompt}\nNegative: ${scene.negativePrompt || 'none'}`}
          >
            {scene.type === 'concept' ? (
                <ConceptThumbnail />
            ) : (
                <>
                    <img src={scene.imageUrl} alt={`Generated Scene`} className="w-full h-full object-cover" />
                    {scene.type === 'video' && <VideoIconOverlay />}
                </>
            )}
          </button>
          <div className="absolute top-1 right-1 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(scene.id); }}
              className="bg-black/50 text-white hover:text-yellow-400 p-1.5 rounded-full"
              title={scene.isFavorite ? "Unfavorite" : "Favorite"}
            >
              <StarIcon className="w-3.5 h-3.5" filled={scene.isFavorite} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteScene(scene.id); }}
              className="bg-black/50 text-white hover:text-red-500 p-1.5 rounded-full"
              title="Delete Scene"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GenerationGallery;