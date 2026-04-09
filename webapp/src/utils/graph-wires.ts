export type WireStyle = 'bezier' | 'straight' | 'step';

export const PORT_TYPE_COLORS: Record<string, string> = {
  MODEL: '#B39DDB',
  CONDITIONING: '#FFA931',
  LATENT: '#FF9CF9',
  IMAGE: '#64B5F6',
  MASK: '#81C784',
  VAE: '#FF6E6E',
  CLIP: '#FFD500',
  CONTROL_NET: '#00D78D',
  UPSCALE_MODEL: '#A5D6A7',
  BBOX_DETECTOR: '#FF8A65',
  SEGM_DETECTOR: '#F48FB1',
  DETAILER_PIPE: '#CE93D8',
  INT: '#A0A0A0',
  FLOAT: '#A0A0A0',
  STRING: '#A0A0A0',
  BOOLEAN: '#A0A0A0',
  '*': '#A0A0A0',
};

export function generateWirePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  style: WireStyle = 'bezier',
): string {
  switch (style) {
    case 'bezier': {
      const dx = Math.abs(x2 - x1);
      const controlOffset = Math.max(dx * 0.4, 30);
      return `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`;
    }
    case 'straight':
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    case 'step': {
      const midX = (x1 + x2) / 2;
      return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
    }
    default:
      return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
}

export function getWireColor(dataType?: string): string {
  if (!dataType) return PORT_TYPE_COLORS['*'];
  const type = dataType.toUpperCase();
  return PORT_TYPE_COLORS[type] || PORT_TYPE_COLORS['*'];
}
