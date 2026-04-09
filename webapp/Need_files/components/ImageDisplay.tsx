/**
 * PASTE YOUR ImageDisplay.tsx CODE HERE
 * 
 * From: /components/ImageDisplay.tsx
 */
import React from 'react';

interface ImageDisplayProps {
  originalImage: string;
  refinedImage: string;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ originalImage, refinedImage }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      <div className="flex flex-col items-center">
        <h3 className="text-lg font-bold mb-3 text-gray-600">Original</h3>
        <div className="aspect-[3/4] w-full bg-gray-100 rounded-xl overflow-hidden shadow-md border border-gray-200">
          <img src={originalImage} alt="Original" className="object-contain w-full h-full" />
        </div>
      </div>
      <div className="flex flex-col items-center">
        <h3 className="text-lg font-bold mb-3 text-indigo-600">Refined</h3>
        <div className="aspect-[3/4] w-full bg-gray-100 rounded-xl overflow-hidden shadow-md border-2 border-indigo-400">
          <img src={refinedImage} alt="Refined" className="object-contain w-full h-full" />
        </div>
      </div>
    </div>
  );
};

export default ImageDisplay;