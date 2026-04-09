import { useRef, useEffect } from 'react';
import { Image as ImageIcon, Sparkles } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import type { RefinementResult } from '@/types/studio';

interface PreviewPanelProps {
  scene: RefinementResult | null;
  isLoading: boolean;
}

const loadingTips = [
  'Try using a style image with strong lighting for dramatic effects.',
  'A clear character image helps the model focus on the subject.',
  'Combining multiple modifications can lead to surprising results!',
  'The negative prompt helps you remove unwanted elements from the scene.',
  'Video generation with Veo takes longer than images. Sit tight!',
  'Gemini can analyze your image and write a prompt for you.',
];

export function PreviewPanel({ scene, isLoading }: PreviewPanelProps) {
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scene?.type === 'concept' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scene?.chatHistory]);

  if (isLoading && scene?.type !== 'concept') {
    const randomTip = loadingTips[Math.floor(Math.random() * loadingTips.length)];
    
    return (
      <div className="absolute inset-0 bg-zinc-900/80 flex flex-col justify-center items-center rounded-2xl z-10 p-4 text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-lg text-content-primary animate-pulse">Generating...</p>
        <p className="text-sm text-content-secondary mt-2 max-w-md">{randomTip}</p>
      </div>
    );
  }

  if (!scene) {
    return (
      <div className="text-center text-zinc-500 p-4 flex flex-col items-center justify-center h-full">
        <Sparkles className="w-16 h-16 mb-4 opacity-50" />
        <h2 className="text-2xl font-semibold">Create, refine or edit scenes and motifs</h2>
        <p className="mt-2 text-zinc-600">Just by using a product or character, a location, and a text prompt.</p>
      </div>
    );
  }

  // CONCEPT MODE - Chat Interface
  if (scene.type === 'concept' && scene.chatHistory) {
    return (
      <div className="w-full h-full flex flex-col relative overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 p-2">
          {scene.chatHistory.length === 0 && (
            <div className="text-center text-content-muted mt-10">Start the conversation...</div>
          )}
          {scene.chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-4 border ${
                msg.role === 'user' 
                  ? 'bg-zinc-800 border-zinc-700 text-white' 
                  : 'bg-black/40 border-purple-600/50 text-content-primary'
              }`}>
                {msg.imageUrl && (
                  <img src={msg.imageUrl} alt="Attached" className="max-h-48 rounded-lg mb-3 object-contain" />
                )}
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex w-full justify-start">
              <div className="max-w-[85%] rounded-2xl p-4 border bg-black/40 border-purple-600/50 text-content-primary flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span className="text-xs text-content-secondary">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>
      </div>
    );
  }

  // TEXT MODE - Analysis Display
  if (scene.type === 'text' && scene.analysis) {
    return (
      <div className="w-full h-full flex flex-col gap-4 min-h-[400px]">
        <div className="flex-1 bg-black/40 rounded-lg p-4 border border-zinc-800 overflow-y-auto">
          <h3 className="text-sm font-bold text-pink-400 mb-2 uppercase tracking-wide">Description</h3>
          <p className="text-content-primary text-sm leading-relaxed whitespace-pre-wrap">
            {scene.analysis.description}
          </p>
        </div>
        <div className="h-[35%] bg-black/40 rounded-lg p-4 border border-zinc-800 overflow-y-auto">
          <h3 className="text-sm font-bold text-pink-400 mb-2 uppercase tracking-wide">Generated Prompt</h3>
          <p className="text-white font-mono text-sm border-l-2 border-pink-500 pl-3">
            {scene.analysis.shortPrompt}
          </p>
        </div>
      </div>
    );
  }

  // VIDEO MODE - Video Player
  if (scene.type === 'video' && scene.videoUrl) {
    return (
      <video
        src={scene.videoUrl}
        controls
        autoPlay
        loop
        className="max-w-full max-h-full rounded-lg shadow-2xl"
      >
        Your browser does not support the video tag.
      </video>
    );
  }

  // IMAGE MODE - Image Display
  return (
    <img
      src={scene.imageUrl}
      alt="Generated scene"
      className="max-w-full max-h-full object-contain rounded-lg"
    />
  );
}
