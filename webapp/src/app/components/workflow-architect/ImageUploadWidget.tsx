import { useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { getImagePreviewUrl, uploadImageToComfyUI } from '../../../services/comfyui-image-upload';

interface ImageUploadWidgetProps {
  currentValue: string;
  availableImages: string[];
  comfyuiUrl: string;
  onChange: (filename: string) => void;
  name: string;
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const text = String(value || '').trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

export function ImageUploadWidget({
  currentValue,
  availableImages,
  comfyuiUrl,
  onChange,
  name,
}: ImageUploadWidgetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localImages, setLocalImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const options = useMemo(
    () => unique([...(availableImages || []), ...localImages, currentValue]),
    [availableImages, localImages, currentValue],
  );

  const previewUrl = useMemo(() => {
    if (!currentValue) return '';
    return getImagePreviewUrl(currentValue, comfyuiUrl || '');
  }, [currentValue, comfyuiUrl]);

  const handleUpload = async (file: File) => {
    setError(null);
    setPreviewError(false);
    setIsUploading(true);
    try {
      const result = await uploadImageToComfyUI(file, comfyuiUrl || '', '', true);
      setLocalImages((prev) => unique([...prev, result.name]));
      onChange(result.name);
    } catch (uploadError: any) {
      setError(uploadError?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div
        className={`rounded border p-2 transition-colors ${isDragOver ? 'border-indigo-500/50 bg-accent-muted' : 'border-border-strong bg-surface-inset'}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragOver(false);
          const file = event.dataTransfer.files?.[0];
          if (file && file.type.startsWith('image/')) {
            void handleUpload(file);
          }
        }}
      >
        {currentValue && !previewError ? (
          <img
            src={previewUrl}
            alt={currentValue}
            className="max-h-64 w-full rounded object-contain bg-black/30"
            onError={() => setPreviewError(true)}
          />
        ) : (
          <div className="flex h-32 items-center justify-center rounded border border-dashed border-border-strong text-[10px] text-content-muted">
            {currentValue ? 'Preview unavailable' : 'No image selected'}
          </div>
        )}
      </div>

      <select
        value={currentValue || ''}
        onChange={(event) => {
          setPreviewError(false);
          setError(null);
          onChange(event.target.value);
        }}
        className="w-full rounded border border-border-strong bg-surface-inset px-2 py-1 text-[11px] text-content-primary outline-none focus:border-accent/40"
      >
        {options.length === 0 && <option value="">No input images found</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-1 rounded border border-accent/30 bg-indigo-500/15 px-2.5 py-1.5 text-[10px] text-indigo-200 hover:bg-indigo-500/25 disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
          {isUploading ? 'Uploading...' : 'Upload New Image'}
        </button>
        <span className="text-[10px] text-content-muted">{name}</span>
      </div>

      {error && <p className="text-[10px] text-red-300">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleUpload(file);
          event.currentTarget.value = '';
        }}
      />
    </div>
  );
}
