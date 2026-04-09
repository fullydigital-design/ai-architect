/**
 * Phase 11C - Operation-based modification few-shot examples.
 *
 * These examples are intentionally compact to keep prompt token usage low
 * while teaching the model how to emit operation arrays.
 */
export function getModificationExamples(): string {
  return `
=== WORKFLOW MODIFICATION EXAMPLES ===

EXAMPLE 1: "Add upscaling after final image"
Given: #6 VAEDecode -> #7 SaveImage
\`\`\`json
[
  {"op":"ADD_NODE","id":"50","class_type":"UpscaleModelLoader","widgets":{"model_name":"RealESRGAN_x4plus.pth"}},
  {"op":"INSERT_BETWEEN","new_class_type":"ImageUpscaleWithModel","source_id":"6","target_id":"7","via_type":"IMAGE"}
]
\`\`\`

EXAMPLE 2: "Change checkpoint"
\`\`\`json
[{"op":"SET_VALUE","node_id":"1","input_name":"ckpt_name","value":"dreamshaper_8.safetensors"}]
\`\`\`

EXAMPLE 3: "Remove upscaler and keep image flow"
\`\`\`json
[{"op":"BYPASS_NODE","id":"8","via_type":"IMAGE"}]
\`\`\`

EXAMPLE 4: "Insert LoRA loader"
\`\`\`json
[
  {"op":"ADD_NODE","id":"50","class_type":"LoraLoader","widgets":{"lora_name":"<lora>","strength_model":1,"strength_clip":1}},
  {"op":"CONNECT","source_id":"1","source_slot":0,"target_id":"50","target_input":"model"},
  {"op":"CONNECT","source_id":"1","source_slot":1,"target_id":"50","target_input":"clip"},
  {"op":"DISCONNECT","target_id":"5","target_input":"model"},
  {"op":"CONNECT","source_id":"50","source_slot":0,"target_id":"5","target_input":"model"},
  {"op":"DISCONNECT","target_id":"2","target_input":"clip"},
  {"op":"DISCONNECT","target_id":"3","target_input":"clip"},
  {"op":"CONNECT","source_id":"50","source_slot":1,"target_id":"2","target_input":"clip"},
  {"op":"CONNECT","source_id":"50","source_slot":1,"target_id":"3","target_input":"clip"}
]
\`\`\`

RULES:
- Output ONLY a JSON array of operations.
- Never output full workflow JSON in modify mode.
- New node IDs must be > max_id from summary.
- Prefer INSERT_BETWEEN/BYPASS_NODE for minimal diffs.
=== END EXAMPLES ===
`;
}

