/**
 * Node Schema Resolver
 * Maps ComfyUI node types to widget/link/output definitions from /object_info.
 */
import { NODE_REGISTRY } from '../data/node-registry';

export type WidgetType = 'INT' | 'FLOAT' | 'STRING' | 'BOOLEAN' | 'COMBO';

export interface WidgetDefinition {
  name: string;
  type: WidgetType;
  default?: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  multiline?: boolean;
  placeholder?: string;
  tooltip?: string;
  widgetIndex: number;
}

export interface ResolvedNodeSchema {
  nodeType: string;
  displayName: string;
  category: string;
  widgets: WidgetDefinition[];
  linkInputs: { name: string; type: string }[];
  outputs: { name: string; type: string }[];
}

interface ParsedInputSpec {
  isWidget: boolean;
  widget?: WidgetDefinition;
  linkType?: string;
  consumesCompanionWidget?: boolean;
}

function toWidgetTypeFromStatic(type: string, hasOptions: boolean): WidgetType {
  if (hasOptions) return 'COMBO';
  const upper = String(type || '').toUpperCase();
  if (upper === 'INT') return 'INT';
  if (upper === 'FLOAT') return 'FLOAT';
  if (upper === 'BOOLEAN') return 'BOOLEAN';
  return 'STRING';
}

function parseInputSpec(
  name: string,
  spec: any[],
  widgetIndex: number,
): ParsedInputSpec {
  if (!Array.isArray(spec) || spec.length === 0) {
    return { isWidget: false, linkType: 'UNKNOWN' };
  }

  const typeOrOptions = spec[0];
  const config = (typeof spec[1] === 'object' && spec[1] !== null) ? spec[1] : {};
  const consumesCompanionWidget = config.control_after_generate === true
    || config.image_upload === true
    || config.upload === true;

  if (Array.isArray(typeOrOptions)) {
    return {
      isWidget: true,
      consumesCompanionWidget,
      widget: {
        name,
        type: 'COMBO',
        options: typeOrOptions.map(String),
        default: config.default ?? typeOrOptions[0],
        tooltip: config.tooltip,
        widgetIndex,
      },
    };
  }

  if (typeof typeOrOptions === 'string') {
    const upper = typeOrOptions.toUpperCase();

    if (upper === 'INT') {
      return {
        isWidget: true,
        consumesCompanionWidget,
        widget: {
          name,
          type: 'INT',
          default: config.default,
          min: config.min,
          max: config.max,
          step: config.step ?? 1,
          tooltip: config.tooltip,
          widgetIndex,
        },
      };
    }

    if (upper === 'FLOAT') {
      return {
        isWidget: true,
        consumesCompanionWidget,
        widget: {
          name,
          type: 'FLOAT',
          default: config.default,
          min: config.min,
          max: config.max,
          step: config.step ?? 0.01,
          tooltip: config.tooltip,
          widgetIndex,
        },
      };
    }

    if (upper === 'STRING') {
      return {
        isWidget: true,
        consumesCompanionWidget,
        widget: {
          name,
          type: 'STRING',
          default: config.default ?? '',
          multiline: config.multiline ?? false,
          placeholder: config.placeholder,
          tooltip: config.tooltip,
          widgetIndex,
        },
      };
    }

    if (upper === 'BOOLEAN') {
      return {
        isWidget: true,
        consumesCompanionWidget,
        widget: {
          name,
          type: 'BOOLEAN',
          default: config.default ?? false,
          tooltip: config.tooltip,
          widgetIndex,
        },
      };
    }

    return { isWidget: false, linkType: typeOrOptions };
  }

  return { isWidget: false, linkType: 'UNKNOWN' };
}

export function resolveNodeSchema(
  nodeType: string,
  objectInfo: Record<string, any>,
): ResolvedNodeSchema | null {
  const info = objectInfo[nodeType];
  if (!info) {
    const staticSchema = NODE_REGISTRY.get(nodeType);
    if (!staticSchema) return null;

    const widgets: WidgetDefinition[] = [];
    const linkInputs: { name: string; type: string }[] = [];
    let widgetIndex = 0;

    for (const input of staticSchema.inputs) {
      if (input.isWidget) {
        const isNoteText = nodeType === 'Note' && input.name === 'text';
        widgets.push({
          name: input.name,
          type: toWidgetTypeFromStatic(input.type, Array.isArray(input.options) && input.options.length > 0),
          default: input.default,
          min: input.min,
          max: input.max,
          options: input.options,
          tooltip: input.tooltip,
          multiline: isNoteText || input.name === 'text',
          widgetIndex,
        });
        widgetIndex += 1;
      } else {
        linkInputs.push({ name: input.name, type: input.type });
      }
    }

    return {
      nodeType,
      displayName: staticSchema.displayName || nodeType,
      category: staticSchema.category || 'unknown',
      widgets,
      linkInputs,
      outputs: staticSchema.outputs.map((output) => ({
        name: output.name,
        type: output.type,
      })),
    };
  }

  const widgets: WidgetDefinition[] = [];
  const linkInputs: { name: string; type: string }[] = [];
  let widgetIndex = 0;

  const required = info.input?.required || {};
  for (const [name, spec] of Object.entries(required)) {
    const parsed = parseInputSpec(name, spec as any[], widgetIndex);
    if (parsed.isWidget && parsed.widget) {
      widgets.push(parsed.widget);
      widgetIndex += parsed.consumesCompanionWidget ? 2 : 1;
    } else {
      linkInputs.push({ name, type: parsed.linkType || 'UNKNOWN' });
    }
  }

  const optional = info.input?.optional || {};
  for (const [name, spec] of Object.entries(optional)) {
    const parsed = parseInputSpec(name, spec as any[], widgetIndex);
    if (parsed.isWidget && parsed.widget) {
      widgets.push(parsed.widget);
      widgetIndex += parsed.consumesCompanionWidget ? 2 : 1;
    } else {
      linkInputs.push({ name, type: parsed.linkType || 'UNKNOWN' });
    }
  }

  const outputs: { name: string; type: string }[] = [];
  const outputTypes = Array.isArray(info.output) ? info.output : [];
  const outputNames = Array.isArray(info.output_name) ? info.output_name : outputTypes;
  for (let index = 0; index < outputTypes.length; index += 1) {
    outputs.push({
      name: outputNames[index] || outputTypes[index],
      type: outputTypes[index],
    });
  }

  return {
    nodeType,
    displayName: info.display_name || info.name || nodeType,
    category: info.category || 'unknown',
    widgets,
    linkInputs,
    outputs,
  };
}

export function getCurrentWidgetValues(
  widgetsValues: any[] | undefined,
  schema: ResolvedNodeSchema,
): Map<string, any> {
  const values = new Map<string, any>();
  for (const widget of schema.widgets) {
    const value = widgetsValues?.[widget.widgetIndex];
    values.set(widget.name, value ?? widget.default);
  }
  return values;
}
