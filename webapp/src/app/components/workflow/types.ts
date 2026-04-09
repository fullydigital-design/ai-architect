// Data types that can flow between nodes
export enum DataType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  STYLE = 'style',
  PARAMETERS = 'params',
  ANY = 'any',
}

// Node categories
export enum NodeCategory {
  INPUT = 'input',
  MODEL = 'model',
  PROCESSING = 'processing',
  OUTPUT = 'output',
}

// API providers
export enum Provider {
  GOOGLE = 'google',
  FLUX = 'flux',
  KLING = 'kling',
  COMFYUI = 'comfyui',
}

// Handle configuration
export interface HandleConfig {
  id: string;
  type: 'source' | 'target';
  dataType: DataType;
  label?: string;
}

// Node definition for library
export interface NodeDefinition {
  id: string;
  type: string;
  label: string;
  description: string;
  category: NodeCategory;
  provider: Provider;
  icon: any;
  color: string;
  gradient: string;
  handles: {
    inputs: HandleConfig[];
    outputs: HandleConfig[];
  };
  configurable: boolean;
  config?: {
    [key: string]: any;
  };
}

// Handle colors by data type
export const HANDLE_COLORS: Record<DataType, string> = {
  [DataType.TEXT]: '#a855f7',      // Purple
  [DataType.IMAGE]: '#ec4899',     // Pink
  [DataType.VIDEO]: '#3b82f6',     // Blue
  [DataType.STYLE]: '#eab308',     // Yellow
  [DataType.PARAMETERS]: '#10b981', // Green
  [DataType.ANY]: '#6b7280',       // Gray
};

// Helper to check if connection is valid
export function isValidConnection(
  sourceType: DataType,
  targetType: DataType
): boolean {
  // ANY type can connect to anything
  if (sourceType === DataType.ANY || targetType === DataType.ANY) {
    return true;
  }
  
  // Same types can connect
  return sourceType === targetType;
}

// Get error message for invalid connection
export function getConnectionError(
  sourceType: DataType,
  targetType: DataType,
  sourceLabel: string,
  targetLabel: string
): string {
  if (sourceType === DataType.ANY || targetType === DataType.ANY) {
    return '';
  }
  
  // Provide helpful suggestions
  const suggestions: Record<DataType, string> = {
    [DataType.TEXT]: 'Try connecting to: Gemini, Nano Banana, or Veo nodes',
    [DataType.IMAGE]: 'Try connecting to: Image Preview, Download, or Nano Banana (style input)',
    [DataType.VIDEO]: 'Try connecting to: Video Preview or Download',
    [DataType.STYLE]: 'Try connecting to: Nano Banana (style input)',
    [DataType.PARAMETERS]: 'Try connecting to: AI model parameter inputs',
    [DataType.ANY]: '',
  };

  return `Cannot connect ${sourceLabel} (outputs ${sourceType}) to ${targetLabel} (requires ${targetType}). ${suggestions[sourceType] || ''}`;
}