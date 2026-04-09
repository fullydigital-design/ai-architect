import type { ComfyUIWorkflow } from '../types/comfyui';
import { NODE_REGISTRY } from '../data/node-registry';
import { getLiveNodeCache } from './comfyui-backend';

const MODEL_FILE_OPTION_RE = /\.(safetensors|ckpt|pt|pth|bin|onnx)$/i;

export function sanitizeWorkflow(workflow: ComfyUIWorkflow): { sanitized: ComfyUIWorkflow; fixes: string[] } {
  const sanitized = structuredClone(workflow);
  const fixes: string[] = [];
  const liveCache = getLiveNodeCache();

  for (const node of sanitized.nodes) {
    const liveSchema = liveCache?.nodes?.[node.type];
    const staticSchema = NODE_REGISTRY.get(node.type);
    const schema = liveSchema || staticSchema;
    const hasExactSchema = Boolean(schema);
    if (!hasExactSchema) continue;
    if (!Array.isArray(node.widgets_values) || node.widgets_values.length === 0) continue;

    const widgetInputs = (schema.inputs || []).filter((input) => input.isWidget);
    for (let idx = 0; idx < widgetInputs.length; idx += 1) {
      if (idx >= node.widgets_values.length) break;

      const widget = widgetInputs[idx];
      const value = node.widgets_values[idx];
      if (value === undefined) continue;

      if (widget.type === 'COMBO' && Array.isArray(widget.options) && widget.options.length > 0) {
        const options = widget.options.map((option) => String(option));
        const hasExactOption = options.includes(String(value));
        const isModelCombo = options.some((option) => MODEL_FILE_OPTION_RE.test(option));

        if (!hasExactOption && !isModelCombo && typeof value === 'string') {
          const lowerValue = value.toLowerCase();

          const caseInsensitiveMatch = options.find((option) => option.toLowerCase() === lowerValue);
          if (caseInsensitiveMatch) {
            node.widgets_values[idx] = caseInsensitiveMatch;
            fixes.push(`Fixed "${widget.name}" on ${node.type}: "${value}" -> "${caseInsensitiveMatch}" (case-insensitive match)`);
          } else {
            const substringMatch = options.find((option) => {
              const lowerOption = option.toLowerCase();
              return lowerValue.includes(lowerOption) || lowerOption.includes(lowerValue);
            });
            if (substringMatch) {
              node.widgets_values[idx] = substringMatch;
              fixes.push(`Fixed "${widget.name}" on ${node.type}: "${value}" -> "${substringMatch}" (substring match)`);
            }
          }
        }
      }

      if (typeof value === 'number' && Number.isFinite(value)) {
        if (typeof widget.min === 'number' && value < widget.min) {
          node.widgets_values[idx] = widget.min;
          fixes.push(`Clamped "${widget.name}" on ${node.type}: ${value} -> ${widget.min} (below minimum)`);
          continue;
        }
        if (typeof widget.max === 'number' && value > widget.max) {
          node.widgets_values[idx] = widget.max;
          fixes.push(`Clamped "${widget.name}" on ${node.type}: ${value} -> ${widget.max} (above maximum)`);
        }
      }
    }
  }

  return { sanitized, fixes };
}
