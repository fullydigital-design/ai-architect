import { useMemo } from 'react';
import { Info, Link2, RotateCcw, X } from 'lucide-react';
import type { ComfyUINode, ComfyUIWorkflow } from '../../../types/comfyui';
import type { ResolvedNodeSchema, WidgetDefinition } from '../../../services/node-schema-resolver';
import { ImageUploadWidget } from './ImageUploadWidget';

interface NodeParameterPanelProps {
  node: ComfyUINode;
  schema: ResolvedNodeSchema | null;
  workflow: ComfyUIWorkflow;
  comfyuiUrl: string;
  installedModels?: {
    checkpoints: string[];
    loras: string[];
    vae: string[];
    controlnet: string[];
    upscale_models: string[];
    embeddings: string[];
  };
  onWidgetValueChange: (nodeId: number, widgetIndex: number, newValue: any) => void;
  onResetDefaults: (nodeId: number) => void;
  onClose: () => void;
}

function getWidgetValue(node: ComfyUINode, widget: WidgetDefinition): any {
  const raw = node.widgets_values?.[widget.widgetIndex];
  return raw !== undefined ? raw : widget.default;
}

function normalizeModelName(value: string): string {
  return value.split('/').pop()?.split('\\').pop() || value;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const text = String(value).trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function getInstalledModelOptions(
  nodeType: string,
  widgetName: string,
  installedModels?: NodeParameterPanelProps['installedModels'],
): string[] {
  if (!installedModels) return [];

  const byName = widgetName.toLowerCase();
  const byNodeType = nodeType.toLowerCase();

  if (byName.includes('ckpt_name') || byName.includes('checkpoint')) {
    return installedModels.checkpoints;
  }
  if (byName.includes('lora_name') || byName === 'lora') {
    return installedModels.loras;
  }
  if (byName.includes('vae_name') || byName === 'vae') {
    return installedModels.vae;
  }
  if (byName.includes('control_net') || byName.includes('controlnet')) {
    return installedModels.controlnet;
  }
  if (byName.includes('embedding')) {
    return installedModels.embeddings;
  }
  if (byName.includes('upscale')) {
    return installedModels.upscale_models;
  }
  if (byName === 'model_name' && /upscale|esrgan|swinir|ultimate/i.test(byNodeType)) {
    return installedModels.upscale_models;
  }
  if (byName === 'model' && /upscale/i.test(byNodeType)) {
    return installedModels.upscale_models;
  }

  return [];
}

function buildComboOptions(
  widget: WidgetDefinition,
  nodeType: string,
  installedModels?: NodeParameterPanelProps['installedModels'],
): string[] {
  const schemaOptions = widget.options ?? [];
  const modelOptions = getInstalledModelOptions(nodeType, widget.name, installedModels);

  if (!modelOptions.length) {
    return schemaOptions;
  }

  const merged = uniqueStrings([
    ...modelOptions.map(normalizeModelName),
    ...schemaOptions.map(String),
  ]);
  return merged;
}

function isImageUploadWidget(widget: WidgetDefinition, nodeType: string, schema: ResolvedNodeSchema | null): boolean {
  const imageLoaderTypes = ['LoadImage', 'LoadImageMask', 'LoadImageFromUrl'];
  if (imageLoaderTypes.includes(nodeType) && widget.name === 'image') {
    return true;
  }
  if (
    widget.type === 'COMBO'
    && widget.name === 'image'
    && !!schema?.outputs?.some((output) => output.type === 'IMAGE')
  ) {
    return true;
  }
  return false;
}

function coerceWidgetValue(value: string | number | boolean, widget: WidgetDefinition): any {
  if (widget.type === 'INT') {
    const parsed = typeof value === 'number' ? Math.trunc(value) : Number.parseInt(String(value), 10);
    return Number.isNaN(parsed) ? widget.default ?? 0 : parsed;
  }
  if (widget.type === 'FLOAT') {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value));
    return Number.isNaN(parsed) ? widget.default ?? 0 : parsed;
  }
  if (widget.type === 'BOOLEAN') {
    if (typeof value === 'boolean') return value;
    return String(value).toLowerCase() === 'true';
  }
  return value;
}

export function NodeParameterPanel({
  node,
  schema,
  workflow,
  comfyuiUrl,
  installedModels,
  onWidgetValueChange,
  onResetDefaults,
  onClose,
}: NodeParameterPanelProps) {
  const nodeLabel = schema?.displayName || node.title || node.type;

  const linkInputRows = useMemo(() => {
    if (!schema) return [];
    const inputSlotByName = new Map<string, number>();
    node.inputs?.forEach((input, slot) => {
      if (input?.name) inputSlotByName.set(input.name, slot);
    });
    const nodeById = new Map(workflow.nodes.map((item) => [item.id, item]));

    return schema.linkInputs.map((input, fallbackSlot) => {
      const targetSlot = inputSlotByName.get(input.name) ?? fallbackSlot;
      const link = workflow.links.find((entry) => entry[3] === node.id && entry[4] === targetSlot);
      if (!link) {
        return { name: input.name, type: input.type, source: null };
      }
      const sourceNode = nodeById.get(link[1]);
      return {
        name: input.name,
        type: input.type,
        source: sourceNode
          ? `${sourceNode.title || sourceNode.type} #${sourceNode.id}`
          : `Node #${link[1]}`,
      };
    });
  }, [node, schema, workflow]);

  const outputRows = useMemo(() => {
    if (!schema) return [];
    const nodeById = new Map(workflow.nodes.map((item) => [item.id, item]));
    return schema.outputs.map((output, slotIndex) => {
      const outgoing = workflow.links
        .filter((entry) => entry[1] === node.id && entry[2] === slotIndex)
        .map((entry) => {
          const targetNode = nodeById.get(entry[3]);
          return targetNode ? `${targetNode.title || targetNode.type} #${targetNode.id}` : `Node #${entry[3]}`;
        });
      return {
        name: output.name,
        type: output.type,
        targets: outgoing,
      };
    });
  }, [node, schema, workflow]);

  if (!schema) {
    return (
      <aside className="h-full w-[340px] shrink-0 border-l border-border-default bg-surface-elevated">
        <div className="flex items-center justify-between border-b border-border-default px-3 py-2.5">
          <div>
            <h3 className="text-xs text-content-primary">{nodeLabel} (#{node.id})</h3>
            <p className="text-[10px] text-content-muted">{node.type}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-content-muted hover:bg-surface-elevated hover:text-content-primary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-3 text-[11px] text-content-muted">No schema available for this node type.</div>
      </aside>
    );
  }

  return (
    <aside className="h-full w-[340px] shrink-0 border-l border-border-default bg-surface-elevated">
      <div className="flex items-center justify-between border-b border-border-default px-3 py-2.5">
        <div className="min-w-0">
          <h3 className="truncate text-xs text-content-primary">{nodeLabel} (#{node.id})</h3>
          <p className="truncate text-[10px] text-content-muted">{schema.nodeType} . {schema.category}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-content-muted transition-colors hover:bg-surface-elevated hover:text-content-primary"
          title="Close inspector"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="h-[calc(100%-45px)] overflow-y-auto px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] text-content-primary">Parameters</span>
          <button
            onClick={() => onResetDefaults(node.id)}
            className="inline-flex items-center gap-1 rounded border border-border-strong px-2 py-1 text-[10px] text-content-primary hover:bg-surface-elevated/70"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to Defaults
          </button>
        </div>

        <div className="space-y-2">
          {schema.widgets.map((widget) => {
            const effectiveWidget: WidgetDefinition = (schema.nodeType === 'Note' && widget.name === 'text')
              ? { ...widget, multiline: true }
              : widget;
            const value = getWidgetValue(node, effectiveWidget);
            const comboOptions = effectiveWidget.type === 'COMBO'
              ? buildComboOptions(effectiveWidget, schema.nodeType, installedModels)
              : uniqueStrings(getInstalledModelOptions(schema.nodeType, effectiveWidget.name, installedModels).map(normalizeModelName));
            const boundedRange = effectiveWidget.type === 'FLOAT'
              && typeof effectiveWidget.min === 'number'
              && typeof effectiveWidget.max === 'number';
            const shouldRenderDropdown = effectiveWidget.type === 'COMBO'
              || (effectiveWidget.type === 'STRING' && !effectiveWidget.multiline && comboOptions.length > 0);

            return (
              <div key={`${widget.name}-${widget.widgetIndex}`} className="rounded border border-border-default bg-surface-secondary p-2">
                <label className="mb-1 block text-[10px] text-content-secondary">
                  {effectiveWidget.name}
                  {effectiveWidget.tooltip ? (
                    <span className="ml-1 inline-flex items-center text-content-muted" title={effectiveWidget.tooltip}>
                      <Info className="h-3 w-3" />
                    </span>
                  ) : null}
                </label>

                {shouldRenderDropdown && (
                  effectiveWidget.type === 'COMBO' && isImageUploadWidget(effectiveWidget, schema.nodeType, schema) ? (
                    <ImageUploadWidget
                      currentValue={String(value ?? '')}
                      availableImages={comboOptions}
                      comfyuiUrl={comfyuiUrl}
                      onChange={(filename) => onWidgetValueChange(node.id, effectiveWidget.widgetIndex, filename)}
                      name={effectiveWidget.name}
                    />
                  ) : (
                    <select
                      value={String(value ?? '')}
                      onChange={(event) => onWidgetValueChange(node.id, effectiveWidget.widgetIndex, event.target.value)}
                      className="w-full rounded border border-border-strong bg-surface-inset px-2 py-1 text-[11px] text-content-primary outline-none focus:border-accent/40"
                    >
                      {uniqueStrings([String(value ?? ''), ...comboOptions]).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )
                )}

                {(effectiveWidget.type === 'INT' || effectiveWidget.type === 'FLOAT') && (
                  <div className="space-y-1">
                    {boundedRange && effectiveWidget.type === 'FLOAT' && (
                      <input
                        type="range"
                        min={effectiveWidget.min}
                        max={effectiveWidget.max}
                        step={effectiveWidget.step ?? 0.01}
                        value={Number(value ?? effectiveWidget.default ?? effectiveWidget.min ?? 0)}
                        onChange={(event) => onWidgetValueChange(node.id, effectiveWidget.widgetIndex, coerceWidgetValue(event.target.value, effectiveWidget))}
                        className="w-full"
                      />
                    )}
                    <input
                      type="number"
                      min={effectiveWidget.min}
                      max={effectiveWidget.max}
                      step={effectiveWidget.step ?? (effectiveWidget.type === 'INT' ? 1 : 0.01)}
                      value={Number(value ?? effectiveWidget.default ?? 0)}
                      onChange={(event) => onWidgetValueChange(node.id, effectiveWidget.widgetIndex, coerceWidgetValue(event.target.value, effectiveWidget))}
                      className="w-full rounded border border-border-strong bg-surface-inset px-2 py-1 text-[11px] text-content-primary outline-none focus:border-accent/40"
                    />
                  </div>
                )}

                {effectiveWidget.type === 'STRING' && !shouldRenderDropdown && (
                  effectiveWidget.multiline ? (
                    <textarea
                      value={String(value ?? '')}
                      onChange={(event) => onWidgetValueChange(node.id, effectiveWidget.widgetIndex, event.target.value)}
                      rows={4}
                      placeholder={effectiveWidget.placeholder}
                      className="w-full resize-y rounded border border-border-strong bg-surface-inset px-2 py-1 text-[11px] text-content-primary outline-none focus:border-accent/40"
                    />
                  ) : (
                    <input
                      type="text"
                      value={String(value ?? '')}
                      onChange={(event) => onWidgetValueChange(node.id, effectiveWidget.widgetIndex, event.target.value)}
                      placeholder={effectiveWidget.placeholder}
                      className="w-full rounded border border-border-strong bg-surface-inset px-2 py-1 text-[11px] text-content-primary outline-none focus:border-accent/40"
                    />
                  )
                )}

                {effectiveWidget.type === 'BOOLEAN' && (
                  <label className="inline-flex items-center gap-2 text-[11px] text-content-primary">
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(event) => onWidgetValueChange(node.id, effectiveWidget.widgetIndex, event.target.checked)}
                    />
                    {Boolean(value) ? 'Enabled' : 'Disabled'}
                  </label>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 rounded border border-border-default bg-surface-secondary p-2">
          <div className="mb-1 inline-flex items-center gap-1 text-[11px] text-content-primary">
            <Link2 className="h-3.5 w-3.5" />
            Link Inputs (read-only)
          </div>
          <div className="space-y-1">
            {linkInputRows.length === 0 ? (
              <p className="text-[10px] text-content-muted">No link inputs.</p>
            ) : linkInputRows.map((row) => (
              <div key={row.name} className="text-[10px] text-content-secondary">
                <span className="text-content-primary">{row.name}</span> ({row.type}){' '}
                <span className="text-content-muted">{row.source ? `← ${row.source}` : '← unconnected'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 rounded border border-border-default bg-surface-secondary p-2">
          <div className="mb-1 text-[11px] text-content-primary">Outputs</div>
          <div className="space-y-1">
            {outputRows.length === 0 ? (
              <p className="text-[10px] text-content-muted">No outputs.</p>
            ) : outputRows.map((row) => (
              <div key={`${row.name}-${row.type}`} className="text-[10px] text-content-secondary">
                <span className="text-content-primary">{row.name}</span> ({row.type}){' '}
                <span className="text-content-muted">
                  {row.targets.length > 0 ? `→ ${row.targets.join(', ')}` : '→ no consumers'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
