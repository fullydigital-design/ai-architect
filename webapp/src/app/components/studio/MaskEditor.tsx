import React, { useRef, useEffect, useState } from 'react';
import { Pen, Eraser, Undo, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface MaskEditorProps {
    imageUrl: string;
    onMaskChange: (base64: string | null, mimeType: string) => void;
}

export const MaskEditor: React.FC<MaskEditorProps> = ({ imageUrl, onMaskChange }) => {
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
            ctx.strokeStyle = 'rgba(255, 0, 100, 0.7)'; // Pink color for mask
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
            <div ref={containerRef} className="relative w-full rounded-xl overflow-hidden border-2 border-white/20 bg-black/50 group">
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

            {/* Toolbar */}
            <div className="flex justify-between items-center bg-gradient-to-br from-gray-900/90 to-black/90 border border-border-default rounded-xl p-3 backdrop-blur-xl">
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        onClick={() => setTool('pen')}
                        className={`${
                            tool === 'pen' 
                                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' 
                                : 'bg-white/5 text-content-secondary hover:text-white hover:bg-white/10 border border-border-default'
                        }`}
                    >
                        <Pen className="w-4 h-4 mr-2" />
                        Draw
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => setTool('eraser')}
                        className={`${
                            tool === 'eraser' 
                                ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white' 
                                : 'bg-white/5 text-content-secondary hover:text-white hover:bg-white/10 border border-border-default'
                        }`}
                    >
                        <Eraser className="w-4 h-4 mr-2" />
                        Erase
                    </Button>
                </div>

                <div className="w-px h-6 bg-white/10"></div>

                <div className="flex gap-2">
                    <Button
                        size="sm"
                        onClick={handleUndo}
                        variant="outline"
                        disabled={history.length <= 1}
                        className="border-white/20 text-content-secondary hover:text-white hover:bg-white/5 disabled:opacity-30"
                    >
                        <Undo className="w-4 h-4" />
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleClear}
                        variant="outline"
                        className="border-white/20 text-content-secondary hover:text-red-400 hover:bg-red-500/10"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
