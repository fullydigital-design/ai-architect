import { memo, useMemo, useEffect, useState, useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  Panel,
  BaseEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type NodeChange,
  type Node,
  type Edge,
  type EdgeProps,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { LayoutGrid, Upload } from 'lucide-react';
import type { ComfyUIWorkflow, ProviderSettings } from '../../../types/comfyui';
import { NODE_REGISTRY } from '../../../data/node-registry';
import { ComfyNode } from './ComfyNode';
import { NodeParameterPanel } from './NodeParameterPanel';
import { ParameterOptimizerPanel } from './ParameterOptimizerPanel';
import { MissingModelsPanel } from './MissingModelsPanel';
import { getWorkflowPerfTier, getPerfConfig, type PerfConfig } from '../../../utils/workflow-performance';
import { computeAutoLayout, computeGraphBounds, type LayoutEdge, type LayoutNode } from '../../../utils/graph-layout';
import { generateWirePath, type WireStyle } from '../../../utils/graph-wires';
import { getLiveNodeCache, getRawObjectInfo } from '../../../services/comfyui-backend';
import { getObjectInfo } from '../../../services/comfyui-object-info-cache';
import { fetchInstalledEnvironment } from '../../../services/comfyui-scanner';
import { getComfyUIBaseUrl } from '../../../services/api-config';
import { resolveNodeSchema } from '../../../services/node-schema-resolver';
import type { ParameterChange } from '../../../services/workflow-parameter-optimizer';
import { LEGACY_NOTE_MARKER_START, NOTE_MARKER_START } from '../../../services/workflow-note-injector';
import {
  ModelDownloadService,
  type MissingModel,
  type ModelDownloadInfo,
} from '../../../services/model-download-service';
import { useTheme } from '../../../hooks/useTheme';

const NODE_WIDTH = 320;
const NODE_HEIGHT = 240;
const RANK_SEP = 180;
const NODE_SEP = 120;

const typeEdgeColors: Record<string, string> = {
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
  IPADAPTER: '#66AA99',
  STRING: '#5599AA',
  INT: '#5599AA',
  FLOAT: '#5599AA',
  '*': '#444444',
};

function getTypeEdgeColor(dataType?: string): string {
  if (!dataType) return typeEdgeColors['*'];
  return typeEdgeColors[dataType.toUpperCase()] || typeEdgeColors['*'];
}

type OptimizationSnapshot = Map<string, any[]>;
let persistedOptimizationSnapshot: OptimizationSnapshot | null = null;

function cloneOptimizationSnapshot(snapshot: OptimizationSnapshot | null): OptimizationSnapshot | null {
  if (!snapshot) return null;
  const clone: OptimizationSnapshot = new Map();
  for (const [nodeId, values] of snapshot.entries()) {
    clone.set(nodeId, [...values]);
  }
  return clone;
}

function getMissingModelKey(model: MissingModel): string {
  return `${model.type}:${model.filename.toLowerCase()}`;
}

function mergeMissingModels(
  previous: MissingModel[],
  incoming: MissingModel[],
): MissingModel[] {
  const previousByKey = new Map(previous.map((model) => [getMissingModelKey(model), model]));
  return incoming.map((nextModel) => {
    const key = getMissingModelKey(nextModel);
    const prev = previousByKey.get(key);
    if (!prev) return nextModel;

    const mergedLinks = {
      registryUrl: nextModel.registryUrl ?? prev.registryUrl,
      downloadUrl: nextModel.downloadUrl ?? prev.downloadUrl,
      pageUrl: nextModel.pageUrl ?? prev.pageUrl,
    };

    if (prev.downloadState.status === 'downloading' || prev.downloadState.status === 'complete' || prev.downloadState.status === 'error') {
      return {
        ...nextModel,
        ...mergedLinks,
        downloadInfo: nextModel.downloadInfo ?? prev.downloadInfo,
        downloadState: prev.downloadState,
      };
    }

    if (prev.downloadInfo && !nextModel.downloadInfo) {
      return {
        ...nextModel,
        ...mergedLinks,
        downloadInfo: prev.downloadInfo,
        downloadState: prev.downloadState.status === 'not-found' ? prev.downloadState : nextModel.downloadState,
      };
    }

    return {
      ...nextModel,
      ...mergedLinks,
    };
  });
}

const nodeTypes = { comfyNode: ComfyNode };

function GraphWireEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  data,
}: EdgeProps<{ dataType?: string; wireStyle?: WireStyle; isTypeMismatch?: boolean }>) {
  const wireStyle: WireStyle = data?.wireStyle || 'bezier';
  const edgePath = generateWirePath(sourceX, sourceY, targetX, targetY, wireStyle);
  const color = data?.isTypeMismatch ? '#ef4444' : getTypeEdgeColor(data?.dataType);

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        stroke: color,
        strokeWidth: 1.5,
        opacity: 0.6,
        strokeDasharray: data?.isTypeMismatch ? '4 2' : undefined,
        strokeLinecap: 'round',
        fill: 'none',
        ...style,
      }}
    />
  );
}

const edgeTypes = { graphWire: memo(GraphWireEdge) };

function isConnectionTypeCompatible(sourceType: string, targetType: string): boolean {
  if (!sourceType || !targetType) return true;
  if (sourceType === targetType) return true;
  if (sourceType === '*' || targetType === '*') return true;
  return false;
}

interface WorkflowVisualizerProps {
  workflow: ComfyUIWorkflow | null;
  onImportWorkflow?: (file: File) => void;
  onAutoLayout?: () => void;
  selectedNodeIds?: Set<string>;
  onToggleNodeSelection?: (nodeId: string) => void;
  onClearSelection?: () => void;
  onWorkflowChange?: (workflow: ComfyUIWorkflow, actionLabel: string) => void;
  errorNodeId?: string | null;
  comfyuiUrl?: string;
  providerSettings?: ProviderSettings;
  architectureHint?: string;
}

function workflowToLayoutData(workflow: ComfyUIWorkflow, visibleNodeIds: Set<number>, maxVisibleNodes: number): {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
} {
  const visibleNodes = Number.isFinite(maxVisibleNodes)
    ? workflow.nodes.slice(0, maxVisibleNodes)
    : workflow.nodes;

  const nodes: LayoutNode[] = visibleNodes.map((node) => ({
    id: String(node.id),
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    label: node.title || node.type,
    type: node.type,
  }));

  const edges: LayoutEdge[] = workflow.links
    .filter((link) => visibleNodeIds.has(link[1]) && visibleNodeIds.has(link[3]))
    .map((link) => ({
      source: String(link[1]),
      sourceOutput: String(link[2]),
      target: String(link[3]),
      targetInput: String(link[4]),
    }));

  return { nodes, edges };
}

export function WorkflowVisualizer({
  workflow,
  onImportWorkflow,
  onAutoLayout,
  selectedNodeIds,
  onToggleNodeSelection,
  onClearSelection,
  onWorkflowChange,
  errorNodeId,
  comfyuiUrl,
  providerSettings,
  architectureHint,
}: WorkflowVisualizerProps) {
  const { isDark } = useTheme();
  const [isDragOver, setIsDragOver] = useState(false);
  const [wireStyle, setWireStyle] = useState<WireStyle>('bezier');
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [preOptimizationSnapshot, setPreOptimizationSnapshot] = useState<OptimizationSnapshot | null>(
    () => cloneOptimizationSnapshot(persistedOptimizationSnapshot),
  );
  const [objectInfo, setObjectInfo] = useState<Record<string, any> | null>(null);
  const [missingModels, setMissingModels] = useState<MissingModel[]>([]);
  const [installedModels, setInstalledModels] = useState<{
    checkpoints: string[];
    loras: string[];
    vae: string[];
    controlnet: string[];
    upscale_models: string[];
    embeddings: string[];
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoFitSignatureRef = useRef('');
  const preOptimizationSnapshotRef = useRef<OptimizationSnapshot | null>(cloneOptimizationSnapshot(persistedOptimizationSnapshot));
  const modelDownloadServiceRef = useRef<ModelDownloadService | null>(null);
  const modelPollersRef = useRef<Map<string, {
    intervalId: number;
    timeoutId: number;
    startedAt: number;
    lastProgress: number;
    lastProgressChange: number;
  }>>(new Map());
  const reactFlow = useReactFlow();

  const perfTier = workflow ? getWorkflowPerfTier(workflow) : 'small';
  const perfConfig: PerfConfig = getPerfConfig(perfTier);
  const comfyBaseUrl = useMemo(
    () => (comfyuiUrl?.trim() || getComfyUIBaseUrl()).replace(/\/+$/, ''),
    [comfyuiUrl],
  );
  const liveNodeCount = getLiveNodeCache()?.nodeCount ?? 0;
  const workflowStats = useMemo(() => {
    if (!workflow?.nodes?.length) return null;

    const nodeCount = workflow.nodes.length;
    const modelValues = new Set<string>();
    const packNames = new Set<string>();

    for (const node of workflow.nodes) {
      const schema = NODE_REGISTRY.get(node.type);
      if (schema?.source === 'custom' || !schema) {
        const packName = node.type.split(/[._]/)[0];
        if (packName) packNames.add(packName);
      }

      const lowerType = node.type.toLowerCase();
      if (lowerType.includes('loader') || lowerType.includes('checkpoint')) {
        const widgetValues = Array.isArray(node.widgets_values) ? node.widgets_values : [];
        const modelRef = widgetValues.find((value) => (
          typeof value === 'string' && /\.[a-z0-9]{2,8}$/i.test(value)
        ));
        if (typeof modelRef === 'string') modelValues.add(modelRef);
      }
    }

    return {
      nodes: nodeCount,
      models: modelValues.size,
      packs: packNames.size,
    };
  }, [workflow]);

  useEffect(() => {
    const saved = localStorage.getItem('graph-wire-style');
    if (saved === 'bezier' || saved === 'straight' || saved === 'step') {
      setWireStyle(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('graph-wire-style', wireStyle);
  }, [wireStyle]);

  useEffect(() => {
    preOptimizationSnapshotRef.current = cloneOptimizationSnapshot(preOptimizationSnapshot);
    persistedOptimizationSnapshot = cloneOptimizationSnapshot(preOptimizationSnapshot);
  }, [preOptimizationSnapshot]);

  useEffect(() => {
    const baseUrl = comfyuiUrl?.trim() || getComfyUIBaseUrl();
    if (!modelDownloadServiceRef.current) {
      modelDownloadServiceRef.current = new ModelDownloadService(baseUrl, {
        huggingfaceToken: providerSettings?.huggingfaceApiKey,
        civitaiApiKey: providerSettings?.civitaiApiKey,
      });
      return;
    }
    modelDownloadServiceRef.current.setComfyUIUrl(baseUrl);
    modelDownloadServiceRef.current.setAuth({
      huggingfaceToken: providerSettings?.huggingfaceApiKey,
      civitaiApiKey: providerSettings?.civitaiApiKey,
    });
  }, [comfyuiUrl, providerSettings?.huggingfaceApiKey, providerSettings?.civitaiApiKey]);

  useEffect(() => {
    return () => {
      for (const poller of modelPollersRef.current.values()) {
        window.clearInterval(poller.intervalId);
        window.clearTimeout(poller.timeoutId);
      }
      modelPollersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!workflow?.nodes?.length) {
      setSelectedNodeId(null);
      setShowOptimizer(false);
      return;
    }
    if (selectedNodeId == null) return;
    if (!workflow.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [workflow, selectedNodeId]);

  useEffect(() => {
    const baseUrl = comfyuiUrl?.trim() || getComfyUIBaseUrl();
    let cancelled = false;
    void getObjectInfo(baseUrl)
      .then((data) => {
        if (!cancelled) setObjectInfo(data);
      })
      .catch(() => {
        if (!cancelled) setObjectInfo(null);
      });
    void fetchInstalledEnvironment(baseUrl)
      .then((env) => {
        if (cancelled) return;
        setInstalledModels({
          checkpoints: env.checkpoints,
          loras: env.loras,
          vae: env.vaes,
          controlnet: env.controlnets,
          upscale_models: env.upscale_models,
          embeddings: [],
        });
      })
      .catch(() => {
        if (!cancelled) setInstalledModels(null);
      });

    return () => {
      cancelled = true;
    };
  }, [comfyuiUrl, workflow?.nodes?.length]);

  useEffect(() => {
    if (!workflow || !objectInfo || !modelDownloadServiceRef.current) {
      setMissingModels([]);
      return;
    }

    const service = modelDownloadServiceRef.current;
    const detected = service.detectMissingModels(workflow, objectInfo);
    if (detected.length === 0) {
      setMissingModels([]);
      return;
    }

    let cancelled = false;
    void service.resolveDownloadUrls(detected)
      .then((resolved) => {
        if (cancelled) return;
        setMissingModels((previous) => mergeMissingModels(previous, resolved));
      })
      .catch(() => {
        if (cancelled) return;
        setMissingModels((previous) => mergeMissingModels(previous, detected));
      });

    return () => {
      cancelled = true;
    };
  }, [workflow, objectInfo]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!workflow?.nodes?.length) {
      return { nodes: [] as Node[], edges: [] as Edge[] };
    }

    const visibleNodes = Number.isFinite(perfConfig.maxVisibleNodes)
      ? workflow.nodes.slice(0, perfConfig.maxVisibleNodes)
      : workflow.nodes;
    const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));

    const { nodes: layoutNodes, edges: layoutEdges } = workflowToLayoutData(workflow, visibleNodeIds, perfConfig.maxVisibleNodes);
    const positions = computeAutoLayout(layoutNodes, layoutEdges, {
      direction: 'LR',
      nodeWidth: NODE_WIDTH,
      nodeHeight: NODE_HEIGHT,
      rankSep: RANK_SEP,
      nodeSep: NODE_SEP,
      edgeSep: 20,
    });
    const liveCache = getLiveNodeCache();

    const linksByTarget = new Map<number, Array<{ tgtSlot: number; type: string }>>();
    const linksBySource = new Map<number, Array<{ srcSlot: number; type: string }>>();

    for (const [, srcId, srcSlot, tgtId, tgtSlot, linkType] of workflow.links) {
      if (!visibleNodeIds.has(srcId) || !visibleNodeIds.has(tgtId)) continue;
      if (!linksByTarget.has(tgtId)) linksByTarget.set(tgtId, []);
      if (!linksBySource.has(srcId)) linksBySource.set(srcId, []);
      linksByTarget.get(tgtId)!.push({ tgtSlot, type: linkType });
      linksBySource.get(srcId)!.push({ srcSlot, type: linkType });
    }

    const nodes: Node[] = visibleNodes.map((node) => {
      const liveSchema = liveCache?.nodes[node.type];
      const staticSchema = NODE_REGISTRY.get(node.type);
      const effectiveInputs = liveSchema?.inputs ?? staticSchema?.inputs ?? [];
      const connectionInputs = effectiveInputs.filter((input) => !input.isWidget);
      const widgetInputs = effectiveInputs.filter((input) => input.isWidget);
      const effectiveOutputs = liveSchema?.outputs ?? staticSchema?.outputs ?? [];
      const displayName = node.title || liveSchema?.display_name || staticSchema?.displayName || node.type;
      const category = liveSchema?.category?.split('/')[0]?.toLowerCase() || staticSchema?.category || 'utility';
      const isSubgraph = node.type.startsWith('workflow/') || /subgraph|workflow/i.test(liveSchema?.category || '');
      const widgetValues = Array.isArray(node.widgets_values) ? node.widgets_values : [];
      const isAutoDocNote = node.type === 'Note'
        && typeof widgetValues[0] === 'string'
        && (
          widgetValues[0].includes(NOTE_MARKER_START)
          || widgetValues[0].includes(LEGACY_NOTE_MARKER_START)
        );
      const loadImageFilename = typeof widgetValues[0] === 'string' ? widgetValues[0].trim() : '';
      const isLoadImageNode = node.type === 'LoadImage' || node.type === 'LoadImageMask';
      const imagePreviewUrl = isLoadImageNode && loadImageFilename
        ? `${comfyBaseUrl}/view?filename=${encodeURIComponent(loadImageFilename)}&type=input`
        : undefined;

      const normalizeName = (name: string): string => String(name || '').toLowerCase().replace(/[\s_-]/g, '');
      const nodeInputs = node.inputs ?? [];
      let inputs = nodeInputs.map((input) => ({
        name: input.name,
        type: input.type,
      }));
      for (const schemaInput of connectionInputs) {
        const exists = inputs.some((input) => normalizeName(input.name) === normalizeName(schemaInput.name));
        if (!exists) {
          inputs.push({
            name: schemaInput.name,
            type: schemaInput.type,
          });
        }
      }

      const nodeInLinks = linksByTarget.get(node.id) || [];
      if (nodeInLinks.length > 0) {
        const maxTargetSlot = Math.max(...nodeInLinks.map((link) => link.tgtSlot));
        while (inputs.length <= maxTargetSlot) {
          const slot = inputs.length;
          const linkInfo = nodeInLinks.find((link) => link.tgtSlot === slot);
          inputs.push({
            name: linkInfo?.type?.toLowerCase() || `input_${slot}`,
            type: linkInfo?.type || '*',
          });
        }
      }

      const nodeOutputs = node.outputs ?? [];
      let outputs = nodeOutputs.map((output, idx) => ({
        name: output.name,
        type: output.type,
        slotIndex: output.slot_index ?? idx,
      }));
      for (const schemaOutput of effectiveOutputs) {
        const exists = outputs.some((output) =>
          output.slotIndex === schemaOutput.slotIndex
          || (output.name === schemaOutput.name && output.type === schemaOutput.type),
        );
        if (!exists) {
          outputs.push({
            name: schemaOutput.name,
            type: schemaOutput.type,
            slotIndex: schemaOutput.slotIndex,
          });
        }
      }

      const nodeOutLinks = linksBySource.get(node.id) || [];
      if (nodeOutLinks.length > 0) {
        const maxSourceSlot = Math.max(...nodeOutLinks.map((link) => link.srcSlot));
        for (let slot = 0; slot <= maxSourceSlot; slot++) {
          if (!outputs.find((output) => output.slotIndex === slot)) {
            const linkInfo = nodeOutLinks.find((link) => link.srcSlot === slot);
            outputs.push({
              name: linkInfo?.type || `output_${slot}`,
              type: linkInfo?.type || '*',
              slotIndex: slot,
            });
          }
        }
        outputs.sort((a, b) => a.slotIndex - b.slotIndex);
      }

      const pos = positions.get(String(node.id));
      const widgetNames = widgetInputs.map((widget) => widget.name);

      return {
        id: String(node.id),
        type: 'comfyNode',
        position: pos || { x: node.pos?.[0] ?? 0, y: node.pos?.[1] ?? 0 },
        data: {
          nodeId: node.id,
          label: displayName,
          nodeType: node.type,
          category,
          inputs,
          outputs,
          widgetValues,
          widgetNames,
          imagePreviewUrl,
          imagePreviewLabel: isLoadImageNode ? (loadImageFilename || 'none') : undefined,
          isCustom: (staticSchema?.source === 'custom') || (!staticSchema && !liveSchema),
          isSubgraph,
          isAutoDocNote,
          isError: errorNodeId === String(node.id),
          isSelected: selectedNodeIds?.has(String(node.id)) ?? false,
          onToggleSelection: onToggleNodeSelection,
        },
        draggable: false,
      };
    });

    const nodeInputCounts = new Map<string, number>();
    const nodeOutputSlots = new Map<string, Set<number>>();
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    for (const node of nodes) {
      const inputCount = Array.isArray((node.data as any).inputs) ? (node.data as any).inputs.length : 0;
      const outputSet = new Set<number>();
      const outputs = Array.isArray((node.data as any).outputs) ? (node.data as any).outputs : [];
      for (const output of outputs) {
        outputSet.add(output.slotIndex);
      }
      nodeInputCounts.set(node.id, inputCount);
      nodeOutputSlots.set(node.id, outputSet);
    }

    const edges: Edge[] = workflow.links
      .filter((link) => {
        const [, srcNodeId, srcSlot, tgtNodeId, tgtSlot] = link;
        if (!visibleNodeIds.has(srcNodeId) || !visibleNodeIds.has(tgtNodeId)) return false;
        const srcId = String(srcNodeId);
        const tgtId = String(tgtNodeId);
        const srcOk = nodeOutputSlots.get(srcId)?.has(srcSlot) ?? false;
        const tgtOk = (nodeInputCounts.get(tgtId) ?? 0) > tgtSlot;
        return srcOk && tgtOk;
      })
      .map((link) => {
        const [linkId, srcNodeId, srcSlot, tgtNodeId, tgtSlot, linkType] = link;
        const sourceNode = nodeById.get(String(srcNodeId));
        const targetNode = nodeById.get(String(tgtNodeId));
        const sourceOutputs = (sourceNode?.data as any)?.outputs || [];
        const targetInputs = (targetNode?.data as any)?.inputs || [];
        const sourceOutput = sourceOutputs.find((output: any) => output.slotIndex === srcSlot);
        const targetInput = targetInputs[tgtSlot];
        const sourceType = String(sourceOutput?.type || linkType || '*');
        const targetType = String(targetInput?.type || '*');
        const isTypeMismatch = !isConnectionTypeCompatible(sourceType, targetType);

        return {
          id: `link-${linkId}`,
          source: String(srcNodeId),
          target: String(tgtNodeId),
          sourceHandle: `output-${srcSlot}`,
          targetHandle: `input-${tgtSlot}`,
          type: 'graphWire',
          animated: false,
          style: isTypeMismatch
            ? { stroke: '#ef4444', strokeWidth: 1.5, strokeDasharray: '4 2' }
            : undefined,
          data: {
            dataType: sourceType,
            wireStyle,
            isTypeMismatch,
          },
        };
      });

    return { nodes, edges };
  }, [
    workflow,
    errorNodeId,
    wireStyle,
    perfConfig.maxVisibleNodes,
    liveNodeCount,
    comfyBaseUrl,
    selectedNodeIds,
    onToggleNodeSelection,
  ]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(initialNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(initialEdges);
  const workflowStructureSignature = useMemo(() => {
    if (!workflow?.nodes?.length) return '';

    const visibleNodes = Number.isFinite(perfConfig.maxVisibleNodes)
      ? workflow.nodes.slice(0, perfConfig.maxVisibleNodes)
      : workflow.nodes;
    const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
    const nodeSignature = visibleNodes
      .map((node) => `${node.id}:${node.type}`)
      .join('|');
    const linkSignature = workflow.links
      .filter(([, srcNodeId, , tgtNodeId]) => visibleNodeIds.has(srcNodeId) && visibleNodeIds.has(tgtNodeId))
      .map(([, srcNodeId, srcSlot, tgtNodeId, tgtSlot, linkType]) => `${srcNodeId}:${srcSlot}>${tgtNodeId}:${tgtSlot}:${linkType || ''}`)
      .join('|');

    return `${visibleNodes.length}::${nodeSignature}::${linkSignature}`;
  }, [workflow, perfConfig.maxVisibleNodes]);

  useEffect(() => {
    setRfNodes(initialNodes);
    setRfEdges(initialEdges);
  }, [initialNodes, initialEdges, setRfNodes, setRfEdges]);

  const handleFitView = useCallback((positionsOverride?: Map<string, { x: number; y: number }>) => {
    if (!containerRef.current || rfNodes.length === 0) {
      void reactFlow.fitView({ padding: 0.2, duration: 300 });
      return;
    }

    const positions = positionsOverride
      || new Map(rfNodes.map((node) => [node.id, { x: node.position.x, y: node.position.y }]));

    const bounds = computeGraphBounds(positions, NODE_WIDTH, NODE_HEIGHT);
    const rect = containerRef.current.getBoundingClientRect();

    if (bounds.width <= 0 || bounds.height <= 0 || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)) {
      void reactFlow.fitView({ padding: 0.2, duration: 300 });
      return;
    }

    const padding = 60;
    const scaleX = rect.width / (bounds.width + padding * 2);
    const scaleY = rect.height / (bounds.height + padding * 2);
    const zoom = Math.min(scaleX, scaleY, 1.5);

    const x = (rect.width - bounds.width * zoom) / 2 - bounds.minX * zoom;
    const y = (rect.height - bounds.height * zoom) / 2 - bounds.minY * zoom;

    void reactFlow.setViewport({ x, y, zoom }, { duration: 300 });
  }, [rfNodes, reactFlow]);

  const handleSmartLayout = useCallback(() => {
    if (rfNodes.length === 0) return;

    const inDegree: Record<string, number> = {};
    const adjacency: Record<string, string[]> = {};
    const depth: Record<string, number> = {};

    for (const node of rfNodes) {
      inDegree[node.id] = 0;
      adjacency[node.id] = [];
      depth[node.id] = 0;
    }

    for (const edge of rfEdges) {
      if (!(edge.source in inDegree) || !(edge.target in inDegree)) continue;
      inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
      adjacency[edge.source] = adjacency[edge.source] || [];
      adjacency[edge.source].push(edge.target);
    }

    const queue: string[] = Object.keys(inDegree).filter((id) => inDegree[id] === 0);
    if (queue.length === 0) {
      queue.push(...rfNodes.map((node) => node.id));
    }

    const remainingInDegree = { ...inDegree };
    const visited = new Set<string>();
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      const nextNodes = adjacency[nodeId] || [];
      for (const target of nextNodes) {
        depth[target] = Math.max(depth[target] || 0, (depth[nodeId] || 0) + 1);
        remainingInDegree[target] = (remainingInDegree[target] || 0) - 1;
        if (remainingInDegree[target] === 0) {
          queue.push(target);
        }
      }
    }

    for (const node of rfNodes) {
      if (!visited.has(node.id)) {
        depth[node.id] = 0;
      }
    }

    const columns = new Map<number, Node[]>();
    for (const node of rfNodes) {
      const col = depth[node.id] || 0;
      if (!columns.has(col)) columns.set(col, []);
      columns.get(col)!.push(node);
    }

    const H_GAP = 80;
    const V_GAP = 50;

    const getNodeHeight = (node: Node): number => {
      const measured = node.measured?.height ?? node.height;
      if (typeof measured === 'number' && Number.isFinite(measured) && measured > 0) {
        return measured;
      }
      const data = node.data as {
        widgetNames?: unknown[];
        widgetValues?: unknown[];
        inputs?: unknown[];
        outputs?: unknown[];
      } | undefined;
      const widgetCount = Array.isArray(data?.widgetNames)
        ? data.widgetNames.length
        : (Array.isArray(data?.widgetValues) ? data.widgetValues.length : 0);
      const inputCount = Array.isArray(data?.inputs) ? data.inputs.length : 0;
      const outputCount = Array.isArray(data?.outputs) ? data.outputs.length : 0;
      const rows = Math.max(widgetCount + inputCount, outputCount, 3);
      return Math.max(rows * 28 + 60, 120);
    };

    const getNodeWidth = (node: Node): number => {
      const measured = node.measured?.width ?? node.width;
      if (typeof measured === 'number' && Number.isFinite(measured) && measured > 0) {
        return measured;
      }
      const data = node.data as { label?: string; nodeType?: string } | undefined;
      const title = String(data?.label || data?.nodeType || '');
      return Math.max(title.length * 8 + 40, 220);
    };

    const positions = new Map<string, { x: number; y: number }>();
    const sortedColumnIds = Array.from(columns.keys()).sort((a, b) => a - b);
    let xOffset = 0;

    for (const col of sortedColumnIds) {
      const colNodes = [...(columns.get(col) || [])];
      if (colNodes.length === 0) continue;

      colNodes.sort((a, b) => {
        const aSources = rfEdges
          .filter((edge) => edge.target === a.id)
          .map((edge) => positions.get(edge.source)?.y ?? 0);
        const bSources = rfEdges
          .filter((edge) => edge.target === b.id)
          .map((edge) => positions.get(edge.source)?.y ?? 0);
        const aAvg = aSources.length > 0 ? aSources.reduce((sum, y) => sum + y, 0) / aSources.length : a.position.y;
        const bAvg = bSources.length > 0 ? bSources.reduce((sum, y) => sum + y, 0) / bSources.length : b.position.y;
        return aAvg - bAvg;
      });

      const totalHeight = colNodes.reduce((sum, node) => sum + getNodeHeight(node), 0)
        + Math.max(colNodes.length - 1, 0) * V_GAP;
      let yOffset = -totalHeight / 2;
      let maxWidth = 0;

      for (const node of colNodes) {
        const nodeHeight = getNodeHeight(node);
        const nodeWidth = getNodeWidth(node);
        maxWidth = Math.max(maxWidth, nodeWidth);
        positions.set(node.id, { x: xOffset, y: yOffset });
        yOffset += nodeHeight + V_GAP;
      }

      xOffset += maxWidth + H_GAP;
    }

    setRfNodes((prev) => prev.map((node) => ({
      ...node,
      position: positions.get(node.id) || node.position,
      draggable: false,
    })));

    setTimeout(() => {
      void reactFlow.fitView({ padding: 0.12, duration: 400 });
    }, 50);
  }, [rfNodes, rfEdges, setRfNodes, reactFlow]);

  useEffect(() => {
    if (!workflowStructureSignature || initialNodes.length === 0) {
      autoFitSignatureRef.current = '';
      return;
    }
    if (autoFitSignatureRef.current === workflowStructureSignature) return;

    autoFitSignatureRef.current = workflowStructureSignature;
    const timer = window.setTimeout(() => {
      const positions = new Map(initialNodes.map((node) => [node.id, { x: node.position.x, y: node.position.y }]));
      handleFitView(positions);
    }, 100);

    return () => window.clearTimeout(timer);
  }, [workflowStructureSignature, initialNodes, handleFitView]);

  const cycleWireStyle = useCallback(() => {
    const styles: WireStyle[] = ['bezier', 'straight', 'step'];
    const current = styles.indexOf(wireStyle);
    setWireStyle(styles[(current + 1) % styles.length]);
  }, [wireStyle]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('workflow-wire-style-changed', { detail: wireStyle }));
  }, [wireStyle]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const { clientX, clientY } = event;
    if (
      clientX <= rect.left || clientX >= rect.right
      || clientY <= rect.top || clientY >= rect.bottom
    ) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    if (!onImportWorkflow) return;

    const files = Array.from(event.dataTransfer.files);
    const jsonFile = files.find((file) => file.name.endsWith('.json') || file.type === 'application/json');
    if (jsonFile) {
      onImportWorkflow(jsonFile);
    }
  }, [onImportWorkflow]);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(Number(node.id));
    onToggleNodeSelection?.(node.id);
  }, [onToggleNodeSelection]);

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const selectedNode = useMemo(
    () => workflow?.nodes?.find((node) => node.id === selectedNodeId) || null,
    [workflow, selectedNodeId],
  );

  const selectedNodeSummary = useMemo(() => {
    if (!workflow || !selectedNodeIds || selectedNodeIds.size === 0) return [];
    return workflow.nodes
      .filter((node) => selectedNodeIds.has(String(node.id)))
      .slice(0, 4)
      .map((node) => node.title || node.type);
  }, [workflow, selectedNodeIds]);

  const selectedSchema = useMemo(() => {
    if (!selectedNode || !objectInfo) return null;
    return resolveNodeSchema(selectedNode.type, objectInfo);
  }, [selectedNode, objectInfo]);

  const liveObjectInfo = useMemo(() => {
    return getRawObjectInfo() || objectInfo || undefined;
  }, [objectInfo]);

  const handleWidgetValueChange = useCallback((nodeId: number, widgetIndex: number, newValue: any) => {
    if (!workflow || !onWorkflowChange) return;
    const nodeIndex = workflow.nodes.findIndex((node) => node.id === nodeId);
    if (nodeIndex === -1) return;

    const nextNodes = [...workflow.nodes];
    const node = { ...nextNodes[nodeIndex] };
    const values = [...(node.widgets_values || [])];
    values[widgetIndex] = newValue;
    node.widgets_values = values;
    nextNodes[nodeIndex] = node;

    onWorkflowChange(
      { ...workflow, nodes: nextNodes },
      `Updated ${node.type} parameter`,
    );
  }, [workflow, onWorkflowChange]);

  const handleResetDefaults = useCallback((nodeId: number) => {
    if (!workflow || !onWorkflowChange || !selectedSchema) return;
    const nodeIndex = workflow.nodes.findIndex((node) => node.id === nodeId);
    if (nodeIndex === -1) return;

    const nextNodes = [...workflow.nodes];
    const node = { ...nextNodes[nodeIndex] };
    const values = [...(node.widgets_values || [])];
    for (const widget of selectedSchema.widgets) {
      values[widget.widgetIndex] = widget.default ?? '';
    }
    node.widgets_values = values;
    nextNodes[nodeIndex] = node;

    onWorkflowChange(
      { ...workflow, nodes: nextNodes },
      `Reset ${node.type} defaults`,
    );
  }, [workflow, onWorkflowChange, selectedSchema]);

  const handleApplyOptimization = useCallback((changes: ParameterChange[]) => {
    if (!workflow || !onWorkflowChange || changes.length === 0) return;

    const snapshot: OptimizationSnapshot = new Map();
    const changesByNode = new Map<number, ParameterChange[]>();
    for (const change of changes) {
      const bucket = changesByNode.get(change.nodeId) || [];
      bucket.push(change);
      changesByNode.set(change.nodeId, bucket);
    }

    for (const [nodeId] of changesByNode) {
      const node = workflow.nodes.find((entry) => entry.id === nodeId);
      if (node?.widgets_values && !snapshot.has(String(node.id))) {
        snapshot.set(String(node.id), [...node.widgets_values]);
      }
    }

    const appliedChanges: string[] = [];
    const skippedChanges: string[] = [];
    const touchedNodeIds = new Set<number>();

    const nextNodes = workflow.nodes.map((node) => {
      const nodeChanges = changesByNode.get(node.id);
      if (!nodeChanges || nodeChanges.length === 0) return node;

      const nextNode = { ...node };
      const values = [...(nextNode.widgets_values || [])];

      for (const change of nodeChanges) {
        const widgetIndex = change.widgetIndex;
        console.log(`[Optimizer Apply] Node ${change.nodeId} (${change.nodeType}): ${change.widgetName}`);
        console.log(`[Optimizer Apply]   widgets_values index: ${widgetIndex}`);
        console.log(`[Optimizer Apply]   Old value in array: ${JSON.stringify(values[widgetIndex])}`);
        console.log(`[Optimizer Apply]   Setting to: ${JSON.stringify(change.newValue)}`);

        if (widgetIndex < 0 || widgetIndex >= values.length) {
          console.warn(
            `[Optimizer Apply] Skipping ${change.widgetName}: index ${widgetIndex} out of bounds (array length ${values.length})`,
          );
          skippedChanges.push(`${change.nodeType}.${change.widgetName}: index out of bounds`);
          continue;
        }

        if (change.widgetType === 'COMBO' && change.validOptions && change.validOptions.length > 0) {
          const nextValue = String(change.newValue);
          if (!change.validOptions.includes(nextValue)) {
            console.warn(
              `[Optimizer Apply] Skipping ${change.widgetName}: "${nextValue}" not in COMBO options`,
            );
            skippedChanges.push(`${change.nodeType}.${change.widgetName}: invalid COMBO value`);
            continue;
          }
        }

        values[widgetIndex] = change.newValue;
        appliedChanges.push(`${change.nodeType}.${change.widgetName}`);
        touchedNodeIds.add(change.nodeId);
      }

      nextNode.widgets_values = values;
      return nextNode;
    });

    console.log(`[Optimizer Apply] Applied: ${appliedChanges.length}, Skipped: ${skippedChanges.length}`);
    if (skippedChanges.length > 0) {
      console.warn('[Optimizer Apply] Skipped changes:', skippedChanges);
    }

    if (appliedChanges.length === 0) return;

    console.log('[Optimizer Undo] Snapshot saved:', {
      nodeCount: snapshot.size,
      nodeIds: [...snapshot.keys()],
      sampleValues: snapshot.size > 0 ? snapshot.entries().next().value : 'empty',
    });

    preOptimizationSnapshotRef.current = cloneOptimizationSnapshot(snapshot);
    persistedOptimizationSnapshot = cloneOptimizationSnapshot(snapshot);
    setPreOptimizationSnapshot(snapshot);
    console.log('[Optimizer Undo] State set. preOptimizationSnapshot should be non-null now.');
    onWorkflowChange(
      { ...workflow, nodes: nextNodes },
      `Applied AI optimization (${appliedChanges.length} change${appliedChanges.length === 1 ? '' : 's'} across ${touchedNodeIds.size} node${touchedNodeIds.size === 1 ? '' : 's'})`,
    );
    setShowOptimizer(false);
  }, [workflow, onWorkflowChange]);

  const handleUndoOptimization = useCallback(() => {
    const snapshot = preOptimizationSnapshot ?? preOptimizationSnapshotRef.current ?? persistedOptimizationSnapshot;
    console.log('[Optimizer Undo] Undo clicked:', {
      hasSnapshot: !!snapshot,
      snapshotSize: snapshot?.size ?? 0,
      currentNodeCount: workflow?.nodes?.length ?? 0,
    });

    if (!workflow || !onWorkflowChange || !snapshot || snapshot.size === 0) {
      console.warn('[Optimizer Undo] No snapshot to restore!');
      return;
    }

    console.log('[Optimizer Undo] Restoring', snapshot.size, 'nodes');

    const restoredNodes = workflow.nodes.map((node) => {
      const originalWidgets = snapshot.get(String(node.id));
      if (!originalWidgets) return node;
      console.log(
        `[Optimizer Undo] Restoring node ${node.id} (${node.type}):`,
        'from',
        node.widgets_values,
        'to',
        originalWidgets,
      );
      return { ...node, widgets_values: [...originalWidgets] };
    });

    onWorkflowChange(
      { ...workflow, nodes: restoredNodes },
      'Undo AI optimization',
    );
    setPreOptimizationSnapshot(null);
    preOptimizationSnapshotRef.current = null;
    persistedOptimizationSnapshot = null;
    console.log('[Optimizer Undo] Restore complete, snapshot cleared');
  }, [workflow, onWorkflowChange, preOptimizationSnapshot]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onSmartLayout = () => {
      handleSmartLayout();
    };
    const onCycleWireStyle = () => {
      cycleWireStyle();
    };
    const onUndoOptimize = () => {
      handleUndoOptimization();
    };

    window.addEventListener('workflow-smart-layout', onSmartLayout);
    window.addEventListener('workflow-cycle-wire-style', onCycleWireStyle);
    window.addEventListener('workflow-undo-optimization', onUndoOptimize);

    return () => {
      window.removeEventListener('workflow-smart-layout', onSmartLayout);
      window.removeEventListener('workflow-cycle-wire-style', onCycleWireStyle);
      window.removeEventListener('workflow-undo-optimization', onUndoOptimize);
    };
  }, [handleSmartLayout, cycleWireStyle, handleUndoOptimization]);

  const clearModelPoller = useCallback((key: string) => {
    const poller = modelPollersRef.current.get(key);
    if (!poller) return;
    window.clearInterval(poller.intervalId);
    window.clearTimeout(poller.timeoutId);
    modelPollersRef.current.delete(key);
  }, []);

  const refreshObjectInfoSnapshot = useCallback(async () => {
    const baseUrl = comfyuiUrl?.trim() || getComfyUIBaseUrl();
    try {
      const freshObjectInfo = await getObjectInfo(baseUrl, true);
      setObjectInfo(freshObjectInfo);
    } catch (error) {
      console.warn('[ModelDownload] Failed to refresh /object_info snapshot:', error);
    }
  }, [comfyuiUrl]);

  const handleDownloadModel = useCallback(async (model: MissingModel) => {
    const service = modelDownloadServiceRef.current;
    if (!service || !model.downloadInfo) return;

    const key = getMissingModelKey(model);
    clearModelPoller(key);

    setMissingModels((prev) => prev.map((entry) => (
      getMissingModelKey(entry) === key
        ? { ...entry, downloadState: { status: 'resolving' } }
        : entry
    )));

    try {
      const result = await service.downloadModel(model, {
        huggingfaceToken: providerSettings?.huggingfaceApiKey,
        civitaiApiKey: providerSettings?.civitaiApiKey,
      });
      if (!result.success) {
        const manualInstallRequired = result.manualRequired || /manager.*registry|model registry/i.test(result.message);
        setMissingModels((prev) => prev.map((entry) => (
          getMissingModelKey(entry) === key
            ? {
              ...entry,
              downloadUrl: result.modelInfo?.url ?? entry.downloadUrl ?? entry.downloadInfo?.url,
              pageUrl: result.modelInfo?.huggingface_page ?? entry.pageUrl ?? entry.downloadInfo?.modelPage,
              downloadState: manualInstallRequired
                ? {
                  status: 'not-found',
                  message: result.message,
                  gated: result.gated,
                  modelInfo: result.modelInfo,
                  suggestions: [
                    ...(result.modelInfo?.huggingface_page ? [result.modelInfo.huggingface_page] : []),
                    ...(result.modelInfo?.url ? [result.modelInfo.url] : []),
                    `https://civitai.com/search/models?query=${encodeURIComponent(model.displayName)}`,
                    `https://huggingface.co/models?search=${encodeURIComponent(model.displayName)}`,
                  ],
                }
                : { status: 'error', message: result.message },
            }
            : entry
        )));
        void refreshObjectInfoSnapshot();
        return;
      }

      console.log('[ModelDownload] Started:', model.filename, 'type:', model.type);
      const startedAt = Date.now();
      setMissingModels((prev) => prev.map((entry) => (
        getMissingModelKey(entry) === key
          ? {
            ...entry,
            downloadState: {
              status: 'downloading',
              progress: 5,
              startedAt,
              lastProgressChange: startedAt,
            },
          }
          : entry
      )));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Download failed';
      console.error('[ModelDownload] Failed to start:', model.filename, message);
      setMissingModels((prev) => prev.map((entry) => (
        getMissingModelKey(entry) === key
          ? {
            ...entry,
            downloadState: { status: 'error', message },
          }
          : entry
      )));
      void refreshObjectInfoSnapshot();
      return;
    }

    const baseUrl = comfyuiUrl?.trim() || getComfyUIBaseUrl();
    const intervalId = window.setInterval(async () => {
      try {
        const poller = modelPollersRef.current.get(key);
        if (!poller) return;

        const freshObjectInfo = await getObjectInfo(baseUrl, true);
        setObjectInfo(freshObjectInfo);

        const isInstalled = await service.checkModelAppeared(
          model.downloadInfo?.filename || model.filename,
          model.type,
          freshObjectInfo,
        );

        if (isInstalled) {
          clearModelPoller(key);
          console.log('[ModelDownload] Complete:', model.filename);
          setMissingModels((prev) => prev.map((entry) => (
            getMissingModelKey(entry) === key
              ? { ...entry, downloadState: { status: 'complete' } }
              : entry
          )));
          void refreshObjectInfoSnapshot();
          return;
        }

        const now = Date.now();
        const staleDuration = now - poller.lastProgressChange;
        if (staleDuration > 30_000) {
          const queueCompleted = await service.checkManagerQueueCompleted();
          if (queueCompleted) {
            clearModelPoller(key);
            console.warn(
              '[ModelDownload] Download appears failed:',
              model.filename,
              `(stale ${Math.round(staleDuration / 1000)}s, queue empty)`,
            );
            setMissingModels((prev) => prev.map((entry) => (
              getMissingModelKey(entry) === key
                ? {
                  ...entry,
                  downloadState: {
                    status: 'error',
                    message: 'Download failed or was rejected by the server. Check ComfyUI terminal for details.',
                  },
                }
                : entry
            )));
            void refreshObjectInfoSnapshot();
            return;
          }
        }

        const nextProgress = Math.min(95, poller.lastProgress + 7);
        if (nextProgress !== poller.lastProgress) {
          poller.lastProgress = nextProgress;
        }

        setMissingModels((prev) => prev.map((entry) => {
          if (getMissingModelKey(entry) !== key) return entry;
          if (entry.downloadState.status !== 'downloading') return entry;
          return {
            ...entry,
            downloadState: {
              ...entry.downloadState,
              progress: nextProgress,
              lastProgressChange: entry.downloadState.lastProgressChange ?? poller.lastProgressChange,
            },
          };
        }));
      } catch (error) {
        console.warn('[ModelDownload] Poll error for', model.filename, error);
      }
    }, 5000);

    const timeoutId = window.setTimeout(() => {
      clearModelPoller(key);
      setMissingModels((prev) => prev.map((entry) => (
        getMissingModelKey(entry) === key && entry.downloadState.status === 'downloading'
          ? { ...entry, downloadState: { status: 'error', message: 'Timed out waiting for model to appear in /object_info' } }
          : entry
      )));
      void refreshObjectInfoSnapshot();
    }, 30 * 60 * 1000);

    const startedAt = Date.now();
    modelPollersRef.current.set(key, {
      intervalId,
      timeoutId,
      startedAt,
      lastProgress: 5,
      lastProgressChange: startedAt,
    });
  }, [
    comfyuiUrl,
    providerSettings?.civitaiApiKey,
    providerSettings?.huggingfaceApiKey,
    clearModelPoller,
    refreshObjectInfoSnapshot,
  ]);

  const handleDownloadAllModels = useCallback(() => {
    const readyModels = missingModels.filter((model) => model.downloadState.status === 'ready' && !!model.downloadInfo);
    for (const model of readyModels) {
      void handleDownloadModel(model);
    }
  }, [missingModels, handleDownloadModel]);

  const handleManualModelDownload = useCallback((model: MissingModel, url: string) => {
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      setMissingModels((prev) => prev.map((entry) => (
        getMissingModelKey(entry) === getMissingModelKey(model)
          ? { ...entry, downloadState: { status: 'error', message: 'Manual URL must start with http:// or https://' } }
          : entry
      )));
      return;
    }

    const manualInfo: ModelDownloadInfo = {
      url: trimmed,
      filename: model.filename,
      installPath: modelDownloadServiceRef.current?.getInstallPathForModelType(model.type) || 'models/checkpoints',
      source: 'manual',
    };

    const updatedModel: MissingModel = {
      ...model,
      downloadInfo: manualInfo,
      downloadUrl: trimmed,
      pageUrl: model.pageUrl,
      downloadState: { status: 'ready', info: manualInfo },
    };

    setMissingModels((prev) => prev.map((entry) => (
      getMissingModelKey(entry) === getMissingModelKey(model)
        ? updatedModel
        : entry
    )));

    void handleDownloadModel(updatedModel);
  }, [handleDownloadModel]);

  if (!workflow || !workflow.nodes?.length) {
    return (
      <div
        className="w-full h-full flex items-center justify-center bg-background relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary/40 rounded-none flex items-center justify-center backdrop-blur-sm">
            <div className="text-center space-y-3">
              <Upload className="w-10 h-10 text-primary mx-auto" />
              <p className="text-primary text-sm">Drop workflow JSON here</p>
            </div>
          </div>
        )}

        <div className="text-center space-y-2 max-w-md px-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/15">
            <svg className="w-8 h-8 text-primary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-muted-foreground text-sm">Workflow preview will appear here</p>
          <p className="text-text-muted text-xs mt-1">Describe a workflow in the chat to generate it</p>
          <p className="text-text-muted text-xs mt-2">
            or <span className="text-primary/70">drag &amp; drop</span> a workflow JSON file here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex">
      <div
        ref={containerRef}
        className="h-full flex-1 relative bg-background"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary/40 rounded-none flex items-center justify-center backdrop-blur-sm">
            <div className="text-center space-y-3">
              <Upload className="w-10 h-10 text-primary mx-auto" />
              <p className="text-primary text-sm">Drop to replace current workflow</p>
            </div>
          </div>
        )}

        {missingModels.length > 0 && (
          <div className={`absolute z-20 left-3 right-3 ${selectedNodeIds && selectedNodeIds.size > 0 ? 'top-14' : 'top-3'} pointer-events-auto`}>
            <MissingModelsPanel
              models={missingModels}
              onDownload={(model) => { void handleDownloadModel(model); }}
              onDownloadAll={handleDownloadAllModels}
              onRetry={(model) => { void handleDownloadModel(model); }}
              onManualDownload={handleManualModelDownload}
            />
          </div>
        )}

        {selectedNodeIds && selectedNodeIds.size > 0 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#7C6AEF]/[0.12] backdrop-blur-sm border border-[#7C6AEF]/30 text-[11px] text-[#E8E8E8]">
            <span>
              {selectedNodeIds.size} node{selectedNodeIds.size === 1 ? '' : 's'} selected
            </span>
            {selectedNodeSummary.length > 0 && (
              <span className="text-[#B4A9F4]">
                {selectedNodeSummary.join(', ')}
                {selectedNodeIds.size > selectedNodeSummary.length ? ' ...' : ''}
              </span>
            )}
            {onClearSelection && (
              <button
                onClick={onClearSelection}
                className="ml-1 px-1.5 py-0.5 rounded-sm bg-transparent border border-[#2A2A2A] hover:border-[#3A3A3A] text-[10px] text-[#888] hover:text-[#E8E8E8] transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}

        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesUpdatable={false}
          edgesFocusable={false}
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          selectionOnDrag={false}
          minZoom={perfTier === 'huge' ? 0.1 : 0.2}
          maxZoom={perfTier === 'huge' ? 1.5 : 4}
          defaultEdgeOptions={{
            type: 'graphWire',
            animated: false,
            style: { strokeWidth: 1.5, opacity: 0.6 },
          }}
          proOptions={{ hideAttribution: true }}
          style={{ background: isDark ? '#171717' : '#f8f8f8' }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color={isDark ? '#2e2e2e' : '#d4d4d4'}
          />
          {workflowStats && (
            <Panel position="top-left">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-200/80 backdrop-blur-sm border border-border text-content-secondary text-[11px]">
                  <span>{workflowStats.nodes} node{workflowStats.nodes !== 1 ? 's' : ''}</span>
                  <span className="text-content-faint">&middot;</span>
                  <span>{workflowStats.models} model{workflowStats.models !== 1 ? 's' : ''}</span>
                  <span className="text-content-faint">&middot;</span>
                  <span>{workflowStats.packs} pack{workflowStats.packs !== 1 ? 's' : ''}</span>
                </div>

                <button
                  onClick={onAutoLayout || handleSmartLayout}
                  title="Auto-layout nodes"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-200/80 backdrop-blur-sm border border-border text-content-secondary hover:text-content-primary hover:border-border-strong text-[11px] transition-colors"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Layout
                </button>
              </div>
            </Panel>
          )}
        </ReactFlow>

        {showOptimizer && workflow && objectInfo && providerSettings && (
          <ParameterOptimizerPanel
            workflow={workflow}
            objectInfo={objectInfo}
            liveObjectInfo={liveObjectInfo}
            providerSettings={providerSettings}
            architectureHint={architectureHint}
            onApplyChanges={handleApplyOptimization}
            onClose={() => setShowOptimizer(false)}
          />
        )}
      </div>

      {selectedNode && (
        <NodeParameterPanel
          node={selectedNode}
          schema={selectedSchema}
          workflow={workflow}
          comfyuiUrl={comfyuiUrl || ''}
          installedModels={installedModels || undefined}
          onWidgetValueChange={handleWidgetValueChange}
          onResetDefaults={handleResetDefaults}
          onClose={() => setSelectedNodeId(null)}
        />
      )}
    </div>
  );
}



