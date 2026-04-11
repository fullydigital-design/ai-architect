export interface ParsedWorkflow {
  format: 'ui' | 'api' | 'unknown';
  nodeTypes: string[];
  nodeCount: number;
  nodeTypeCounts: Map<string, number>;
  /** Node types that the workflow itself declares as core via properties.cnr_id === "comfy-core" */
  coreNodeTypes: Set<string>;
  errors: string[];
  raw: unknown;
}

function pushNodeType(nodeType: string, nodeTypeCounts: Map<string, number>): void {
  const normalized = nodeType.trim();
  if (!normalized) return;
  nodeTypeCounts.set(normalized, (nodeTypeCounts.get(normalized) || 0) + 1);
}

function toParsedWorkflow(
  format: ParsedWorkflow['format'],
  nodeTypeCounts: Map<string, number>,
  nodeCount: number,
  errors: string[],
  raw: unknown,
  coreNodeTypes: Set<string> = new Set(),
): ParsedWorkflow {
  return {
    format,
    nodeTypes: [...nodeTypeCounts.keys()],
    nodeCount,
    nodeTypeCounts,
    coreNodeTypes,
    errors,
    raw,
  };
}

export function parseWorkflowJSON(jsonString: string): ParsedWorkflow {
  const errors: string[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parse error';
    return {
      format: 'unknown',
      nodeTypes: [],
      nodeCount: 0,
      nodeTypeCounts: new Map<string, number>(),
      errors: [`Invalid JSON: ${message}`],
      coreNodeTypes: new Set(),
      raw: null,
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      format: 'unknown',
      nodeTypes: [],
      nodeCount: 0,
      nodeTypeCounts: new Map<string, number>(),
      coreNodeTypes: new Set(),
      errors: ['Workflow JSON must be an object'],
      raw: parsed,
    };
  }

  const nodeTypeCounts = new Map<string, number>();
  const objectWorkflow = parsed as Record<string, unknown>;

  if (Array.isArray(objectWorkflow.nodes)) {
    const nodes = objectWorkflow.nodes as Array<Record<string, unknown>>;
    const coreNodeTypes = new Set<string>();
    for (const node of nodes) {
      const nodeType = typeof node?.type === 'string'
        ? node.type
        : typeof node?.class_type === 'string'
          ? node.class_type
          : '';
      if (!nodeType) {
        errors.push('Encountered UI node without "type" or "class_type"');
        continue;
      }
      pushNodeType(nodeType, nodeTypeCounts);
      // ComfyUI 0.7+ stamps core nodes with properties.cnr_id === "comfy-core"
      const props = node.properties as Record<string, unknown> | undefined;
      if (props?.cnr_id === 'comfy-core') {
        coreNodeTypes.add(nodeType);
      }
    }

    return toParsedWorkflow('ui', nodeTypeCounts, nodes.length, errors, parsed, coreNodeTypes);
  }

  const entries = Object.entries(objectWorkflow);
  const apiNodes = entries.filter(([key, value]) => {
    if (!/^\d+$/.test(key)) return false;
    if (!value || typeof value !== 'object') return false;
    const typed = value as Record<string, unknown>;
    return typeof typed.class_type === 'string' || typeof typed.type === 'string';
  });

  if (apiNodes.length > 0) {
    for (const [, value] of apiNodes) {
      const typed = value as Record<string, unknown>;
      const nodeType = typeof typed.class_type === 'string'
        ? typed.class_type
        : typeof typed.type === 'string'
          ? typed.type
          : '';
      if (!nodeType) {
        errors.push('Encountered API node without "class_type" or "type"');
        continue;
      }
      pushNodeType(nodeType, nodeTypeCounts);
    }

    return toParsedWorkflow('api', nodeTypeCounts, apiNodes.length, errors, parsed);
  }

  return {
    format: 'unknown',
    nodeTypes: [],
    nodeCount: 0,
    nodeTypeCounts: new Map<string, number>(),
    coreNodeTypes: new Set(),
    errors: ['Could not detect supported workflow format'],
    raw: parsed,
  };
}

export function parseWorkflowFile(file: File): Promise<ParsedWorkflow> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = String(event.target?.result ?? '');
        resolve(parseWorkflowJSON(text));
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to parse workflow file'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
