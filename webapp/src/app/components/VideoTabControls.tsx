import React from 'react';
import { Video, Upload, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Spinner } from '@/app/components/Spinner';

interface VideoTabControlsProps {
  studio: any;
  gradient: string;
  isMobile: boolean;
}

export function VideoTabControls({ studio, gradient, isMobile }: VideoTabControlsProps) {
  // Helper component for PanelCard
  const PanelCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className={`rounded-xl border-2 border-gray-200 bg-white/50 backdrop-blur-sm ${isMobile ? 'p-3' : 'p-4'}`}>
      <h4 className="text-gray-900 font-bold mb-3 text-xs uppercase tracking-wider">{title}</h4>
      {children}
    </div>
  );

  // Helper component for UploadZone
  const UploadZone = ({ 
    text, 
    subtext, 
    onFileSelect, 
    currentImage, 
    onRemove, 
    disabled 
  }: { 
    text: string; 
    subtext: string; 
    onFileSelect: (file: File) => void; 
    currentImage?: string;
    onRemove?: () => void;
    disabled?: boolean;
  }) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    if (currentImage) {
      return (
        <div className="relative group">
          <img src={currentImage} alt="Uploaded" className="w-full aspect-square object-cover rounded-lg border-2 border-gray-200" />
          {onRemove && (
            <button
              onClick={onRemove}
              disabled={disabled}
              className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      );
    }

    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
          }}
          className="hidden"
          disabled={disabled}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="w-full py-6 lg:py-8 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 transition-all cursor-pointer disabled:opacity-50"
        >
          <Upload className="w-6 h-6 lg:w-8 lg:h-8 text-content-secondary mx-auto mb-2" />
          <p className="text-gray-900 font-medium text-xs lg:text-sm">{text}</p>
          <p className="text-content-muted text-xs mt-1">{subtext}</p>
        </button>
      </>
    );
  };

  // Calculate constraints
  const isExtendMode = studio.videoGenerationMode === 'extend';
  const hasReferences = studio.videoReferenceImages && studio.videoReferenceImages.length > 0;
  const isHighRes = studio.videoResolution === '1080p' || studio.videoResolution === '4k';
  const force8s = hasReferences || isHighRes || isExtendMode;
  const force16x9 = hasReferences;
  const force720p = isExtendMode;

  return (
    <>
      {/* Model Selection */}
      <PanelCard title="Model">
        <select
          value={studio.videoModel}
          onChange={(e) => studio.setVideoModel(e.target.value as any)}
          disabled={studio.isLoading}
          className="w-full py-2.5 px-3 rounded-xl bg-white text-gray-900 border-2 border-gray-200 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all disabled:opacity-50 text-sm font-medium"
        >
          <option value="veo-3.1-fast-generate-preview">Veo 3.1 Fast (Speed)</option>
          <option value="veo-3.1-generate-preview">Veo 3.1 (Quality)</option>
        </select>
      </PanelCard>

      {/* Generation Mode */}
      <PanelCard title="Generation Mode">
        <select
          value={studio.videoGenerationMode}
          onChange={(e) => studio.setVideoGenerationMode(e.target.value as any)}
          disabled={studio.isLoading}
          className="w-full py-2.5 px-3 rounded-xl bg-white text-gray-900 border-2 border-gray-200 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all disabled:opacity-50 text-sm font-medium"
        >
          <option value="text-to-video">Text → Video</option>
          <option value="image-to-video">Image → Video</option>
          <option value="interpolation">First + Last Frame</option>
          <option value="extend">Extend Video</option>
        </select>
      </PanelCard>

      {/* Start Frame */}
      <PanelCard title="Start Frame (Optional)">
        <UploadZone 
          text="Upload Image" 
          subtext="Image → Video starting frame" 
          onFileSelect={studio.handleCharacterImageChange}
          currentImage={studio.characterImage?.dataUrl}
          onRemove={studio.handleRemoveCharacterImage}
          disabled={studio.isLoading}
        />
      </PanelCard>

      {/* Last Frame (only for interpolation) */}
      {studio.videoGenerationMode === 'interpolation' && (
        <PanelCard title="Last Frame (Required)">
          <UploadZone 
            text="Upload Image" 
            subtext="Interpolation end frame" 
            onFileSelect={(file) => {
              // Process file and set as last frame
              import('@/utils/fileUtils').then(({ processImageFile }) => {
                processImageFile(file).then(imageData => {
                  studio.setVideoLastFrame(imageData);
                }).catch(err => console.error(err));
              });
            }}
            currentImage={studio.videoLastFrame?.dataUrl}
            onRemove={() => studio.setVideoLastFrame(null)}
            disabled={studio.isLoading}
          />
        </PanelCard>
      )}

      {/* Reference Images */}
      <PanelCard title="Reference Images (Up to 3)">
        {studio.videoReferenceImages.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {studio.videoReferenceImages.map((img: any, idx: number) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 group">
                <img src={img.dataUrl} alt={`Ref ${idx}`} className="w-full h-full object-cover" />
                <button 
                  onClick={() => studio.handleRemoveVideoReferenceImage(idx)}
                  disabled={studio.isLoading}
                  className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {studio.videoReferenceImages.length < 3 && (
          <>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) studio.handleVideoReferenceImageUpload(file);
              }}
              className="hidden"
              id="video-ref-upload"
              disabled={studio.isLoading}
            />
            <button
              onClick={() => document.getElementById('video-ref-upload')?.click()}
              disabled={studio.isLoading}
              className="w-full py-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 transition-all text-sm font-medium text-content-faint disabled:opacity-50"
            >
              {studio.videoReferenceImages.length === 0 ? 'Add Reference' : 'Add Another'}
              <span className="text-content-muted ml-2">({studio.videoReferenceImages.length} / 3)</span>
            </button>
          </>
        )}
        {hasReferences && (
          <p className="text-xs text-purple-600 mt-2">
            🎯 16:9 + 8s enforced for references
          </p>
        )}
      </PanelCard>

      {/* Describe the Video */}
      <PanelCard title="Describe the Video">
        <textarea
          value={studio.prompt}
          onChange={(e) => studio.setPrompt(e.target.value)}
          placeholder="e.g., 'Cinematic close-up of a sports car driving through rain, neon reflections, slow motion...'"
          disabled={studio.isLoading}
          className="w-full h-28 lg:h-32 px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all disabled:opacity-50 text-sm"
        />
        <p className="text-xs text-content-muted mt-2">
          💡 Tip: include subject + action + style + camera + lighting
        </p>
      </PanelCard>

      {/* Negative Prompt */}
      <PanelCard title="Negative Prompt (Optional)">
        <textarea
          value={studio.videoNegativePrompt}
          onChange={(e) => studio.setVideoNegativePrompt(e.target.value)}
          placeholder='e.g., "cartoon, low quality, blurry, distorted"'
          disabled={studio.isLoading}
          className="w-full h-20 px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all disabled:opacity-50 text-sm"
        />
      </PanelCard>

      {/* Resolution */}
      <PanelCard title="Resolution">
        <div className="grid grid-cols-3 gap-2">
          {['720p', '1080p', '4k'].map((res) => {
            const isDisabled = studio.isLoading || (force720p && res !== '720p');
            return (
              <button
                key={res}
                onClick={() => studio.setVideoResolution(res)}
                disabled={isDisabled}
                title={force720p && res !== '720p' ? 'Extend mode requires 720p' : ''}
                className={`py-2.5 rounded-xl font-bold transition-all text-sm ${
                  studio.videoResolution === res
                    ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg'
                    : 'bg-white text-content-faint hover:bg-gray-50 border-2 border-gray-200'
                } ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                {res.toUpperCase()}
              </button>
            );
          })}
        </div>
      </PanelCard>

      {/* Aspect Ratio */}
      <PanelCard title="Aspect Ratio">
        <div className="grid grid-cols-2 gap-2">
          {['16:9', '9:16'].map((ratio) => {
            const isDisabled = studio.isLoading || (force16x9 && ratio !== '16:9');
            return (
              <button
                key={ratio}
                onClick={() => studio.setVideoAspectRatio(ratio)}
                disabled={isDisabled}
                title={force16x9 && ratio !== '16:9' ? 'References require 16:9' : ''}
                className={`py-2.5 rounded-xl font-bold transition-all text-sm ${
                  studio.videoAspectRatio === ratio
                    ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg'
                    : 'bg-white text-content-faint hover:bg-gray-50 border-2 border-gray-200'
                } ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                {ratio}
              </button>
            );
          })}
        </div>
      </PanelCard>

      {/* Duration */}
      <PanelCard title="Duration">
        <div className="grid grid-cols-3 gap-2">
          {[4, 6, 8].map((duration) => {
            const isDisabled = studio.isLoading || (force8s && duration !== 8);
            return (
              <button
                key={duration}
                onClick={() => studio.setVideoDuration(duration)}
                disabled={isDisabled}
                title={force8s && duration !== 8 ? '8s required for this setting' : ''}
                className={`py-2.5 rounded-xl font-bold transition-all text-sm ${
                  studio.videoDuration === duration
                    ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg'
                    : 'bg-white text-content-faint hover:bg-gray-50 border-2 border-gray-200'
                } ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                {duration}s
              </button>
            );
          })}
        </div>
        {force8s && (
          <p className="text-xs text-yellow-600 mt-2">
            ⚠️ 8s required for current settings
          </p>
        )}
      </PanelCard>

      {/* Advanced Settings */}
      <PanelCard title="Advanced">
        <div className="space-y-3">
          <div>
            <label className="text-content-faint text-xs font-medium mb-1 block">Variations (1-4)</label>
            <input
              type="number"
              min={1}
              max={4}
              value={studio.videoVariations}
              onChange={(e) => studio.setVideoVariations(Math.max(1, Math.min(4, parseInt(e.target.value) || 1)))}
              disabled={studio.isLoading}
              className="w-full py-2 px-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all disabled:opacity-50 text-sm"
            />
          </div>
          <div>
            <label className="text-content-faint text-xs font-medium mb-1 block">Seed (Optional)</label>
            <input
              type="number"
              value={studio.videoSeed || ''}
              onChange={(e) => studio.setVideoSeed(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Leave empty for random"
              disabled={studio.isLoading}
              className="w-full py-2 px-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all disabled:opacity-50 text-sm"
            />
            <p className="text-xs text-content-muted mt-1">Improves repeatability</p>
          </div>
        </div>
      </PanelCard>

      {/* Generate Button */}
      <Button 
        onClick={studio.handleGenerateScene}
        disabled={!studio.prompt.trim() || studio.isLoading}
        className={`w-full bg-gradient-to-r ${gradient} text-white border-0 py-5 lg:py-6 shadow-lg hover:shadow-xl transition-all disabled:opacity-50`}
      >
        {studio.isLoading ? (
          <>
            <Spinner size="sm" className="mr-2" />
            GENERATING VIDEO...
          </>
        ) : (
          <>
            <Video className="w-5 h-5 mr-2" />
            GENERATE VIDEO
          </>
        )}
      </Button>

      {/* Warning */}
      <div className="p-3 lg:p-4 rounded-xl bg-yellow-50 border-2 border-yellow-200">
        <p className="text-yellow-800 text-xs font-medium">
          ⚠️ Video generation may take a few minutes and requires a paid API key
        </p>
      </div>
    </>
  );
}
