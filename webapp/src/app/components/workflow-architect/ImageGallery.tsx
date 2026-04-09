import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Download,
  ExternalLink,
  ImageOff,
  LayoutGrid,
  List,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteHistoryEntries,
  fetchGalleryImages,
  groupImagesByDate,
  type GalleryImage,
} from '../../../services/comfyui-gallery-service';

interface ImageGalleryProps {
  comfyuiUrl?: string;
  onLoadWorkflow?: (workflow: Record<string, unknown>, sourceLabel?: string) => void;
  sessionPromptIds?: Set<string>;
}

type ViewMode = 'grid' | 'list';

function imageKey(image: GalleryImage): string {
  return `${image.promptId}:${image.filename}:${image.subfolder}:${image.timestamp}`;
}

function getStoredComfyUrl(): string {
  if (typeof window === 'undefined') return '';

  const legacy = localStorage.getItem('comfyui-backend-url')?.trim();
  if (legacy) return legacy;

  const rawSettings = localStorage.getItem('comfyui-architect-settings');
  if (!rawSettings) return '';
  try {
    const parsed = JSON.parse(rawSettings) as { comfyuiUrl?: string };
    return parsed.comfyuiUrl?.trim() || '';
  } catch {
    return '';
  }
}

function formatCardTimestamp(ts: number): string {
  try {
    return new Date(ts).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Unknown time';
  }
}

function formatDetailTimestamp(ts: number): string {
  try {
    return new Date(ts).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'Unknown time';
  }
}

function openDownload(url: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function extractWorkflow(image: GalleryImage): Record<string, unknown> | null {
  if (!image.workflow || typeof image.workflow !== 'object') return null;
  return image.workflow;
}

export function ImageGallery({ comfyuiUrl, onLoadWorkflow, sessionPromptIds }: ImageGalleryProps) {
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [gallerySearch, setGallerySearch] = useState('');
  const [galleryViewMode, setGalleryViewMode] = useState<ViewMode>('grid');
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<GalleryImage | null>(null);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const [deletingPromptIds, setDeletingPromptIds] = useState<Set<string>>(new Set());

  const resolvedComfyUrl = useMemo(() => {
    const direct = comfyuiUrl?.trim();
    if (direct) return direct;
    return getStoredComfyUrl();
  }, [comfyuiUrl]);

  const loadGalleryImages = useCallback(async () => {
    if (!resolvedComfyUrl) {
      setGalleryImages([]);
      setGalleryError('ComfyUI not connected. Configure in Settings > ComfyUI Backend.');
      return;
    }

    setGalleryLoading(true);
    setGalleryError(null);
    try {
      const images = await fetchGalleryImages(resolvedComfyUrl, 500, sessionPromptIds);
      setGalleryImages(images);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch gallery images';
      setGalleryError(message);
      console.error('[Gallery] Failed to fetch images:', err);
    } finally {
      setGalleryLoading(false);
    }
  }, [resolvedComfyUrl, sessionPromptIds]);

  useEffect(() => {
    void loadGalleryImages();
  }, [loadGalleryImages]);

  const filteredImages = useMemo(() => {
    const query = gallerySearch.trim().toLowerCase();
    if (!query) return galleryImages;
    return galleryImages.filter((image) => (
      image.filename.toLowerCase().includes(query)
      || image.promptText.toLowerCase().includes(query)
      || image.modelName.toLowerCase().includes(query)
    ));
  }, [galleryImages, gallerySearch]);

  const groupedImages = useMemo(
    () => groupImagesByDate(filteredImages),
    [filteredImages],
  );

  const flatImages = useMemo(
    () => groupedImages.flatMap((group) => group.images),
    [groupedImages],
  );

  const selectedImageIndex = useMemo(() => {
    if (!selectedGalleryImage) return -1;
    const key = imageKey(selectedGalleryImage);
    return flatImages.findIndex((image) => imageKey(image) === key);
  }, [flatImages, selectedGalleryImage]);

  useEffect(() => {
    if (!selectedGalleryImage) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedGalleryImage(null);
        return;
      }
      if (event.key === 'ArrowRight' && selectedImageIndex >= 0) {
        setSelectedGalleryImage(flatImages[Math.min(flatImages.length - 1, selectedImageIndex + 1)] || null);
        return;
      }
      if (event.key === 'ArrowLeft' && selectedImageIndex >= 0) {
        setSelectedGalleryImage(flatImages[Math.max(0, selectedImageIndex - 1)] || null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [flatImages, selectedGalleryImage, selectedImageIndex]);

  const handleCopyUrl = useCallback(async (image: GalleryImage) => {
    try {
      await navigator.clipboard.writeText(image.url);
      toast.success('Image URL copied');
    } catch {
      toast.error('Failed to copy image URL');
    }
  }, []);

  const handleLoadWorkflow = useCallback((image: GalleryImage) => {
    const workflow = extractWorkflow(image);
    if (!workflow) {
      toast.error('No workflow data available for this image');
      return;
    }

    if (onLoadWorkflow) {
      onLoadWorkflow(workflow, 'Loaded from gallery history');
      return;
    }

    window.dispatchEvent(new CustomEvent('commandcenter:load-workflow', { detail: workflow }));
    toast.success('Workflow loaded from gallery');
  }, [onLoadWorkflow]);

  const handleDeleteFromHistory = useCallback(async (image: GalleryImage) => {
    if (!resolvedComfyUrl) {
      toast.error('ComfyUI not connected');
      return;
    }

    const confirmed = window.confirm('Remove from history? The image file stays on disk.');
    if (!confirmed) return;

    const promptId = image.promptId;
    setDeletingPromptIds((prev) => {
      const next = new Set(prev);
      next.add(promptId);
      return next;
    });

    try {
      await deleteHistoryEntries(resolvedComfyUrl, [promptId]);
      setGalleryImages((prev) => prev.filter((entry) => entry.promptId !== promptId));
      setSelectedGalleryImage((prev) => (prev?.promptId === promptId ? null : prev));
      toast.success('Removed from history');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove from history');
    } finally {
      setDeletingPromptIds((prev) => {
        const next = new Set(prev);
        next.delete(promptId);
        return next;
      });
    }
  }, [resolvedComfyUrl]);

  const showConnectionEmptyState = !resolvedComfyUrl;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-content-primary">Gallery</h2>
          <p className="text-xs text-content-secondary">{filteredImages.length} images found</p>
        </div>
        <button
          type="button"
          onClick={() => void loadGalleryImages()}
          disabled={galleryLoading || showConnectionEmptyState}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-200 px-3 py-2 text-sm text-content-secondary hover:text-content-primary hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${galleryLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="rounded-lg border border-border bg-surface-200/60 p-2.5 space-y-2">
        <div className="relative">
          <Search className="h-4 w-4 text-content-faint absolute left-2.5 top-2.5" />
          <input
            value={gallerySearch}
            onChange={(event) => setGallerySearch(event.target.value)}
            placeholder="Search images, prompts, model names..."
            className="w-full rounded-md border border-border bg-surface-200 pl-8 pr-3 py-2 text-sm text-content-primary outline-none focus:border-primary/40"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="inline-flex rounded-md border border-border bg-surface-200 p-0.5">
            <button
              type="button"
              onClick={() => setGalleryViewMode('grid')}
              className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded ${
                galleryViewMode === 'grid'
                  ? 'bg-primary/15 text-primary'
                  : 'text-content-secondary hover:text-content-primary'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Grid
            </button>
            <button
              type="button"
              onClick={() => setGalleryViewMode('list')}
              className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded ${
                galleryViewMode === 'list'
                  ? 'bg-primary/15 text-primary'
                  : 'text-content-secondary hover:text-content-primary'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>

          {galleryLoading && (
            <div className="inline-flex items-center gap-1.5 text-xs text-content-secondary">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading history...
            </div>
          )}
        </div>
      </div>

      {showConnectionEmptyState && (
        <div className="rounded-lg border border-dashed border-border bg-surface-200/40 p-10 text-center text-content-secondary">
          <ImageOff className="mx-auto mb-3 h-8 w-8" />
          <p>Connect to ComfyUI to see your generated images.</p>
          <p className="text-xs text-content-faint mt-1">Go to Settings &gt; ComfyUI Backend.</p>
        </div>
      )}

      {!showConnectionEmptyState && galleryError && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
          {galleryError}
        </div>
      )}

      {!galleryLoading && !galleryError && !showConnectionEmptyState && groupedImages.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-surface-200/40 p-10 text-center text-content-secondary">
          <ImageOff className="mx-auto mb-3 h-8 w-8" />
          <p>No generated images yet.</p>
          <p className="text-xs text-content-faint mt-1">Generate a workflow to see results here.</p>
        </div>
      )}

      {groupedImages.map((group) => (
        <section key={group.label} className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs uppercase tracking-wide text-content-faint">{group.label}</h3>
            <span className="text-[10px] text-content-secondary">{group.images.length}</span>
          </div>

          <div className={galleryViewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5' : 'space-y-2'}>
            {group.images.map((image) => {
              const key = imageKey(image);
              const broken = brokenImages.has(key);
              const promptPreview = image.promptText ? image.promptText.slice(0, 120) : 'No prompt metadata';
              const hasWorkflow = !!extractWorkflow(image);
              const isDeleting = deletingPromptIds.has(image.promptId);

              return (
                <article
                  key={key}
                  className={`group overflow-hidden rounded-md border border-border bg-surface-200 ${galleryViewMode === 'list' ? 'flex items-center gap-3 p-2' : ''}`}
                >
                  <div className={`relative ${galleryViewMode === 'grid' ? 'aspect-square w-full' : 'h-24 w-24 shrink-0 rounded-md overflow-hidden'}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedGalleryImage(image)}
                      className="relative h-full w-full text-left"
                    >
                      {!broken ? (
                        <img
                          src={image.url}
                          alt={image.filename}
                          loading="lazy"
                          className="h-full w-full object-cover"
                          onError={() => setBrokenImages((prev) => new Set(prev).add(key))}
                        />
                      ) : (
                        <div className="h-full w-full bg-surface-300 flex items-center justify-center text-content-secondary">
                          <ImageOff className="h-5 w-5" />
                        </div>
                      )}

                      {image.isCurrentSession && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-primary/20 border border-primary/30 text-primary text-[10px]">
                          Session
                        </span>
                      )}

                      <div className="absolute inset-0 bg-black/0 hover:bg-black/45 transition-colors" />
                      <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                        <p className="text-[10px] text-white line-clamp-2">{promptPreview}</p>
                        <p className="text-[10px] text-white/80 mt-1">{formatCardTimestamp(image.timestamp)}</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteFromHistory(image)}
                      disabled={isDeleting}
                      title="Delete from history"
                      className="absolute right-1.5 top-1.5 z-10 inline-flex items-center justify-center rounded border border-red-500/50 bg-red-500/20 p-1 text-red-300 opacity-0 transition-opacity hover:bg-red-500/30 group-hover:opacity-100 disabled:opacity-40"
                    >
                      {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  </div>

                  <div className={`${galleryViewMode === 'grid' ? 'p-2 space-y-1' : 'min-w-0 flex-1 space-y-1'}`}>
                    <p className="truncate text-[11px] text-content-primary" title={image.filename}>{image.filename}</p>
                    <p className="truncate text-[10px] text-content-secondary">{image.modelName || 'Model unknown'}</p>
                    {galleryViewMode === 'list' && (
                      <p className="text-[10px] text-content-secondary line-clamp-2">{promptPreview}</p>
                    )}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openDownload(image.url, image.filename)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-[10px] text-content-secondary hover:text-content-primary hover:bg-accent transition-colors"
                      >
                        <Download className="h-3 w-3" />
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCopyUrl(image)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-[10px] text-content-secondary hover:text-content-primary hover:bg-accent transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        URL
                      </button>
                      <button
                        type="button"
                        disabled={!hasWorkflow}
                        onClick={() => handleLoadWorkflow(image)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-[10px] text-content-secondary hover:text-content-primary hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Load
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {selectedGalleryImage && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center"
          onClick={() => setSelectedGalleryImage(null)}
        >
          <div
            className="w-full max-w-6xl bg-surface-200 border border-border rounded-lg overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
              <p className="text-sm text-content-primary truncate">{selectedGalleryImage.filename}</p>
              <button
                type="button"
                onClick={() => setSelectedGalleryImage(null)}
                className="text-content-secondary hover:text-content-primary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col lg:flex-row">
              <div className="flex-1 min-h-[320px] bg-black flex items-center justify-center">
                <img
                  src={selectedGalleryImage.url}
                  alt={selectedGalleryImage.filename}
                  className="max-h-[72vh] w-auto object-contain"
                />
              </div>

              <aside className="w-full lg:w-96 border-l border-border p-4 space-y-3">
                {deletingPromptIds.has(selectedGalleryImage.promptId) && (
                  <div className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] text-red-300">
                    Deleting history entry...
                  </div>
                )}
                <div className="text-xs text-content-secondary space-y-1">
                  <p><span className="text-content-faint">Prompt ID:</span> {selectedGalleryImage.promptId}</p>
                  <p><span className="text-content-faint">Timestamp:</span> {formatDetailTimestamp(selectedGalleryImage.timestamp)}</p>
                  <p><span className="text-content-faint">Model:</span> {selectedGalleryImage.modelName || 'Unknown'}</p>
                  <p><span className="text-content-faint">Node count:</span> {selectedGalleryImage.nodeCount || 'Unknown'}</p>
                  <p><span className="text-content-faint">Subfolder:</span> {selectedGalleryImage.subfolder || '(root)'}</p>
                </div>

                <div className="rounded-md border border-border bg-surface-300/60 p-2">
                  <p className="text-[10px] uppercase tracking-wider text-content-faint mb-1">Prompt</p>
                  <p className="text-xs text-content-secondary whitespace-pre-wrap">
                    {selectedGalleryImage.promptText || 'No prompt metadata available.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoadWorkflow(selectedGalleryImage)}
                    disabled={!extractWorkflow(selectedGalleryImage)}
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-border px-2 py-2 text-xs text-content-secondary hover:text-content-primary hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Load Workflow
                  </button>
                  <button
                    type="button"
                    onClick={() => openDownload(selectedGalleryImage.url, selectedGalleryImage.filename)}
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-border px-2 py-2 text-xs text-content-secondary hover:text-content-primary hover:bg-accent transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCopyUrl(selectedGalleryImage)}
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-border px-2 py-2 text-xs text-content-secondary hover:text-content-primary hover:bg-accent transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Copy URL
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteFromHistory(selectedGalleryImage)}
                    disabled={deletingPromptIds.has(selectedGalleryImage.promptId)}
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-red-500/50 bg-red-500/10 px-2 py-2 text-xs text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                  >
                    {deletingPromptIds.has(selectedGalleryImage.promptId) ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Delete from History
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedGalleryImage(flatImages[Math.max(0, selectedImageIndex - 1)] || null)}
                    disabled={selectedImageIndex <= 0}
                    className="rounded-md border border-border px-2 py-1 text-xs text-content-secondary hover:text-content-primary hover:bg-accent transition-colors disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedGalleryImage(flatImages[Math.min(flatImages.length - 1, selectedImageIndex + 1)] || null)}
                    disabled={selectedImageIndex < 0 || selectedImageIndex >= flatImages.length - 1}
                    className="rounded-md border border-border px-2 py-1 text-xs text-content-secondary hover:text-content-primary hover:bg-accent transition-colors disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
