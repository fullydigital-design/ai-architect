/**
 * ExecutionPanel - displays execution progress, results (images), and errors.
 * Appears as a slide-up panel in the bottom-right visualizer area.
 */

import { useEffect, useState } from 'react';
import {
  X,
  ChevronDown,
  ChevronUp,
  Download,
  Image as ImageIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Maximize2,
  Wand2,
} from 'lucide-react';
import type { ExecutionProgress, ExecutionImage, ExecutionResult } from '../../../services/comfyui-execution';

interface ExecutionPanelProps {
  progress: ExecutionProgress | null;
  result: ExecutionResult | null;
  onClose: () => void;
  onCancel?: () => void;
  onDebugError?: () => void;
  isDebugging?: boolean;
}

export function ExecutionPanel({ progress, result, onClose, onCancel, onDebugError, isDebugging }: ExecutionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const isRunning = progress?.status === 'running' || progress?.status === 'queued';
  const hasImages = Boolean(result?.images?.length);
  const hasError = Boolean(result?.error || progress?.status === 'error');

  useEffect(() => {
    if (!result?.success || !hasImages) return;
    setIsExpanded(true);
    const timer = window.setTimeout(() => {
      setIsExpanded(false);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [result?.success, result?.promptId, hasImages]);

  if (!progress && !result) return null;

  return (
    <>
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-surface-overlay z-50 flex items-center justify-center cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <img
            src={lightboxImage}
            alt="Generated"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-sm"
          />
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-sm bg-surface-200/90 border border-border text-content-secondary hover:text-content-primary hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="bg-surface-200/95 backdrop-blur-sm border-t border-border z-20 flex-shrink-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            {isRunning && <Loader2 className="w-3.5 h-3.5 text-accent-text animate-spin" />}
            {result?.success && <CheckCircle2 className="w-3.5 h-3.5 text-state-success" />}
            {hasError && <AlertCircle className="w-3.5 h-3.5 text-state-error" />}
            {progress?.status === 'cancelled' && <X className="w-3.5 h-3.5 text-content-secondary" />}

            <span className="text-xs text-content-secondary">
              {isRunning && 'Executing workflow...'}
              {result?.success && `Complete - ${result.images.length} image${result.images.length !== 1 ? 's' : ''}`}
              {hasError && 'Execution failed'}
              {progress?.status === 'cancelled' && 'Cancelled'}
            </span>

            {result?.durationMs && result.success && (
              <span className="text-[10px] text-content-muted flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {formatDuration(result.durationMs)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isRunning && onCancel && (
              <button
                onClick={onCancel}
                className="px-2 py-1 rounded-sm text-[10px] text-state-error hover:bg-state-error-muted transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-sm text-content-muted hover:text-content-secondary transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-sm text-content-muted hover:text-content-secondary transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="px-3 py-2 max-h-[40vh] overflow-y-auto scrollbar-thin">
            {isRunning && (
              <div className="space-y-2 mb-3">
                {progress?.percentage != null && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-content-secondary">Step {progress.step}/{progress.totalSteps}</span>
                      <span className="text-accent-text">{progress.percentage}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-300 rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-sm transition-all duration-200"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                  </div>
                )}

                {progress?.currentNodeClass && (
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-accent-text" />
                    <span className="text-content-secondary">Processing:</span>
                    <span className="text-content-secondary font-mono">{progress.currentNodeClass}</span>
                    {progress.currentNode && <span className="text-content-muted">#{progress.currentNode}</span>}
                  </div>
                )}

                {progress?.completedNodes && progress.completedNodes.length > 0 && (
                  <div className="text-[9px] text-content-muted">
                    {progress.completedNodes.length} node{progress.completedNodes.length !== 1 ? 's' : ''} completed
                  </div>
                )}
              </div>
            )}

            {hasError && (
              <div className="p-2.5 rounded-sm bg-state-error-muted border border-state-error/20 mb-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-state-error shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-state-error">{result?.error || 'Unknown execution error'}</p>

                    {result?.errorDetails?.exceptionType && (
                      <p className="text-[10px] text-state-error/70 mt-1 font-mono">{result.errorDetails.exceptionType}</p>
                    )}

                    {result?.errorDetails?.nodeId && (
                      <div className="mt-1.5 px-2 py-1 rounded-sm bg-state-error-muted border border-state-error/20">
                        <span className="text-[9px] text-state-error/60">
                          Failed at node #{result.errorDetails.nodeId}
                          {result.errorDetails.nodeType && (
                            <> (<span className="font-mono text-state-error/70">{result.errorDetails.nodeType}</span>)</>
                          )}
                        </span>
                      </div>
                    )}

                    {result?.errorDetails?.traceback && result.errorDetails.traceback.length > 0 && (
                      <details className="mt-1.5">
                        <summary className="text-[9px] text-state-error/50 cursor-pointer hover:text-state-error/70 transition-colors">
                          Show traceback ({result.errorDetails.traceback.length} lines)
                        </summary>
                        <pre className="mt-1 text-[8px] text-state-error/60 font-mono bg-surface-100 border border-border rounded-sm p-1.5 max-h-[120px] overflow-auto whitespace-pre-wrap break-all">
                          {result.errorDetails.traceback.slice(-10).join('\n')}
                        </pre>
                      </details>
                    )}

                    <p className="text-[10px] text-state-error/40 mt-1.5">Check the ComfyUI console for full details.</p>

                    {onDebugError && (
                      <button
                        onClick={onDebugError}
                        disabled={isDebugging}
                        className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-state-error-muted hover:bg-state-error-muted disabled:opacity-40 text-state-error text-[11px] border border-state-error/20 hover:border-state-error/30 transition-colors"
                      >
                        {isDebugging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                        {isDebugging ? 'Analyzing error...' : 'Ask AI to Debug'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {hasImages && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] text-content-secondary">
                  <ImageIcon className="w-3 h-3" />
                  <span>Generated Images</span>
                </div>
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: result!.images.length === 1
                      ? '1fr'
                      : result!.images.length <= 4
                        ? 'repeat(2, 1fr)'
                        : 'repeat(3, 1fr)',
                  }}
                >
                  {result!.images.map((img, idx) => (
                    <ImageCard
                      key={`${img.filename}-${idx}`}
                      image={img}
                      onExpand={() => setLightboxImage(img.url)}
                    />
                  ))}
                </div>
              </div>
            )}

            {progress?.status === 'queued' && (
              <div className="flex items-center gap-2 py-4 justify-center text-content-secondary text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-accent-text" />
                <span>Queued - waiting for ComfyUI...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function ImageCard({ image, onExpand }: { image: ExecutionImage; onExpand: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.filename;
    link.click();
  };

  return (
    <div
      className="relative group rounded-sm overflow-hidden bg-surface-300 border border-border cursor-pointer hover:border-primary/30 transition-colors"
      onClick={onExpand}
    >
      {!loaded && !error && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-content-muted" />
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center py-6 text-content-muted text-[10px]">
          Failed to load
        </div>
      )}
      <img
        src={image.url}
        alt={image.filename}
        className={`w-full h-auto ${loaded ? 'block' : 'hidden'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />

      <div className="absolute inset-0 bg-surface-overlay opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            className="p-1.5 rounded-sm bg-surface-overlay text-accent-contrast hover:bg-surface-overlay transition-colors"
            title="Expand"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-sm bg-surface-overlay text-accent-contrast hover:bg-surface-overlay transition-colors"
            title="Download"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="absolute bottom-1 left-1 text-[8px] bg-surface-overlay text-content-secondary px-1 py-0.5 rounded-sm">
        #{image.nodeId}
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const secs = ms / 1000;
  if (secs < 60) return `${secs.toFixed(1)}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = Math.round(secs % 60);
  return `${mins}m ${remSecs}s`;
}



