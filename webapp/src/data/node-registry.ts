import type { NodeSchema } from '../types/comfyui';
import { CORE_NODES } from './core-nodes';
import { CUSTOM_NODES } from './custom-nodes';

const ALL_NODES: NodeSchema[] = [...CORE_NODES, ...CUSTOM_NODES];

export const NODE_REGISTRY = new Map<string, NodeSchema>(
  ALL_NODES.map(n => [n.name, n])
);

export function getNodeSchema(name: string): NodeSchema | undefined {
  return NODE_REGISTRY.get(name);
}

export function searchNodes(query: string, category?: string): NodeSchema[] {
  const q = query.toLowerCase();
  return ALL_NODES.filter(n => {
    const matchesQuery = !query || 
      n.name.toLowerCase().includes(q) ||
      n.displayName.toLowerCase().includes(q) ||
      n.description.toLowerCase().includes(q) ||
      n.category.toLowerCase().includes(q);
    const matchesCategory = !category || n.category === category;
    return matchesQuery && matchesCategory;
  });
}

export function getCategories(): string[] {
  const cats = new Set(ALL_NODES.map(n => n.category));
  return Array.from(cats).sort();
}

export function getNodesByCategory(): Record<string, NodeSchema[]> {
  const result: Record<string, NodeSchema[]> = {};
  for (const node of ALL_NODES) {
    if (!result[node.category]) result[node.category] = [];
    result[node.category].push(node);
  }
  return result;
}

export { ALL_NODES };
