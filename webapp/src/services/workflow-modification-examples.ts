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

EXAMPLE 5: "Add FaceDetailer after VAEDecode (multi-input integration)"
Given: #1 CheckpointLoaderSimple, #2 CLIPTextEncode (positive), #3 CLIPTextEncode (negative),
#6 VAEDecode, #7 SaveImage. Every required input on FaceDetailer MUST be wired,
including a detector source.
\`\`\`json
[
  {"op":"ADD_NODE","id":"50","class_type":"UltralyticsDetectorProvider","widgets":{"model_name":"bbox/face_yolov8m.pt"}},
  {"op":"ADD_NODE","id":"51","class_type":"FaceDetailer","widgets":{"guide_size":384,"steps":20,"cfg":3.5,"sampler_name":"euler","scheduler":"normal","denoise":0.4,"feather":5,"bbox_threshold":0.5,"bbox_dilation":10,"bbox_crop_factor":3,"force_inpaint":true,"noise_mask":true,"seed":156680208700286}},
  {"op":"DISCONNECT","target_id":"7","target_input":"images"},
  {"op":"CONNECT","source_id":"6","source_slot":0,"target_id":"51","target_input":"image"},
  {"op":"CONNECT","source_id":"1","source_slot":0,"target_id":"51","target_input":"model"},
  {"op":"CONNECT","source_id":"1","source_slot":1,"target_id":"51","target_input":"clip"},
  {"op":"CONNECT","source_id":"1","source_slot":2,"target_id":"51","target_input":"vae"},
  {"op":"CONNECT","source_id":"2","source_slot":0,"target_id":"51","target_input":"positive"},
  {"op":"CONNECT","source_id":"3","source_slot":0,"target_id":"51","target_input":"negative"},
  {"op":"CONNECT","source_id":"50","source_slot":0,"target_id":"51","target_input":"bbox_detector"},
  {"op":"CONNECT","source_id":"51","source_slot":0,"target_id":"7","target_input":"images"}
]
\`\`\`

EXAMPLE 6: "Add IPAdapter chain between checkpoint and KSampler"
Given: #1 CheckpointLoaderSimple, #5 KSampler, image reference will be loaded too.
The IPAdapter modifies the MODEL stream — the OLD model->KSampler wire must be
DISCONNECTED and the new model output from IPAdapter Advanced must take its place.
\`\`\`json
[
  {"op":"ADD_NODE","id":"50","class_type":"IPAdapterUnifiedLoader","widgets":{"preset":"PLUS (high strength)"}},
  {"op":"ADD_NODE","id":"51","class_type":"IPAdapterAdvanced","widgets":{"weight":0.8,"weight_type":"standard","start_at":0,"end_at":1}},
  {"op":"ADD_NODE","id":"52","class_type":"LoadImage","widgets":{"image":"reference.png"}},
  {"op":"CONNECT","source_id":"1","source_slot":0,"target_id":"50","target_input":"model"},
  {"op":"CONNECT","source_id":"50","source_slot":0,"target_id":"51","target_input":"model"},
  {"op":"CONNECT","source_id":"50","source_slot":1,"target_id":"51","target_input":"ipadapter"},
  {"op":"CONNECT","source_id":"52","source_slot":0,"target_id":"51","target_input":"image"},
  {"op":"DISCONNECT","target_id":"5","target_input":"model"},
  {"op":"CONNECT","source_id":"51","source_slot":0,"target_id":"5","target_input":"model"}
]
\`\`\`

WIRING DISCIPLINE — read before you emit any operation:
1. Every ADD_NODE for a node with required connection inputs MUST be followed by
   CONNECT operations for ALL of them. Orphan nodes = broken workflow.
2. If your new node sits in the middle of an existing chain (IPAdapter on the
   model stream, FaceDetailer on the image stream), you MUST DISCONNECT the
   downstream consumer's old input and CONNECT the new node's output there.
3. If a required input has no obvious source in the existing graph (e.g.
   FaceDetailer.bbox_detector, IPAdapter.image), ADD a loader/source node for
   it and CONNECT it. Do not skip the input.
4. Self-check before closing the JSON array: for each ADD_NODE, list its required
   inputs from the schema. Confirm each one has a CONNECT op targeting it.

RULES:
- Output ONLY a JSON array of operations.
- Never output full workflow JSON in modify mode.
- New node IDs must be > max_id from summary.
- Prefer INSERT_BETWEEN/BYPASS_NODE for minimal diffs.
=== END EXAMPLES ===
`;
}

