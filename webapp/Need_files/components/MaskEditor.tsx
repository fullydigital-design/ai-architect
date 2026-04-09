/**
 * PASTE YOUR MaskEditor.tsx CODE HERE
 * 
 * From: /components/MaskEditor.tsx
 */
import React, { useRef, useEffect, useState } from 'react';
import { PenIcon, EraserIcon, UndoIcon, TrashIcon } from './Icons';

interface MaskEditorProps {
    imageUrl: string;
    onMaskChange: (base64: string | null, mimeType: string) => void;
}

const MaskEditor: React.FC<MaskEditorProps> = ({ imageUrl, onMaskChange }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
    const [history, setHistory] = useState<ImageData[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.src = imageUrl;
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            saveHistory(); 
        };
    }, [imageUrl]);

    const saveHistory = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Limit history size
        if (history.length > 10) {
            setHistory(prev => [...prev.slice(1), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
        } else {
            setHistory(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
        }
        exportMask();
    };

    const handleUndo = () => {
        if (history.length <= 1) return; // Keep initial empty state
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const newHistory = [...history];
        newHistory.pop(); // Remove current state
        const previousState = newHistory[newHistory.length - 1];
        
        ctx.putImageData(previousState, 0, 0);
        setHistory(newHistory);
        exportMask();
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        saveHistory();
    };

    const getMousePos = (evt: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in evt ? evt.touches[0].clientX : (evt as React.MouseEvent).clientX;
        const clientY = 'touches' in evt ? evt.touches[0].clientY : (evt as React.MouseEvent).clientY;
        
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (e.cancelable) e.preventDefault();
        setIsDrawing(true);
        const { x, y } = getMousePos(e);
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = canvas.width / 15; // Responsive brush size
        
        if (tool === 'pen') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; // Visible red for user
        } else {
            ctx.globalCompositeOperation = 'destination-out';
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        if (e.cancelable) e.preventDefault();
        
        const { x, y } = getMousePos(e);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            saveHistory();
        }
    };

    const exportMask = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Create a temporary canvas to generate the binary mask
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;

        // 1. Draw Red Drawing from source canvas
        ctx.drawImage(canvas, 0, 0);

        // 2. Change Source to White (Keep alpha)
        // This effectively turns the red strokes into white strokes
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // 3. Draw Black Background behind
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Export
        const dataUrl = tempCanvas.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        onMaskChange(base64, 'image/png');
    };

    return (
        <div className="flex flex-col gap-3 w-full select-none">
            {/* Image & Canvas Container */}
            <div ref={containerRef} className="relative w-full rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 group">
                <img 
                    src={imageUrl} 
                    alt="Original" 
                    className="w-full h-auto block select-none pointer-events-none" 
                />
                
                {/* Drawing Canvas Overlay */}
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </div>

            {/* Toolbar - Moved below the image */}
            <div className="flex justify-between items-center bg-zinc-900 border border-zinc-700 rounded-lg p-2 shadow-lg">
                <div className="flex gap-2">
                    <button 
                        onClick={() => setTool('pen')}
                        className={`p-2 rounded-md transition-colors flex items-center gap-2 ${tool === 'pen' ? 'bg-[#e93263] text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                        title="Pen"
                    >
                        <PenIcon className="w-5 h-5" />
                        <span className="text-xs hidden sm:inline">Draw</span>
                    </button>
                    <button 
                        onClick={() => setTool('eraser')}
                        className={`p-2 rounded-md transition-colors flex items-center gap-2 ${tool === 'eraser' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                        title="Eraser"
                    >
                        <EraserIcon className="w-5 h-5" />
                        <span className="text-xs hidden sm:inline">Erase</span>
                    </button>
                </div>

                <div className="w-px h-6 bg-zinc-700"></div>

                <div className="flex gap-2">
                    <button 
                        onClick={handleUndo}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                        title="Undo"
                    >
                        <UndoIcon className="w-5 h-5" />
                    </button>
                     <button 
                        onClick={handleClear}
                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded-md transition-colors"
                        title="Clear Mask"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MaskEditor;