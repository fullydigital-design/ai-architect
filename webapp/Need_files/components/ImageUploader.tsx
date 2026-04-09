/**
 * PASTE YOUR ImageUploader.tsx CODE HERE
 * 
 * From: /components/ImageUploader.tsx
 */
import React, { useRef, useState } from 'react';

interface ImageUploaderProps {
  onImageChange: (file: File) => void;
  disabled: boolean;
  mode: '2D' | '3D';
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageChange, disabled, mode }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageChange(file);
      // Reset input value to allow re-uploading the same file
      event.target.value = '';
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
        onImageChange(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };
  
  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) setIsDragging(true);
  };
  
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const triggerFileSelect = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onClick={triggerFileSelect}
        className={`relative flex flex-col items-center justify-center w-full h-full p-6 sm:p-8 rounded-2xl transition-all duration-300
        ${isDragging ? 'bg-zinc-800 border-2 border-dashed border-[#e93263]' : 'bg-zinc-900 border border-zinc-800'}
        ${disabled 
          ? 'cursor-not-allowed' 
          : 'cursor-pointer hover:border-[#e93263]'
        }`}
      >
        <div className={`flex flex-col items-center justify-center text-center transition-opacity pointer-events-none ${isDragging ? 'opacity-50' : 'opacity-100'}`}>
            {mode === '2D' ? (
                <>
                  <p className="text-3xl sm:text-4xl font-semibold text-zinc-500 mb-2">
                    Image Input
                  </p>
                  <p className="text-sm text-zinc-600">
                    Drag & drop or click to upload
                  </p>
                  <p className="text-xs text-zinc-700 mt-1">
                    jpg, png file format
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl sm:text-4xl font-semibold text-zinc-500 mb-2">
                    3D Product Input
                  </p>
                  <p className="text-sm text-zinc-600">
                    Drag & drop or click to upload
                  </p>
                  <p className="text-xs text-zinc-700 mt-1">
                    fbx, glb, file format
                  </p>
                </>
              )}
        </div>
        {isDragging && (
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <p className="font-semibold text-[#e93263] text-lg">Drop file to upload</p>
           </div>
        )}
        <input 
          ref={fileInputRef} 
          id="dropzone-file" 
          type="file" 
          className="hidden" 
          onChange={handleFileChange} 
          accept="image/*"
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default ImageUploader;