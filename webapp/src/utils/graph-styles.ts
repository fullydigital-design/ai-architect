export function getNodeCategoryColor(classType: string): {
  border: string;
  header: string;
  headerText: string;
} {
  const type = classType.toLowerCase();

  if (type.includes('loader') || type.includes('load')) {
    return { border: '#3b82f6', header: '#1e3a5f', headerText: '#93c5fd' };
  }

  if (type.includes('sampler') || type.includes('ksampler')) {
    return { border: '#8b5cf6', header: '#3b1f6e', headerText: '#c4b5fd' };
  }

  if (type.includes('clip') || type.includes('conditioning') || type.includes('prompt') || type.includes('encode')) {
    return { border: '#22c55e', header: '#14532d', headerText: '#86efac' };
  }

  if (type.includes('vae') || type.includes('decode')) {
    return { border: '#ef4444', header: '#5c1616', headerText: '#fca5a5' };
  }

  if (type.includes('save') || type.includes('preview') || type.includes('output')) {
    return { border: '#f59e0b', header: '#5c3a0e', headerText: '#fcd34d' };
  }

  if (type.includes('latent') || type.includes('empty')) {
    return { border: '#ec4899', header: '#5c1638', headerText: '#f9a8d4' };
  }

  if (type.includes('controlnet') || type.includes('control')) {
    return { border: '#14b8a6', header: '#134e4a', headerText: '#5eead4' };
  }

  if (type.includes('lora')) {
    return { border: '#06b6d4', header: '#164e63', headerText: '#67e8f9' };
  }

  return { border: '#6b7280', header: '#1f2937', headerText: '#d1d5db' };
}
