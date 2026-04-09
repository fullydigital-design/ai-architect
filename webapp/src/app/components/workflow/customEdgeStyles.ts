import { Edge } from 'reactflow';
import { HANDLE_COLORS, DataType } from './types';
import { getNodeDefinition } from './nodeDefinitions';

// Get edge color based on connection data type
export function getEdgeStyle(edge: Edge, nodes: any[]): any {
  const sourceNode = nodes.find(n => n.id === edge.source);
  
  if (!sourceNode) {
    return {
      stroke: '#6b7280',
      strokeWidth: 2,
    };
  }

  const nodeDef = getNodeDefinition(sourceNode.type);
  if (!nodeDef) {
    return {
      stroke: '#6b7280',
      strokeWidth: 2,
    };
  }

  // Find the output handle to get its data type
  const outputHandle = nodeDef.handles.outputs.find(h => h.id === edge.sourceHandle);
  
  if (!outputHandle) {
    return {
      stroke: '#6b7280',
      strokeWidth: 2,
    };
  }

  // Return color based on data type
  return {
    stroke: HANDLE_COLORS[outputHandle.dataType],
    strokeWidth: 2,
  };
}

// Enhanced edge with gradient and animation
export const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  style: {
    strokeWidth: 2,
  },
};
