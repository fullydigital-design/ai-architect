#!/usr/bin/env python3
"""
Directly queries ComfyUI /object_info to diagnose model discovery.
"""
import requests
import json
import os
import subprocess

COMFYUI_URL = os.environ.get("COMFYUI_URL", "http://127.0.0.1:8188")
COMFYUI_ROOT = os.environ.get("COMFYUI_ROOT", r"C:\_AI\ComfyUI_V81\ComfyUI")

print("=" * 60)
print("COMFYUI MODEL DIAGNOSTIC")
print("=" * 60)

# 1. Check /object_info for loader nodes
print("\n--- /object_info loader node analysis ---")
try:
    resp = requests.get(f"{COMFYUI_URL}/object_info", timeout=30)
    data = resp.json()
    print(f"Total nodes in /object_info: {len(data)}")

    # Check specific loader nodes
    LOADERS = [
        ("CheckpointLoaderSimple", "ckpt_name"),
        ("CheckpointLoader", "ckpt_name"),
        ("LoraLoader", "lora_name"),
        ("LoraLoaderModelOnly", "lora_name"),
        ("VAELoader", "vae_name"),
        ("ControlNetLoader", "control_net_name"),
        ("UNETLoader", "unet_name"),
        ("CLIPLoader", "clip_name"),
        ("DualCLIPLoader", "clip_name1"),
        ("UpscaleModelLoader", "model_name"),
        ("CLIPVisionLoader", "clip_name"),
    ]

    for node_type, input_name in LOADERS:
        if node_type in data:
            node = data[node_type]
            req = node.get("input", {}).get("required", {})
            opt = node.get("input", {}).get("optional", {})

            input_def = req.get(input_name) or opt.get(input_name)

            if input_def is None:
                # Maybe the input name is different — list all inputs
                all_inputs = list(req.keys()) + list(opt.keys())
                print(f"\n  {node_type}: input '{input_name}' NOT FOUND")
                print(f"    Available inputs: {all_inputs}")
                # Print raw required inputs for debugging
                print(f"    Raw required: {json.dumps(req, indent=6)[:500]}")
            elif isinstance(input_def, list):
                if len(input_def) > 0 and isinstance(input_def[0], list):
                    values = input_def[0]
                    print(f"\n  {node_type}.{input_name}: {len(values)} values")
                    for v in values[:5]:
                        print(f"    - {v}")
                    if len(values) > 5:
                        print(f"    ... and {len(values) - 5} more")
                elif len(input_def) > 0 and isinstance(input_def[0], str):
                    # It's a type reference like ["MODEL"]
                    print(f"\n  {node_type}.{input_name}: type reference = {input_def}")
                else:
                    print(f"\n  {node_type}.{input_name}: unexpected format = {json.dumps(input_def)[:200]}")
            else:
                print(f"\n  {node_type}.{input_name}: unexpected type = {type(input_def).__name__}: {str(input_def)[:200]}")
        else:
            print(f"\n  {node_type}: NOT in /object_info")

except Exception as e:
    print(f"ERROR querying /object_info: {e}")

# 2. Check filesystem for models
print("\n\n--- Filesystem model search ---")
print(f"COMFYUI_ROOT = {COMFYUI_ROOT}")

models_dir = os.path.join(COMFYUI_ROOT, "models")
print(f"\nChecking: {models_dir}")
if os.path.isdir(models_dir):
    print("  EXISTS ✓")
    for item in sorted(os.listdir(models_dir)):
        full = os.path.join(models_dir, item)
        if os.path.isdir(full):
            # Count model files in this subdirectory
            count = 0
            for root, dirs, files in os.walk(full):
                for f in files:
                    if f.endswith(('.safetensors', '.ckpt', '.pt', '.pth', '.bin', '.onnx', '.gguf')):
                        count += 1
            print(f"  {item}/: {count} model files")
        else:
            print(f"  {item} (file)")
else:
    print("  DOES NOT EXIST ✗")

custom_nodes_dir = os.path.join(COMFYUI_ROOT, "custom_nodes")
print(f"\nChecking: {custom_nodes_dir}")
if os.path.isdir(custom_nodes_dir):
    dirs = [d for d in os.listdir(custom_nodes_dir) if os.path.isdir(os.path.join(custom_nodes_dir, d))]
    print(f"  EXISTS ✓ — {len(dirs)} directories")
    for d in sorted(dirs)[:20]:
        print(f"    - {d}")
    if len(dirs) > 20:
        print(f"    ... and {len(dirs) - 20} more")
else:
    print("  DOES NOT EXIST ✗")

# 3. Search for .safetensors files in common locations
print("\n\n--- Searching for .safetensors files ---")
search_roots = [
    r"C:\_AI",
    r"C:\_AI\_ComfyUI",
    r"D:\models" if os.path.isdir(r"D:\models") else None,
    r"D:\AI" if os.path.isdir(r"D:\AI") else None,
]

for search_root in search_roots:
    if search_root is None:
        continue
    if not os.path.isdir(search_root):
        print(f"\n  {search_root}: does not exist")
        continue
    print(f"\n  Searching {search_root} for .safetensors files...")
    found = []
    try:
        for root, dirs, files in os.walk(search_root):
            # Skip venv, __pycache__, .git
            dirs[:] = [d for d in dirs if d not in ('venv', '__pycache__', '.git', 'node_modules', '.venv')]
            for f in files:
                if f.endswith('.safetensors'):
                    rel = os.path.relpath(os.path.join(root, f), search_root)
                    size_mb = os.path.getsize(os.path.join(root, f)) / (1024 * 1024)
                    found.append((rel, size_mb))
            # Stop after finding 50 to keep output manageable
            if len(found) >= 50:
                break
    except PermissionError:
        pass

    if found:
        print(f"  Found {len(found)} .safetensors files:")
        for path, size in found[:30]:
            print(f"    {path} ({size:.1f} MB)")
        if len(found) > 30:
            print(f"    ... and {len(found) - 30} more")
    else:
        print(f"  No .safetensors files found")

# 4. Check ComfyUI's launch config for any custom paths
print("\n\n--- Checking ComfyUI launch configuration ---")
launch_bat = r"C:\_AI\start-fullydigital.bat"
if os.path.isfile(launch_bat):
    print(f"  Found: {launch_bat}")
    with open(launch_bat, 'r') as f:
        content = f.read()
    print(f"  Contents:\n{content}")
else:
    print(f"  {launch_bat}: not found")
    # Search for other bat files
    for root_dir in [r"C:\_AI", r"C:\_AI\_ComfyUI"]:
        if os.path.isdir(root_dir):
            for f in os.listdir(root_dir):
                if f.endswith('.bat'):
                    bat_path = os.path.join(root_dir, f)
                    print(f"\n  Found: {bat_path}")
                    with open(bat_path, 'r') as fh:
                        print(f"  Contents:\n{fh.read()[:500]}")

# 5. Check ComfyUI's folder_paths at runtime
print("\n\n--- Querying ComfyUI internal paths (if available) ---")
# Some ComfyUI versions expose /internal/folder_paths or similar
for endpoint in ["/internal/folder_paths", "/api/folder_paths", "/folder_paths"]:
    try:
        resp = requests.get(f"{COMFYUI_URL}{endpoint}", timeout=5)
        if resp.status_code == 200:
            print(f"  {endpoint}: {json.dumps(resp.json(), indent=4)[:1000]}")
            break
    except:
        pass
else:
    print("  No folder_paths endpoint found (normal for most versions)")

print("\n" + "=" * 60)
print("DIAGNOSTIC COMPLETE")
print("=" * 60)
print("\nPaste this ENTIRE output back so we can determine:")
print("  1. Whether ComfyUI sees models in /object_info dropdowns")
print("  2. Where model files actually are on disk")
print("  3. What needs to be configured")
