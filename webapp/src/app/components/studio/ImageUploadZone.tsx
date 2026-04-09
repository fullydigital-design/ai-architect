import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface ImageUploadZoneProps {
  text: string;
  subtext: string;
  onUpload: (file: File) => void;
  onRemove?: () => void;
  imageUrl?: string | null;
  disabled?: boolean;
}

export function ImageUploadZone({ 
  text, 
  subtext, 
  onUpload, 
  onRemove, 
  imageUrl,
  disabled = false 
}: ImageUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    onUpload(file);
  };

  const handleClick = () => {
    if (disabled) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFileSelect(file);
    };
    input.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div 
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative aspect-video rounded-xl border-2 border-dashed ${
        isDragging 
          ? 'border-pink-500 bg-pink-500/10' 
          : imageUrl 
          ? 'border-pink-500/30 bg-black/50' 
          : 'border-white/20 bg-white/5 hover:border-pink-500/50 hover:bg-pink-500/5'
      } transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} flex flex-col items-center justify-center gap-3 overflow-hidden`}
    >
      {imageUrl ? (
        <>
          {/* Preview Image */}
          <img 
            src={imageUrl} 
            alt="Uploaded preview" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          
          {/* Overlay with actions */}
          {!disabled && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <Button
                onClick={handleClick}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
                size="sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                Change
              </Button>
              {onRemove && (
                <Button
                  onClick={handleRemoveClick}
                  variant="outline"
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
                  size="sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-pink-500/20 transition-all">
            <Upload className="w-8 h-8 text-content-muted group-hover:text-pink-400 transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-content-secondary font-medium mb-1 uppercase text-sm">{text}</p>
            <p className="text-content-faint text-xs">{subtext}</p>
          </div>
        </>
      )}
    </div>
  );
}
