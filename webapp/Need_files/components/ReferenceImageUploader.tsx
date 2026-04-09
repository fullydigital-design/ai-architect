/**
 * PASTE YOUR ReferenceImageUploader.tsx CODE HERE
 * 
 * From: /components/ReferenceImageUploader.tsx
 */

import React, { useRef, useState } from 'react';
import { UploadIcon, XIcon, BookmarkIcon } from './Icons';

interface ReferenceImageUploaderProps {
  onImageChange: (file: File) => void;
  onImageRemove: () => void;
  imageDataUrl: string | null;
  disabled: boolean;
  placeholderText: string;
  onSaveStyle?: () => void;
  className?: string;
}

const ReferenceImageUploader: React.FC<ReferenceImageUploaderProps> = ({ 
  onImageChange, 
  onImageRemove, 
  imageDataUrl, 
  disabled, 
  placeholderText, 
  onSaveStyle,
  className 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const sizeClass = className || "aspect-video";

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageChange(file);
      event.target.value = '';
    }
  };

  const triggerFileSelect = () => {
    if (disabled) return;
    fileInputRef.current?.click();
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

  if (imageDataUrl) {
    return (
      <div className={`relative group w-full ${sizeClass} rounded-xl overflow-hidden border border-zinc-800 shadow-inner`}>
        <img src={imageDataUrl} alt="Reference Preview" className="w-full h-full object-cover" />
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={onImageRemove}
            disabled={disabled}
            className="bg-black/60 hover:bg-red-600/80 text-white rounded-lg p-2 transition-colors disabled:opacity-50"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
          {onSaveStyle && (
            <button
              onClick={onSaveStyle}
              disabled={disabled}
              className="bg-black/60 hover:bg-[#e93263]/80 text-white rounded-lg p-2 transition-colors disabled:opacity-50"
            >
              <BookmarkIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={triggerFileSelect}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      className={`relative flex flex-col items-center justify-center w-full ${sizeClass} p-6 border-2 border-dashed rounded-xl transition-all duration-300
      ${disabled 
        ? 'cursor-not-allowed border-zinc-900 bg-transparent' 
        : `cursor-pointer ${isDragging ? 'border-[#e93263] bg-[#e93263]/5 scale-[0.99]' : 'border-zinc-800 hover:border-zinc-700 bg-black/20 hover:bg-black/40'}`
      }`}
    >
      <div className="flex flex-col items-center justify-center text-center text-zinc-500 pointer-events-none">
        <UploadIcon className={`opacity-40 ${sizeClass.includes('h-24') ? 'w-6 h-6 mb-1' : 'w-8 h-8 mb-3'}`} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">
          {isDragging ? 'Drop Image' : placeholderText}
        </p>
        {!isDragging && !sizeClass.includes('h-24') && <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest">Drag & drop or click</p>}
      </div>
      <input 
        ref={fileInputRef} 
        type="file" 
        className="hidden" 
        onChange={handleFileChange} 
        accept="image/*"
        disabled={disabled}
      />
    </div>
  );
};

export default ReferenceImageUploader;
