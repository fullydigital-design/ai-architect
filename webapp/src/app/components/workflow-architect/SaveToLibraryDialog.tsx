import { useEffect, useMemo, useState } from 'react';
import { Box, Puzzle, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import type {
  ComfyUIWorkflow,
  FragmentType,
  WorkflowCategory,
} from '../../../types/comfyui';
import {
  detectFragmentType,
  detectCategory,
  extractSubgraph,
  extractModelsUsed,
  extractNodeClassTypes,
  saveWorkflowToLibrary,
} from '../../../services/workflow-library';

interface SaveToLibraryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: ComfyUIWorkflow;
  defaultName?: string;
  onSaved?: (id: string) => void;
  selectedNodeIds?: Set<number>;
}

const CATEGORIES: Array<{ value: WorkflowCategory; label: string }> = [
  { value: 'txt2img', label: 'Text to Image' },
  { value: 'img2img', label: 'Image to Image' },
  { value: 'upscale', label: 'Upscale' },
  { value: 'controlnet', label: 'ControlNet' },
  { value: 'inpaint', label: 'Inpaint' },
  { value: 'video', label: 'Video' },
  { value: 'ipadapter', label: 'IP-Adapter' },
  { value: 'lora', label: 'LoRA' },
  { value: 'face-detailer', label: 'Face Detailer' },
  { value: 'custom', label: 'Custom' },
];

export function SaveToLibraryDialog({
  isOpen,
  onClose,
  workflow,
  defaultName = '',
  onSaved,
  selectedNodeIds,
}: SaveToLibraryDialogProps) {
  const fragmentSelectionCount = selectedNodeIds?.size || 0;
  const workflowToSave = useMemo(() => {
    if (selectedNodeIds && selectedNodeIds.size > 0) {
      return extractSubgraph(workflow, selectedNodeIds);
    }
    return workflow;
  }, [workflow, selectedNodeIds]);
  const autoDetectedFragmentType = useMemo(
    () => (fragmentSelectionCount > 0 ? detectFragmentType(workflowToSave) : 'custom'),
    [fragmentSelectionCount, workflowToSave],
  );

  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [category, setCategory] = useState<WorkflowCategory>(() => detectCategory(workflowToSave));
  const [isFragment, setIsFragment] = useState(fragmentSelectionCount > 0);
  const [fragmentType, setFragmentType] = useState<FragmentType>(autoDetectedFragmentType);

  useEffect(() => {
    if (!isOpen) return;
    setName(defaultName);
    setDescription('');
    setTagsInput('');
    setCategory(detectCategory(workflowToSave));
    if (fragmentSelectionCount > 0) {
      setIsFragment(true);
      setFragmentType(detectFragmentType(workflowToSave));
    } else {
      setIsFragment(false);
      setFragmentType('custom');
    }
  }, [isOpen, defaultName, workflowToSave, fragmentSelectionCount]);

  const nodeClassTypes = useMemo(() => extractNodeClassTypes(workflowToSave), [workflowToSave]);
  const modelsUsed = useMemo(() => extractModelsUsed(workflowToSave), [workflowToSave]);
  const effectiveFragment = fragmentSelectionCount > 0 ? true : isFragment;

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);

    try {
      const template = saveWorkflowToLibrary(workflowToSave, name.trim(), description.trim(), {
        tags,
        category,
        isFragment: effectiveFragment,
        fragmentType: effectiveFragment ? fragmentType : undefined,
      });
      toast.success(`Saved "${template.name}" ${effectiveFragment ? 'fragment' : 'workflow'} to library`);
      onSaved?.(template.id);
      onClose();
    } catch (error) {
      console.error('[SaveToLibrary] Error:', error);
      toast.error('Failed to save workflow');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface-elevated border border-border-default rounded-lg shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
          <div className="flex items-center gap-2">
            <Save className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-content-primary">Save to Library</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-content-faint hover:text-content-secondary hover:bg-surface-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">
          {fragmentSelectionCount > 0 && (
            <div className="flex items-start gap-2 p-2 rounded-md bg-state-warning-muted border border-state-warning/20">
              <Puzzle className="w-3.5 h-3.5 text-state-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-state-warning font-medium">Saving as Fragment</p>
                <p className="text-[9px] text-state-warning/80">
                  {fragmentSelectionCount} selected nodes will be saved as a reusable building block.
                  External connections are kept as open inputs/outputs.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] text-content-faint mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. FLUX Dev + 2-Pass Upscale"
              className="w-full px-3 py-1.5 text-xs bg-surface-inset border border-border-default rounded-md focus:outline-none focus:ring-1 focus:ring-accent/40 text-content-primary"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] text-content-faint mb-1">Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What this workflow does and why you saved it"
              rows={2}
              className="w-full px-3 py-1.5 text-xs bg-surface-inset border border-border-default rounded-md focus:outline-none focus:ring-1 focus:ring-accent/40 text-content-primary resize-none"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[10px] text-content-faint mb-1">Category</label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as WorkflowCategory)}
                className="w-full px-2 py-1.5 text-xs bg-surface-inset border border-border-default rounded-md focus:outline-none focus:ring-1 focus:ring-accent/40 text-content-primary"
              >
                {CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col items-center justify-end">
              <label className="block text-[10px] text-content-faint mb-1">Type</label>
              <button
                type="button"
                disabled={fragmentSelectionCount > 0}
                onClick={() => setIsFragment((prev) => !prev)}
                className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded-md border transition-colors ${
                  effectiveFragment
                    ? 'bg-state-warning-muted border-state-warning/40 text-state-warning'
                    : 'bg-state-info-muted border-state-info/40 text-state-info'
                } ${fragmentSelectionCount > 0 ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {effectiveFragment ? <Puzzle className="w-3 h-3" /> : <Box className="w-3 h-3" />}
                {effectiveFragment ? 'Fragment' : 'Full'}
              </button>
            </div>
          </div>

          {effectiveFragment && (
            <div>
              <label className="block text-[10px] text-content-faint mb-1">Fragment Type</label>
              <select
                value={fragmentType}
                onChange={(event) => setFragmentType(event.target.value as FragmentType)}
                className="w-full px-2 py-1.5 text-xs bg-surface-inset border border-border-default rounded-md focus:outline-none focus:ring-1 focus:ring-accent/40 text-content-primary"
              >
                <option value="generation">Generation</option>
                <option value="conditioning">Conditioning</option>
                <option value="upscaling">Upscaling</option>
                <option value="postprocess">Post-process</option>
                <option value="input">Input</option>
                <option value="output">Output</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] text-content-faint mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder="flux, upscale, 2-pass"
              className="w-full px-3 py-1.5 text-xs bg-surface-inset border border-border-default rounded-md focus:outline-none focus:ring-1 focus:ring-accent/40 text-content-primary"
            />
          </div>

          <div className="p-2 rounded-md bg-surface-secondary border border-border-default">
            <p className="text-[10px] text-content-faint mb-1.5">Auto-detected from workflow</p>
            <div className="flex flex-wrap gap-1.5 mb-1.5 text-[9px] text-content-secondary">
              <span>{workflowToSave.nodes.length} nodes</span>
              <span className="text-content-faint">|</span>
              <span>{nodeClassTypes.length} types</span>
              <span className="text-content-faint">|</span>
              <span>{modelsUsed.length} models</span>
            </div>
            {modelsUsed.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {modelsUsed.slice(0, 4).map((model) => (
                  <span
                    key={model}
                    className="px-1 text-[8px] rounded bg-state-warning-muted text-state-warning/80 font-mono truncate max-w-[150px]"
                  >
                    {model}
                  </span>
                ))}
                {modelsUsed.length > 4 && (
                  <span className="text-[8px] text-content-faint">+{modelsUsed.length - 4}</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-default">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-content-faint hover:text-content-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-1.5 text-xs rounded-md bg-accent hover:bg-accent-hover text-accent-contrast disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Save to Library
          </button>
        </div>
      </div>
    </div>
  );
}
