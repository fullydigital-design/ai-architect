import { CustomNode } from './CustomNode';
import { ApiKeyNode } from './nodes/ApiKeyNode';
import { GeminiFullNode } from './nodes/GeminiFullNode';
import { NanoBananaFullNode } from './nodes/NanoBananaFullNode';
import { VeoFullNode } from './nodes/VeoFullNode';
import { TextDisplayNode } from './nodes/TextDisplayNode';

// Register all node types with ReactFlow
export const workflowNodeTypes = {
  // Setup nodes
  apiKey: ApiKeyNode,
  
  // Full-featured nodes (with all controls)
  geminiFull: GeminiFullNode,
  nanoBananaFull: NanoBananaFullNode,
  veoFull: VeoFullNode,
  
  // Compact nodes (minimal display)
  textPrompt: CustomNode,
  imageUpload: CustomNode,
  styleReference: CustomNode,
  
  // AI Model nodes (compact)
  gemini: CustomNode,
  nanoBanana: CustomNode,
  veo: CustomNode,
  
  // Output nodes
  textDisplay: TextDisplayNode,
  imagePreview: CustomNode,
  videoPreview: CustomNode,
  download: CustomNode,
};