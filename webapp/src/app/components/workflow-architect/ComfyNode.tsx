import { memo, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useTheme } from '../../../hooks/useTheme';

const BASE_NODE_WIDTH = 320;
const BASE_NODE_HEIGHT = 128;
const HEADER_HEIGHT = 24;
const SUMMARY_HEIGHT = 20;
const FOOTER_HEIGHT = 20;
const ROW_HEIGHT = 16;
const SECTION_LABEL_HEIGHT = 14;
const MAX_BODY_HEIGHT = 500;

const categoryColorsDark: Record<string, { accent: string; headerBg: string; bodyBg: string; border: string }> = {
  loaders:                  { accent: '#B89A74', headerBg: '#161412', bodyBg: '#121212', border: '#1E1E1E' },
  conditioning:             { accent: '#6AAF6A', headerBg: '#121612', bodyBg: '#121212', border: '#1E1E1E' },
  sampling:                 { accent: '#8080CC', headerBg: '#141418', bodyBg: '#121212', border: '#1E1E1E' },
  latent:                   { accent: '#5A9AAA', headerBg: '#121416', bodyBg: '#121212', border: '#1E1E1E' },
  image:                    { accent: '#A06AAA', headerBg: '#161218', bodyBg: '#121212', border: '#1E1E1E' },
  vae:                      { accent: '#AAA05A', headerBg: '#141412', bodyBg: '#121212', border: '#1E1E1E' },
  mask:                     { accent: '#5AAA6A', headerBg: '#121612', bodyBg: '#121212', border: '#1E1E1E' },
  model_patches:            { accent: '#AA6A5A', headerBg: '#161212', bodyBg: '#121212', border: '#1E1E1E' },
  utility:                  { accent: '#777777', headerBg: '#141414', bodyBg: '#121212', border: '#1E1E1E' },
  ipadapter:                { accent: '#5A99AA', headerBg: '#121416', bodyBg: '#121212', border: '#1E1E1E' },
  controlnet_preprocessors: { accent: '#8A6A99', headerBg: '#141218', bodyBg: '#121212', border: '#1E1E1E' },
  impact:                   { accent: '#BB5A5A', headerBg: '#161212', bodyBg: '#121212', border: '#1E1E1E' },
  animatediff:              { accent: '#6A6A99', headerBg: '#121218', bodyBg: '#121212', border: '#1E1E1E' },
};

const categoryColorsLight: Record<string, { accent: string; headerBg: string; bodyBg: string; border: string }> = {
  loaders:                  { accent: '#b8864a', headerBg: '#faf4eb', bodyBg: '#ffffff', border: '#e8ddd0' },
  conditioning:             { accent: '#3d9a3c', headerBg: '#edf8ed', bodyBg: '#ffffff', border: '#cce5cc' },
  sampling:                 { accent: '#6060c0', headerBg: '#ededfc', bodyBg: '#ffffff', border: '#cdcde8' },
  latent:                   { accent: '#3a8fa0', headerBg: '#eaf5f8', bodyBg: '#ffffff', border: '#c4dde6' },
  image:                    { accent: '#a040aa', headerBg: '#f5ecf7', bodyBg: '#ffffff', border: '#dccce5' },
  vae:                      { accent: '#a09030', headerBg: '#f7f4ea', bodyBg: '#ffffff', border: '#e2dcc2' },
  mask:                     { accent: '#3aa04a', headerBg: '#ecf7ee', bodyBg: '#ffffff', border: '#c4e5cc' },
  model_patches:            { accent: '#b05040', headerBg: '#f7ebe9', bodyBg: '#ffffff', border: '#e5c4c0' },
  utility:                  { accent: '#777777', headerBg: '#f3f3f3', bodyBg: '#ffffff', border: '#e0e0e0' },
  ipadapter:                { accent: '#3a90a0', headerBg: '#eaf4f7', bodyBg: '#ffffff', border: '#c4dce5' },
  controlnet_preprocessors: { accent: '#8a50a0', headerBg: '#f2ecf7', bodyBg: '#ffffff', border: '#d8cce5' },
  impact:                   { accent: '#c04545', headerBg: '#f7eaea', bodyBg: '#ffffff', border: '#e5c0c0' },
  animatediff:              { accent: '#5858a0', headerBg: '#ececf7', bodyBg: '#ffffff', border: '#ccccdd' },
};

const typeColors: Record<string, string> = {
  MODEL: '#9A8ABB',
  CLIP: '#CCAA44',
  VAE: '#BB5555',
  CONDITIONING: '#CC8833',
  LATENT: '#CC6688',
  IMAGE: '#5599CC',
  MASK: '#66AA77',
  CONTROL_NET: '#44AAAA',
  UPSCALE_MODEL: '#8A7766',
  CLIP_VISION: '#AA77BB',
  STYLE_MODEL: '#CC7799',
  IPADAPTER: '#66AA99',
  STRING: '#5599AA',
  INT: '#5599AA',
  FLOAT: '#5599AA',
  BOOLEAN: '#5599AA',
  '*': '#666666',
};

type NodeRole = 'error' | 'prompt' | 'loader' | 'image' | 'default';

const PROMPT_NODE_TYPES = new Set([
  'CLIPTextEncode',
  'CLIPTextEncodeSDXL',
  'CLIPTextEncodeFlux',
  'ConditioningCombine',
  'ConditioningConcat',
  'ConditioningAverage',
  'ConditioningSetArea',
  'ConditioningSetTimestepRange',
  'CLIPSetLastLayer',
  'SwarmInputText',
]);

const LOADER_NODE_TYPES = new Set([
  'CheckpointLoaderSimple',
  'CheckpointLoader',
  'UNETLoader',
  'DualCLIPLoader',
  'CLIPLoader',
  'VAELoader',
  'LoraLoader',
  'LoraLoaderModelOnly',
  'LoraLoaderBlockWeight',
  'ControlNetLoader',
  'ControlNetLoaderAdvanced',
  'UpscaleModelLoader',
  'CLIPVisionLoader',
  'IPAdapterModelLoader',
  'InstantIDModelLoader',
  'StyleModelLoader',
  'GLIGENLoader',
  'PhotoMakerLoader',
  'SwarmLoraLoader',
]);

const IMAGE_NODE_TYPES = new Set([
  'SaveImage',
  'PreviewImage',
  'LoadImage',
  'LoadImageMask',
  'ImageUpscaleWithModel',
  'ImageScale',
  'ImageScaleBy',
  'ImageInvert',
  'ImageBatch',
  'ImageConcanate',
  'ImageBlend',
  'ImageComposite',
  'ImageCrop',
  'SwarmRemBg',
  'SwarmImageCrop',
  'SwarmImageWidth',
]);

const roleOutlines: Record<NodeRole, { border: string; glow: string } | null> = {
  error: { border: '#ef4444', glow: 'rgba(239, 68, 68, 0.20)' },
  prompt: { border: '#22c55e', glow: 'rgba(34, 197, 94, 0.20)' },
  loader: { border: '#f59e0b', glow: 'rgba(245, 158, 11, 0.20)' },
  image: { border: '#3b82f6', glow: 'rgba(59, 130, 246, 0.20)' },
  default: null,
};

interface ComfyNodeData {
  nodeId: number;
  label: string;
  nodeType: string;
  inputs: Array<{ name: string; type: string }>;
  outputs: Array<{ name: string; type: string; slotIndex: number }>;
  widgetValues?: any[];
  widgetNames?: string[];
  imagePreviewUrl?: string;
  imagePreviewLabel?: string;
  isCustom: boolean;
  isSubgraph?: boolean;
  isAutoDocNote?: boolean;
  isError?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (nodeId: string) => void;
}

function socketY(index: number, total: number, nodeHeight: number): number {
  if (total <= 1) return Math.round(nodeHeight / 2);
  const start = HEADER_HEIGHT + SUMMARY_HEIGHT + 16;
  const end = nodeHeight - FOOTER_HEIGHT - 8;
  const step = (end - start) / Math.max(total - 1, 1);
  return Math.round(start + (step * index));
}

function isModelFile(val: unknown): boolean {
  return typeof val === 'string' && /\.(safetensors|ckpt|pth|pt|bin|onnx|gguf)$/i.test(val);
}

function formatWidgetValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const formatted = value.map((item) => formatWidgetValue(item)).filter(Boolean).join(', ');
    return formatted.length > 80 ? `${formatted.slice(0, 77)}...` : formatted;
  }
  if (typeof value === 'object') {
    try {
      const formatted = JSON.stringify(value);
      return formatted.length > 80 ? `${formatted.slice(0, 77)}...` : formatted;
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function getCategoryColors(
  classType: string,
  colorMap: Record<string, { accent: string; headerBg: string; bodyBg: string; border: string }>,
): { accent: string; headerBg: string; bodyBg: string; border: string } {
  const t = classType.toLowerCase();
  if (t.includes('loader') || t.includes('load')) return colorMap.loaders;
  if (t.includes('conditioning') || t.includes('clip') || t.includes('prompt') || t.includes('encode')) return colorMap.conditioning;
  if (t.includes('sampler') || t.includes('ksampler')) return colorMap.sampling;
  if (t.includes('latent')) return colorMap.latent;
  if (t.includes('image') || t.includes('save') || t.includes('preview')) return colorMap.image;
  if (t.includes('vae') || t.includes('decode')) return colorMap.vae;
  if (t.includes('mask')) return colorMap.mask;
  if (t.includes('patch') || t.includes('lora')) return colorMap.model_patches;
  if (t.includes('ipadapter')) return colorMap.ipadapter;
  if (t.includes('controlnet') || t.includes('preprocessor')) return colorMap.controlnet_preprocessors;
  if (t.includes('impact')) return colorMap.impact;
  if (t.includes('animatediff')) return colorMap.animatediff;
  return colorMap.utility;
}

function getTypeColor(type?: string): string {
  if (!type) return typeColors['*'];
  return typeColors[type.toUpperCase()] || typeColors['*'];
}

function getNodeRole(nodeType: string, isError?: boolean): NodeRole {
  if (isError) return 'error';
  const type = nodeType || '';
  const lower = type.toLowerCase();

  if (
    PROMPT_NODE_TYPES.has(type)
    || lower.includes('conditioning')
    || lower.includes('cliptextencode')
    || lower.includes('prompt')
    || lower.includes('textencode')
  ) {
    return 'prompt';
  }

  if (
    LOADER_NODE_TYPES.has(type)
    || lower.includes('loader')
    || lower.includes('checkpoint')
    || lower.includes('lora')
    || lower.includes('unet')
  ) {
    return 'loader';
  }

  if (
    IMAGE_NODE_TYPES.has(type)
    || lower.includes('image')
    || lower.includes('preview')
    || lower.includes('saveimage')
  ) {
    return 'image';
  }

  return 'default';
}

interface NodeThemeColors {
  sectionLabel: string;
  inputName: string;
  outputName: string;
  widgetLabel: string;
  widgetValue: string;
  widgetBg: string;
  widgetBorder: string;
  widgetArrow: string;
  handleBorder: string;
  titleText: string;
  footerText: string;
  footerBadge: string;
  parametersBg: string;
  footerBg: string;
  multilineLabel: string;
  multilineText: string;
  multilineBg: string;
  boolOff: string;
  boolOffBorder: string;
  boolOffDot: string;
  overflowText: string;
  shadow: string;
  errorShadow: string;
}

function getNodeTheme(isDark: boolean): NodeThemeColors {
  if (isDark) {
    return {
      sectionLabel: '#555',
      inputName: '#c8c8c8',
      outputName: '#c8c8c8',
      widgetLabel: '#888',
      widgetValue: '#ccc',
      widgetBg: '#111',
      widgetBorder: '#2a2a2a',
      widgetArrow: '#555',
      handleBorder: '#151515',
      titleText: '#ddd',
      footerText: '#444',
      footerBadge: '#3a3a3a',
      parametersBg: 'rgba(0,0,0,0.08)',
      footerBg: 'rgba(0,0,0,0.15)',
      multilineLabel: '#666',
      multilineText: '#888',
      multilineBg: '#0e0e0e',
      boolOff: '#333',
      boolOffBorder: '#444',
      boolOffDot: '#666',
      overflowText: '#444',
      shadow: '0 2px 16px rgba(0,0,0,0.55)',
      errorShadow: '0 0 20px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.15), inset 0 0 0 1px rgba(239, 68, 68, 0.3)',
    };
  }
  return {
    sectionLabel: '#999',
    inputName: '#333',
    outputName: '#333',
    widgetLabel: '#666',
    widgetValue: '#333',
    widgetBg: '#f5f5f5',
    widgetBorder: '#e0e0e0',
    widgetArrow: '#bbb',
    handleBorder: '#ffffff',
    titleText: '#333',
    footerText: '#999',
    footerBadge: '#bbb',
    parametersBg: 'rgba(0,0,0,0.02)',
    footerBg: 'rgba(0,0,0,0.03)',
    multilineLabel: '#888',
    multilineText: '#555',
    multilineBg: '#f8f8f8',
    boolOff: '#ddd',
    boolOffBorder: '#ccc',
    boolOffDot: '#aaa',
    overflowText: '#bbb',
    shadow: '0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
    errorShadow: '0 0 20px rgba(239, 68, 68, 0.25), 0 0 40px rgba(239, 68, 68, 0.08), inset 0 0 0 1px rgba(239, 68, 68, 0.25)',
  };
}

function ComfyNodeComponent({ data, selected }: NodeProps<ComfyNodeData>) {
  const { isDark } = useTheme();
  const colorMap = isDark ? categoryColorsDark : categoryColorsLight;
  const colors = getCategoryColors(data.nodeType, colorMap);
  const theme = getNodeTheme(isDark);
  const isNodeSelected = Boolean(data.isSelected ?? selected);
  const role = getNodeRole(data.nodeType, data.isError);
  const roleOutline = roleOutlines[role];
  const roleAccent = roleOutline?.border || colors.accent;
  const inputCount = Math.max(data.inputs.length, 1);
  const outputCount = Math.max(data.outputs.length, 1);
  const [previewFailed, setPreviewFailed] = useState(false);

  const widgetValues = Array.isArray(data.widgetValues) ? data.widgetValues : [];
  const widgetNames = Array.isArray(data.widgetNames) ? data.widgetNames : [];
  const maxWidgets = data.isSubgraph ? 24 : 16;
  const widgetRows = widgetValues
    .map((val, idx) => ({
      name: widgetNames[idx] || `param_${idx}`,
      val,
      formatted: formatWidgetValue(val),
      isModel: isModelFile(val),
    }))
    .filter((row) => row.formatted !== '');
  const visibleWidgets = widgetRows.slice(0, maxWidgets);
  const hiddenWidgetCount = Math.max(0, widgetRows.length - visibleWidgets.length);
  const showLoadImagePlaceholder = data.nodeType === 'LoadImage' && !data.imagePreviewUrl;

  useEffect(() => {
    setPreviewFailed(false);
  }, [data.imagePreviewUrl]);

  const keyInputs = visibleWidgets
    .slice(0, 2)
    .map((row) => row.name)
    .join(', ');

  const nodeWidth = data.isSubgraph ? 420 : BASE_NODE_WIDTH;
  const hasInputs = data.inputs.length > 0;
  const hasWidgets = visibleWidgets.length > 0 || hiddenWidgetCount > 0;
  const hasOutputs = data.outputs.length > 0;

  const inputSectionHeight = hasInputs ? SECTION_LABEL_HEIGHT + data.inputs.length * ROW_HEIGHT + 8 : 0;
  const widgetSectionHeight = hasWidgets
    ? SECTION_LABEL_HEIGHT + visibleWidgets.length * ROW_HEIGHT + (hiddenWidgetCount > 0 ? ROW_HEIGHT : 0) + 8
    : 0;
  const outputSectionHeight = hasOutputs ? SECTION_LABEL_HEIGHT + data.outputs.length * ROW_HEIGHT + 8 : 0;
  const previewSectionHeight = (data.imagePreviewUrl || showLoadImagePlaceholder) ? 112 : 0;

  const bodyContentHeight = inputSectionHeight + widgetSectionHeight + outputSectionHeight + previewSectionHeight + 8;
  const bodyHeight = Math.min(MAX_BODY_HEIGHT, Math.max(24, bodyContentHeight));

  const nodeHeight = Math.max(
    BASE_NODE_HEIGHT,
    HEADER_HEIGHT + SUMMARY_HEIGHT + bodyHeight + FOOTER_HEIGHT + 8,
  );

  const sectionLabelStyle = {
    fontSize: 9,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: theme.sectionLabel,
    marginBottom: 2,
    fontFamily: 'Inter, system-ui, sans-serif',
  } as const;

  const baseNodeShadow = `${theme.shadow}, inset 0 1px 0 ${colors.border}`;

  return (
    <div
      style={{
        width: nodeWidth,
        height: nodeHeight,
        borderRadius: '8px',
        border: `${roleOutline ? '1.5px' : '1px'} solid ${
          roleOutline
            ? roleOutline.border
            : isNodeSelected
              ? '#7C6AEF'
              : data.isAutoDocNote
                ? '#14b8a6'
                : colors.border
        }`,
        borderLeft: `3px solid ${roleAccent}`,
        background: colors.bodyBg,
        overflow: 'hidden',
        position: 'relative',
        cursor: 'default',
        opacity: 0.95,
        boxShadow: roleOutline
          ? data.isError
            ? theme.errorShadow
            : `${baseNodeShadow}, 0 0 8px ${roleOutline.glow}`
          : isNodeSelected
            ? `0 0 0 1px rgba(124, 106, 239, 0.35), ${baseNodeShadow}`
            : data.isAutoDocNote
              ? `0 0 0 1px rgba(20, 184, 166, 0.25), ${baseNodeShadow}`
              : baseNodeShadow,
      }}
    >
      <div
        style={{
          height: HEADER_HEIGHT,
          background: colors.headerBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '0 10px',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '2px',
            background: roleAccent,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: theme.titleText,
            fontFamily: 'Inter, system-ui, sans-serif',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
            flex: 1,
          }}
          title={data.nodeType}
        >
          {data.label || data.nodeType}
        </span>
        <span
          style={{
            fontSize: '10px',
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#FFFFFF',
            background: 'rgba(124, 106, 239, 0.5)',
            padding: '1px 6px',
            borderRadius: '3px',
            border: '1px solid rgba(124, 106, 239, 0.4)',
            flexShrink: 0,
            letterSpacing: '0.02em',
            fontWeight: 600,
          }}
          title={`Node ID: ${data.nodeId}`}
        >
          #{data.nodeId}
        </span>

        {data.isSubgraph && (
          <span
            style={{
              fontSize: 8,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '1px 5px',
              borderRadius: 1,
              background: '#4a90d922',
              color: '#7ab2ec',
              border: '1px solid #4a90d944',
              fontFamily: 'Inter, system-ui, sans-serif',
              flexShrink: 0,
            }}
          >
            subgraph
          </span>
        )}

        {data.isAutoDocNote && (
          <span
            style={{
              fontSize: 8,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '1px 5px',
              borderRadius: 1,
              background: '#14b8a622',
              color: '#67e8f9',
              border: '1px solid #14b8a644',
              fontFamily: 'Inter, system-ui, sans-serif',
              flexShrink: 0,
            }}
          >
            auto-doc
          </span>
        )}

        {data.isCustom && !data.isSubgraph && (
          <span
            style={{
              fontSize: 8,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '1px 5px',
              borderRadius: 1,
              background: '#6b728022',
              color: '#9ca3af',
              border: '1px solid #6b728044',
              fontFamily: 'Inter, system-ui, sans-serif',
              flexShrink: 0,
            }}
          >
            custom
          </span>
        )}
      </div>

      <div
        style={{
          height: SUMMARY_HEIGHT,
          padding: '4px 10px 0',
          fontSize: 10,
          color: theme.widgetLabel,
          fontFamily: 'Inter, system-ui, sans-serif',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={keyInputs || 'No key input widgets'}
      >
        {keyInputs || 'No key input widgets'}
      </div>

      <div
        style={{
          marginTop: 2,
          marginLeft: 8,
          marginRight: 8,
          height: bodyHeight,
          maxHeight: MAX_BODY_HEIGHT,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: 2,
        }}
      >
        {hasInputs && (
          <div style={{ marginBottom: 6 }}>
            <div style={sectionLabelStyle}>inputs ({data.inputs.length})</div>
            {data.inputs.map((input, idx) => (
              <div
                key={`in-row-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 4,
                  minHeight: ROW_HEIGHT,
                }}
                title={`${input.name}: ${input.type}`}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: theme.inputName,
                    fontFamily: 'Inter, system-ui, sans-serif',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  {input.name}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    color: getTypeColor(input.type),
                    background: theme.widgetBg,
                    border: `1px solid ${theme.widgetBorder}`,
                    borderRadius: 1,
                    padding: '0 4px',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {input.type}
                </span>
              </div>
            ))}
          </div>
        )}

        {hasWidgets && (
          <div style={{ marginBottom: 6, background: theme.parametersBg, borderRadius: 2, padding: '2px 4px 3px' }}>
            <div style={sectionLabelStyle}>parameters ({widgetRows.length})</div>
            {visibleWidgets.map((row, idx) => (
              <div
                key={`${row.name}-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  minHeight: ROW_HEIGHT,
                }}
                title={`${row.name}: ${row.formatted}`}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: 'Inter, system-ui, sans-serif',
                    color: row.isModel ? (isDark ? '#d7a4f7' : '#8b5cf6') : theme.widgetLabel,
                    minWidth: 62,
                    maxWidth: 112,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.name}
                </span>
                <div
                  style={{
                    flex: 1,
                    background: theme.widgetBg,
                    borderRadius: 1,
                    border: `1px solid ${theme.widgetBorder}`,
                    padding: '1px 6px',
                    overflow: 'hidden',
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: 'Inter, system-ui, sans-serif',
                      color: row.isModel ? (isDark ? '#d7b4ee' : '#7c3aed') : theme.widgetValue,
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.formatted}
                  </span>
                </div>
              </div>
            ))}

            {hiddenWidgetCount > 0 && (
              <div
                style={{
                  minHeight: ROW_HEIGHT,
                  fontSize: 10,
                  color: theme.overflowText,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  padding: '0 2px',
                }}
              >
                +{hiddenWidgetCount} more widget{hiddenWidgetCount === 1 ? '' : 's'}
              </div>
            )}
          </div>
        )}

        {hasOutputs && (
          <div style={{ marginBottom: 6 }}>
            <div style={sectionLabelStyle}>outputs ({data.outputs.length})</div>
            {data.outputs.map((output, idx) => (
              <div
                key={`out-row-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 4,
                  minHeight: ROW_HEIGHT,
                }}
                title={`${output.name}: ${output.type}`}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: theme.outputName,
                    fontFamily: 'Inter, system-ui, sans-serif',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  {output.name}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    color: getTypeColor(output.type),
                    background: theme.widgetBg,
                    border: `1px solid ${theme.widgetBorder}`,
                    borderRadius: 1,
                    padding: '0 4px',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {output.type}
                </span>
              </div>
            ))}
          </div>
        )}

        {(data.imagePreviewUrl || showLoadImagePlaceholder) && (
          <div style={{ marginBottom: 6 }}>
            {data.imagePreviewUrl && !previewFailed ? (
              <img
                src={data.imagePreviewUrl}
                alt={data.imagePreviewLabel || 'preview'}
                style={{
                  width: '100%',
                  maxHeight: 120,
                  objectFit: 'contain',
                  borderRadius: 1,
                  border: `1px solid ${theme.widgetBorder}`,
                  background: theme.multilineBg,
                }}
                onError={() => setPreviewFailed(true)}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: 64,
                  borderRadius: 1,
                  border: `1px solid ${theme.widgetBorder}`,
                  background: theme.multilineBg,
                  color: theme.multilineText,
                  fontSize: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                No image
              </div>
            )}
            <div
              style={{
                marginTop: 4,
                fontSize: 10,
                color: theme.multilineLabel,
                fontFamily: 'Inter, system-ui, sans-serif',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={data.imagePreviewLabel || ''}
            >
              {data.imagePreviewLabel || 'none'}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 2,
          padding: '0 10px',
          height: FOOTER_HEIGHT,
          fontSize: 9,
          color: theme.footerText,
          background: theme.footerBg,
          fontFamily: 'Inter, system-ui, sans-serif',
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
        }}
      >
        <span
          style={{
            fontSize: '9px',
            fontFamily: 'Inter, system-ui, sans-serif',
            color: colors.accent,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={`#${data.nodeId} - ${data.nodeType}`}
        >
          node #{data.nodeId}
          {data.isSubgraph ? ' | subgraph' : data.isCustom ? ' | custom' : ''}
          {data.isAutoDocNote ? ' | auto-doc' : ''}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 8, color: theme.footerBadge }}>
            {data.inputs.length}in · {data.outputs.length}out
          </span>
          {data.onToggleSelection && (
            <button
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                data.onToggleSelection?.(String(data.nodeId));
              }}
              style={{
                width: 16,
                height: 16,
                borderRadius: 1,
                border: `1px solid ${data.isSelected ? '#7C6AEF' : theme.boolOffBorder}`,
                background: data.isSelected ? '#7C6AEF' : 'transparent',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title={data.isSelected ? 'Deselect node' : 'Select node for chat context'}
            >
              {data.isSelected ? '✓' : ''}
            </button>
          )}
        </div>
      </div>

      {data.inputs.map((input, index) => (
        <Handle
          key={`input-${index}`}
          type="target"
          position={Position.Left}
          id={`input-${index}`}
          style={{
            top: socketY(index, inputCount, nodeHeight),
            left: -4,
            width: 8,
            height: 8,
            border: `1.5px solid ${theme.handleBorder}`,
            borderRadius: '50%',
            background: getTypeColor(input.type),
            boxShadow: 'none',
          }}
        />
      ))}

      {data.outputs.map((output, index) => (
        <Handle
          key={`output-${output.slotIndex ?? index}`}
          type="source"
          position={Position.Right}
          id={`output-${output.slotIndex ?? index}`}
          style={{
            top: socketY(index, outputCount, nodeHeight),
            right: -4,
            width: 8,
            height: 8,
            border: `1.5px solid ${theme.handleBorder}`,
            borderRadius: '50%',
            background: getTypeColor(output.type),
            boxShadow: 'none',
          }}
        />
      ))}
    </div>
  );
}

export const ComfyNode = memo(ComfyNodeComponent);

