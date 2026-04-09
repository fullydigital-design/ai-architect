#!/usr/bin/env python3
import ast
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    import requests
except Exception:
    requests = None


COMFYUI_URL = os.environ.get("COMFYUI_URL", "http://127.0.0.1:8188").rstrip("/")
COMFYUI_ROOT = Path(os.environ.get("COMFYUI_ROOT", r"C:\_AI\ComfyUI_V81\ComfyUI"))
WORKFLOWS_ROOT = Path(os.environ.get("WORKFLOWS_ROOT", r"C:\_AI\_ComfyUI_Architect\workflows"))
HTTP_TIMEOUT = 10

OBJECT_INFO_CACHE: Optional[Dict[str, Any]] = None
MODEL_PATH_SET_CACHE: Optional[set] = None

MODEL_CATEGORIES = [
    "checkpoints",
    "loras",
    "vae",
    "controlnet",
    "upscale_models",
    "embeddings",
    "clip",
    "unet",
    "diffusion_models",
    "clip_vision",
    "style_models",
    "hypernetworks",
    "photomaker",
    "ipadapter",
    "insightface",
    "ultralytics",
    "sams",
    "grounding-dino",
    "luts",
]

MODEL_EXTENSIONS = {".safetensors", ".ckpt", ".pt", ".pth", ".bin", ".onnx", ".gguf"}

OBJECT_INFO_MODEL_MAP = {
    "CheckpointLoaderSimple": {"ckpt_name": "checkpoints"},
    "CheckpointLoader": {"ckpt_name": "checkpoints"},
    "UNETLoader": {"unet_name": "unet"},
    "LoraLoader": {"lora_name": "loras"},
    "LoraLoaderModelOnly": {"lora_name": "loras"},
    "VAELoader": {"vae_name": "vae"},
    "ControlNetLoader": {"control_net_name": "controlnet"},
    "UpscaleModelLoader": {"model_name": "upscale_models"},
    "CLIPLoader": {"clip_name": "clip"},
    "DualCLIPLoader": {"clip_name1": "clip", "clip_name2": "clip"},
    "CLIPVisionLoader": {"clip_name": "clip_vision"},
    "PhotoMakerLoader": {"photomaker_model_name": "photomaker"},
    "IPAdapterModelLoader": {"ipadapter_file": "ipadapter"},
}

NODE_MODEL_MAP = {
    "CheckpointLoaderSimple": {"ckpt_name": "checkpoints"},
    "CheckpointLoader": {"ckpt_name": "checkpoints"},
    "LoraLoader": {"lora_name": "loras"},
    "LoraLoaderModelOnly": {"lora_name": "loras"},
    "VAELoader": {"vae_name": "vaes"},
    "ControlNetLoader": {"control_net_name": "controlnets"},
    "UpscaleModelLoader": {"model_name": "upscale_models"},
    "CLIPLoader": {"clip_name": "clips"},
    "DualCLIPLoader": {"clip_name1": "clips", "clip_name2": "clips"},
    "UNETLoader": {"unet_name": "unets"},
    "CLIPVisionLoader": {"clip_name": "clip_vision"},
    "StyleModelLoader": {"style_model_name": "style_models"},
    "GLIGENLoader": {"gligen_name": "gligen"},
    "HypernetworkLoader": {"hypernetwork_name": "hypernetworks"},
}


def log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def now_iso() -> str:
    return datetime.now().isoformat()


def _normalize_rel(path: Path) -> str:
    return path.as_posix()


def _http_get(path: str) -> Tuple[bool, Any]:
    if requests is None:
        return False, "Python package 'requests' is not installed."
    url = f"{COMFYUI_URL}{path}"
    try:
        r = requests.get(url, timeout=HTTP_TIMEOUT)
        r.raise_for_status()
        return True, r.json()
    except Exception as e:
        return False, str(e)


def _http_post(path: str, payload: Dict[str, Any]) -> Tuple[bool, Any]:
    if requests is None:
        return False, "Python package 'requests' is not installed."
    url = f"{COMFYUI_URL}{path}"
    try:
        r = requests.post(url, json=payload, timeout=HTTP_TIMEOUT)
        if r.status_code >= 400:
            txt = r.text.strip()
            return False, txt or f"HTTP {r.status_code}"
        return True, r.json()
    except Exception as e:
        return False, str(e)


def get_object_info(force_refresh: bool = False) -> Tuple[bool, Any]:
    global OBJECT_INFO_CACHE
    if OBJECT_INFO_CACHE is not None and not force_refresh:
        return True, OBJECT_INFO_CACHE
    ok, data = _http_get("/object_info")
    if ok:
        OBJECT_INFO_CACHE = data
    return ok, data


def _is_hidden_dir(path: Path) -> bool:
    name = path.name
    return name.startswith(".") or name == "__pycache__"


def _scan_category(category: str) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    cat_dir = COMFYUI_ROOT / "models" / category
    if not cat_dir.exists() or not cat_dir.is_dir():
        return out

    for root, dirs, files in os.walk(cat_dir):
        root_path = Path(root)
        dirs[:] = [d for d in dirs if not _is_hidden_dir(root_path / d)]
        for fn in files:
            p = root_path / fn
            if p.suffix.lower() not in MODEL_EXTENSIONS:
                continue
            try:
                rel = p.relative_to(cat_dir)
                stat = p.stat()
                out.append(
                    {
                        "name": p.name,
                        "path": _normalize_rel(rel),
                        "size_mb": round(stat.st_size / (1024 * 1024), 1),
                        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    }
                )
            except Exception:
                continue
    out.sort(key=lambda x: x["path"].lower())
    return out


def scan_models_impl(category: Optional[str] = None) -> Dict[str, Any]:
    result: Dict[str, Any] = {}
    cats = MODEL_CATEGORIES
    if category:
        if category not in MODEL_CATEGORIES:
            return {"error": f"Unknown category '{category}'. Valid categories: {MODEL_CATEGORIES}"}
        cats = [category]
    for cat in cats:
        result[cat] = _scan_category(cat)
    # Fallback: if disk scan is empty, extract model names from /object_info dropdowns.
    if sum(len(result.get(cat, [])) for cat in cats) == 0:
        fallback = _scan_models_from_object_info(cats)
        for cat in cats:
            if not result.get(cat):
                result[cat] = fallback.get(cat, [])
    return result


def _scan_models_from_object_info(categories: List[str]) -> Dict[str, List[Dict[str, Any]]]:
    out: Dict[str, List[Dict[str, Any]]] = {c: [] for c in categories}
    ok, obj = get_object_info()
    if not ok or not isinstance(obj, dict):
        return out

    seen: Dict[str, set] = {c: set() for c in categories}
    for node_type, input_map in OBJECT_INFO_MODEL_MAP.items():
        info = obj.get(node_type) or {}
        required = (info.get("input") or {}).get("required") or {}
        for input_name, category in input_map.items():
            if category not in out:
                continue
            spec = required.get(input_name)
            if not (isinstance(spec, list) and len(spec) > 0 and isinstance(spec[0], list)):
                continue
            for value in spec[0]:
                path = str(value).replace("\\", "/")
                key = path.lower()
                if not path or key in seen[category]:
                    continue
                seen[category].add(key)
                out[category].append(
                    {
                        "name": Path(path).name,
                        "path": path,
                        "size_mb": None,
                        "modified": "",
                    }
                )
    for c in out:
        out[c].sort(key=lambda x: x["path"].lower())
    return out


def build_model_path_set() -> set:
    global MODEL_PATH_SET_CACHE
    if MODEL_PATH_SET_CACHE is not None:
        return MODEL_PATH_SET_CACHE
    data = scan_models_impl()
    path_set = set()
    for cat in MODEL_CATEGORIES:
        for m in data.get(cat, []):
            p = str(m.get("path", "")).replace("\\", "/").strip()
            if p:
                path_set.add(p.lower())
    MODEL_PATH_SET_CACHE = path_set
    return path_set


def clear_caches() -> Dict[str, Any]:
    global OBJECT_INFO_CACHE, MODEL_PATH_SET_CACHE
    OBJECT_INFO_CACHE = None
    MODEL_PATH_SET_CACHE = None
    return {"cleared": True, "timestamp": now_iso()}


def _custom_nodes_dir() -> Path:
    return COMFYUI_ROOT / "custom_nodes"


def _read_text_snippet(path: Path, max_chars: int = 200) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")[:max_chars]
    except Exception:
        return ""


def _count_node_class_mappings(folder: Path) -> int:
    total = 0
    py_files: List[Path] = []
    init_py = folder / "__init__.py"
    if init_py.exists():
        py_files.append(init_py)
    try:
        py_files.extend([p for p in folder.glob("*.py") if p.name != "__init__.py"])
    except Exception:
        pass

    for pyf in py_files:
        try:
            source = pyf.read_text(encoding="utf-8", errors="ignore")
            tree = ast.parse(source, filename=str(pyf))
            for node in ast.walk(tree):
                if isinstance(node, ast.Assign):
                    for target in node.targets:
                        if isinstance(target, ast.Name) and target.id == "NODE_CLASS_MAPPINGS":
                            if isinstance(node.value, ast.Dict):
                                total += len(node.value.keys)
        except Exception:
            continue
    return total


def scan_custom_nodes_impl() -> List[Dict[str, Any]]:
    base = _custom_nodes_dir()
    if not base.exists() or not base.is_dir():
        return []

    items: List[Dict[str, Any]] = []
    for child in base.iterdir():
        if not child.is_dir():
            continue
        if _is_hidden_dir(child):
            continue
        disabled = child.name.endswith(".disabled") or (child.parent / f"{child.name}.disabled").exists() or (child / ".disabled").exists()
        readme = child / "README.md"
        if not readme.exists():
            readme = child / "readme.md"
        items.append(
            {
                "name": child.name,
                "has_init": (child / "__init__.py").exists(),
                "node_count": _count_node_class_mappings(child),
                "readme_snippet": _read_text_snippet(readme) if readme.exists() else "",
                "disabled": bool(disabled),
            }
        )
    items.sort(key=lambda x: x["name"].lower())
    return items


def get_environment_impl() -> Dict[str, Any]:
    env: Dict[str, Any] = {
        "comfyui_url": COMFYUI_URL,
        "comfyui_root": str(COMFYUI_ROOT),
        "comfyui_reachable": False,
        "system_stats": {},
        "models_summary": {},
        "total_nodes": 0,
        "custom_nodes_installed": [],
    }

    ok_stats, stats = _http_get("/system_stats")
    env["comfyui_reachable"] = bool(ok_stats)
    env["system_stats"] = stats if ok_stats else {"error": stats}

    ok_obj, obj = get_object_info()
    if ok_obj and isinstance(obj, dict):
        env["total_nodes"] = len(obj)

    installed = get_installed_models_impl()
    summary = {}
    for key, value in installed.items():
        if isinstance(value, list):
            summary[key] = len(value)
    env["models_summary"] = summary

    env["custom_nodes_installed"] = [x["name"] for x in scan_custom_nodes_impl()]
    return env


def get_installed_models_impl() -> Dict[str, Any]:
    ok, obj = get_object_info()
    if not ok or not isinstance(obj, dict):
        return {"error": f"Failed to fetch /object_info: {obj}"}

    result: Dict[str, List[str]] = {
        "checkpoints": [],
        "loras": [],
        "vaes": [],
        "controlnets": [],
        "upscale_models": [],
        "clips": [],
        "unets": [],
        "clip_vision": [],
        "style_models": [],
        "gligen": [],
        "hypernetworks": [],
        "samplers": [],
        "schedulers": [],
    }
    seen = {k: set() for k in result.keys()}

    def add_values(category: str, values: Any) -> None:
        if category not in result:
            return
        if not isinstance(values, list):
            return
        for v in values:
            s = str(v).strip().replace("\\", "/")
            if not s:
                continue
            key = s.lower()
            if key in seen[category]:
                continue
            seen[category].add(key)
            result[category].append(s)

    for node_type, input_map in NODE_MODEL_MAP.items():
        info = obj.get(node_type)
        if not isinstance(info, dict):
            continue
        required = (info.get("input") or {}).get("required") or {}
        for input_name, category in input_map.items():
            spec = required.get(input_name)
            if isinstance(spec, list) and len(spec) > 0 and isinstance(spec[0], list):
                add_values(category, spec[0])

    ksampler = obj.get("KSampler") or {}
    krequired = (ksampler.get("input") or {}).get("required") or {}
    if isinstance(krequired.get("sampler_name"), list) and len(krequired["sampler_name"]) > 0 and isinstance(krequired["sampler_name"][0], list):
        add_values("samplers", krequired["sampler_name"][0])
    if isinstance(krequired.get("scheduler"), list) and len(krequired["scheduler"]) > 0 and isinstance(krequired["scheduler"][0], list):
        add_values("schedulers", krequired["scheduler"][0])

    # Embeddings are special; capture any input name containing 'embedding'
    embeddings: List[str] = []
    seen_embed = set()
    for _, info in obj.items():
        if not isinstance(info, dict):
            continue
        required = (info.get("input") or {}).get("required") or {}
        for input_name, spec in required.items():
            if "embedding" not in str(input_name).lower():
                continue
            if isinstance(spec, list) and len(spec) > 0 and isinstance(spec[0], list):
                for v in spec[0]:
                    s = str(v).strip().replace("\\", "/")
                    if not s:
                        continue
                    k = s.lower()
                    if k in seen_embed:
                        continue
                    seen_embed.add(k)
                    embeddings.append(s)
    result["embeddings"] = sorted(embeddings, key=lambda x: x.lower())

    for k in list(result.keys()):
        result[k] = sorted(result[k], key=lambda x: x.lower())
    result["total_node_types"] = len(obj)
    return result


def _extract_node_inputs(node_info: Dict[str, Any]) -> List[str]:
    names = []
    req = (node_info.get("input") or {}).get("required") or {}
    opt = (node_info.get("input") or {}).get("optional") or {}
    names.extend(list(req.keys()))
    names.extend([k for k in opt.keys() if k not in req])
    return names


def get_node_types_impl(search: Optional[str] = None, category: Optional[str] = None) -> Dict[str, Any]:
    ok, obj = get_object_info()
    if not ok:
        return {"error": f"Failed to fetch /object_info: {obj}"}

    q = (search or "").lower().strip()
    cat_q = (category or "").lower().strip()
    nodes: List[Dict[str, Any]] = []

    for class_type, info in obj.items():
        node_category = str(info.get("category", ""))
        display_name = str(info.get("display_name", class_type))
        if cat_q and cat_q not in node_category.lower():
            continue
        if q:
            hay = f"{class_type} {display_name} {node_category}".lower()
            if q not in hay:
                continue
        nodes.append(
            {
                "class_type": class_type,
                "category": node_category,
                "display_name": display_name,
                "input_names": _extract_node_inputs(info),
                "output_names": info.get("output_name") or info.get("output") or [],
            }
        )

    total = len(nodes)
    note = None
    if total > 100:
        nodes = nodes[:100]
        note = f"Showing first 100 of {total} results. Use search to filter."
    res: Dict[str, Any] = {"nodes": nodes, "total": total}
    if note:
        res["note"] = note
    return res


def get_node_detail_impl(class_type: str) -> Dict[str, Any]:
    if not class_type:
        return {"error": "Missing required argument: class_type"}
    ok, obj = get_object_info()
    if not ok:
        return {"error": f"Failed to fetch /object_info: {obj}"}
    info = obj.get(class_type)
    if info is None:
        return {"error": f"Node class_type not found: {class_type}"}
    out = dict(info)
    out["class_type"] = class_type
    out["display_name"] = info.get("display_name", class_type)
    out["category"] = info.get("category", "")
    return out


def _parse_workflow_json(workflow_str: str) -> Tuple[Optional[Dict[str, Any]], List[str]]:
    errors: List[str] = []
    if not workflow_str:
        errors.append("Missing required argument: workflow")
        return None, errors
    try:
        parsed = json.loads(workflow_str)
    except Exception as e:
        errors.append(f"Invalid JSON: {e}")
        return None, errors
    if not isinstance(parsed, dict):
        errors.append("Workflow must be a JSON object keyed by node ids.")
        return None, errors
    return parsed, errors


def _is_connection_value(v: Any) -> bool:
    return isinstance(v, list) and len(v) == 2 and isinstance(v[0], (str, int)) and isinstance(v[1], int)


def _get_options_from_input_def(input_def: Any) -> Optional[List[str]]:
    if isinstance(input_def, list) and len(input_def) > 0 and isinstance(input_def[0], list):
        return [str(x) for x in input_def[0]]
    return None


def _build_graph_edges(workflow: Dict[str, Any]) -> Tuple[Dict[str, List[str]], Dict[str, List[str]]]:
    out_edges: Dict[str, List[str]] = {str(k): [] for k in workflow.keys()}
    in_edges: Dict[str, List[str]] = {str(k): [] for k in workflow.keys()}
    for nid, n in workflow.items():
        inputs = (n or {}).get("inputs") or {}
        for _, val in inputs.items():
            if _is_connection_value(val):
                src = str(val[0])
                tgt = str(nid)
                if src in out_edges and tgt in in_edges:
                    out_edges[src].append(tgt)
                    in_edges[tgt].append(src)
    return out_edges, in_edges


def validate_workflow_impl(workflow_str: str) -> Dict[str, Any]:
    workflow, errors = _parse_workflow_json(workflow_str)
    warnings: List[str] = []
    if workflow is None:
        return {"valid": False, "errors": errors, "warnings": warnings}

    ok, obj = get_object_info()
    if not ok:
        errors.append(f"Failed to fetch /object_info for validation: {obj}")
        return {"valid": False, "errors": errors, "warnings": warnings}

    model_path_set = build_model_path_set()
    node_ids = set(str(k) for k in workflow.keys())

    for node_id, node in workflow.items():
        if not isinstance(node, dict):
            errors.append(f"Node {node_id}: node payload must be an object.")
            continue
        class_type = node.get("class_type")
        if not isinstance(class_type, str):
            errors.append(f"Node {node_id}: missing or invalid class_type.")
            continue
        node_info = obj.get(class_type)
        if node_info is None:
            errors.append(f"Node {node_id}: unknown class_type '{class_type}'.")
            continue

        required_inputs = ((node_info.get("input") or {}).get("required") or {})
        optional_inputs = ((node_info.get("input") or {}).get("optional") or {})
        all_specs = {**required_inputs, **optional_inputs}
        wf_inputs = node.get("inputs") or {}
        if not isinstance(wf_inputs, dict):
            errors.append(f"Node {node_id}: inputs must be an object.")
            continue

        for in_name, in_val in wf_inputs.items():
            if _is_connection_value(in_val):
                src_id = str(in_val[0])
                if src_id not in node_ids:
                    errors.append(f"Node {node_id}: input '{in_name}' references missing node_id '{src_id}'.")
                continue

            if isinstance(in_val, str):
                spec = all_specs.get(in_name)
                opts = _get_options_from_input_def(spec) if spec is not None else None
                if opts is not None and len(opts) > 0:
                    normalized = in_val.replace("\\", "/").lower()
                    option_norm = {o.replace("\\", "/").lower() for o in opts}
                    if normalized not in option_norm and normalized not in model_path_set:
                        errors.append(
                            f"Node {node_id}: input '{in_name}' value '{in_val}' is not in ComfyUI options "
                            f"and not found under models/."
                        )

    out_edges, in_edges = _build_graph_edges(workflow)

    output_like = set()
    for nid, node in workflow.items():
        ct = str((node or {}).get("class_type", ""))
        info = obj.get(ct, {})
        if info.get("output_node") is True:
            output_like.add(str(nid))
            continue
        ct_low = ct.lower()
        if "save" in ct_low or "preview" in ct_low:
            output_like.add(str(nid))

    if output_like:
        reachable = set(output_like)
        stack = list(output_like)
        while stack:
            cur = stack.pop()
            for parent in in_edges.get(cur, []):
                if parent not in reachable:
                    reachable.add(parent)
                    stack.append(parent)
        orphans = [nid for nid in workflow.keys() if str(nid) not in reachable]
        if orphans:
            warnings.append(f"Orphan nodes (no path to output node): {', '.join(map(str, orphans[:30]))}")
    else:
        warnings.append("No output/save node detected; orphan analysis skipped.")

    return {"valid": len(errors) == 0, "errors": errors, "warnings": warnings}


def execute_workflow_impl(workflow_str: str, wait: bool = True) -> Dict[str, Any]:
    validation = validate_workflow_impl(workflow_str)
    if not validation.get("valid", False):
        return {
            "prompt_id": None,
            "status": "error",
            "outputs": {},
            "errors": validation.get("errors", []),
            "warnings": validation.get("warnings", []),
            "validation": validation,
        }

    workflow = json.loads(workflow_str)
    ok, resp = _http_post("/prompt", {"prompt": workflow})
    if not ok:
        return {"prompt_id": None, "status": "error", "outputs": {}, "errors": [str(resp)]}

    prompt_id = str(resp.get("prompt_id", ""))
    if not wait:
        return {"prompt_id": prompt_id, "status": "queued", "outputs": {}, "errors": []}

    deadline = time.time() + 300
    while time.time() < deadline:
        ok_h, hist = _http_get(f"/history/{prompt_id}")
        if ok_h and isinstance(hist, dict):
            entry = hist.get(prompt_id) or hist
            if isinstance(entry, dict) and entry.get("outputs") is not None:
                errors: List[str] = []
                status = "completed"
                if entry.get("status") and isinstance(entry.get("status"), dict):
                    st = entry["status"]
                    if st.get("status_str") == "error":
                        status = "error"
                        errors.append(json.dumps(st))
                return {
                    "prompt_id": prompt_id,
                    "status": status,
                    "outputs": entry.get("outputs", {}),
                    "errors": errors,
                }
        time.sleep(1)

    return {"prompt_id": prompt_id, "status": "queued", "outputs": {}, "errors": ["Timeout waiting for completion (300s)."]}


def slugify(text: str) -> str:
    value = text.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value or "workflow"


def save_workflow_impl(workflow_str: str, name: str, description: str = "", tags: Optional[List[str]] = None) -> Dict[str, Any]:
    if not name or not isinstance(name, str):
        return {"saved": False, "error": "Missing required argument: name"}
    validation = validate_workflow_impl(workflow_str)
    if not validation.get("valid", False):
        return {"saved": False, "validation": validation}

    workflow_obj = json.loads(workflow_str)
    slug = slugify(name)
    WORKFLOWS_ROOT.mkdir(parents=True, exist_ok=True)
    wf_path = WORKFLOWS_ROOT / f"{slug}.json"
    meta_path = WORKFLOWS_ROOT / f"{slug}.meta.json"

    wf_path.write_text(json.dumps(workflow_obj, indent=2), encoding="utf-8")
    meta = {
        "name": name,
        "description": description or "",
        "tags": tags or [],
        "created": now_iso(),
        "node_count": len(workflow_obj) if isinstance(workflow_obj, dict) else 0,
        "validation": validation,
    }
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return {"saved": True, "path": str(wf_path), "validation": validation}


def tool_definitions() -> List[Dict[str, Any]]:
    return [
        {
            "name": "get_environment",
            "description": "Get a summary of ComfyUI reachability, system stats, installed models, nodes, and custom nodes.",
            "inputSchema": {"type": "object", "properties": {}},
        },
        {
            "name": "scan_models",
            "description": "Scan COMFYUI_ROOT/models recursively and return model files by category.",
            "inputSchema": {
                "type": "object",
                "properties": {"category": {"type": "string"}},
            },
        },
        {
            "name": "scan_custom_nodes",
            "description": "Scan COMFYUI_ROOT/custom_nodes and summarize installed custom nodes.",
            "inputSchema": {"type": "object", "properties": {}},
        },
        {
            "name": "get_installed_models",
            "description": "Extract installed models, samplers, and schedulers from ComfyUI /object_info dropdowns.",
            "inputSchema": {"type": "object", "properties": {}},
        },
        {
            "name": "get_node_types",
            "description": "List ComfyUI node types from /object_info with optional filters.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "search": {"type": "string"},
                    "category": {"type": "string"},
                },
            },
        },
        {
            "name": "get_node_detail",
            "description": "Get full /object_info detail for a specific class_type.",
            "inputSchema": {
                "type": "object",
                "properties": {"class_type": {"type": "string"}},
                "required": ["class_type"],
            },
        },
        {
            "name": "validate_workflow",
            "description": "Validate an API-format workflow JSON string against node schema and local models.",
            "inputSchema": {
                "type": "object",
                "properties": {"workflow": {"type": "string"}},
                "required": ["workflow"],
            },
        },
        {
            "name": "execute_workflow",
            "description": "Validate and execute an API-format workflow via /prompt, optionally waiting for history completion.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "workflow": {"type": "string"},
                    "wait": {"type": "boolean"},
                },
                "required": ["workflow"],
            },
        },
        {
            "name": "save_workflow",
            "description": "Validate and save workflow JSON plus metadata under workflows directory.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "workflow": {"type": "string"},
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "tags": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["workflow", "name"],
            },
        },
        {
            "name": "refresh_cache",
            "description": "Clear in-memory caches so /object_info and model paths are reloaded on next call.",
            "inputSchema": {"type": "object", "properties": {}},
        },
    ]


def call_tool(name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    args = arguments or {}
    if name == "get_environment":
        return get_environment_impl()
    if name == "scan_models":
        return scan_models_impl(args.get("category"))
    if name == "scan_custom_nodes":
        return scan_custom_nodes_impl()
    if name == "get_installed_models":
        return get_installed_models_impl()
    if name == "get_node_types":
        return get_node_types_impl(args.get("search"), args.get("category"))
    if name == "get_node_detail":
        return get_node_detail_impl(args.get("class_type"))
    if name == "validate_workflow":
        return validate_workflow_impl(args.get("workflow", ""))
    if name == "execute_workflow":
        return execute_workflow_impl(args.get("workflow", ""), bool(args.get("wait", True)))
    if name == "save_workflow":
        return save_workflow_impl(
            args.get("workflow", ""),
            args.get("name", ""),
            args.get("description", ""),
            args.get("tags", []),
        )
    if name == "refresh_cache":
        return clear_caches()
    return {"error": f"Unknown tool: {name}"}


def send_response(msg_id: Any, result: Dict[str, Any]) -> None:
    response = {"jsonrpc": "2.0", "id": msg_id, "result": result}
    sys.stdout.write(json.dumps(response) + "\n")
    sys.stdout.flush()


def make_error_result(message: str) -> Dict[str, Any]:
    return {
        "content": [{"type": "text", "text": message}],
        "isError": True,
    }


def make_tool_result(data: Any) -> Dict[str, Any]:
    return {
        "content": [{"type": "text", "text": json.dumps(data)}],
    }


def handle_message(message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    method = message.get("method")
    msg_id = message.get("id")
    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "comfyui-architect-mcp", "version": "1.0.0"},
            },
        }
    if method == "notifications/initialized":
        return None
    if method == "tools/list":
        return {"jsonrpc": "2.0", "id": msg_id, "result": {"tools": tool_definitions()}}
    if method == "tools/call":
        params = message.get("params") or {}
        name = params.get("name")
        args = params.get("arguments") or {}
        if not name:
            return {"jsonrpc": "2.0", "id": msg_id, "result": make_error_result("Missing tools/call params.name")}
        try:
            data = call_tool(name, args)
            is_error = isinstance(data, dict) and "error" in data and len(data.keys()) <= 2
            if is_error:
                return {"jsonrpc": "2.0", "id": msg_id, "result": make_error_result(json.dumps(data))}
            return {"jsonrpc": "2.0", "id": msg_id, "result": make_tool_result(data)}
        except Exception as e:
            log(f"Tool execution error ({name}): {e}")
            return {"jsonrpc": "2.0", "id": msg_id, "result": make_error_result(str(e))}

    if msg_id is None:
        return None
    return {"jsonrpc": "2.0", "id": msg_id, "result": make_error_result(f"Unknown method: {method}")}


def main() -> None:
    log(f"Starting comfyui-architect-mcp with COMFYUI_URL={COMFYUI_URL} COMFYUI_ROOT={COMFYUI_ROOT}")
    while True:
        line = sys.stdin.readline()
        if not line:
            break
        line = line.strip()
        if not line:
            continue
        try:
            message = json.loads(line)
        except json.JSONDecodeError as e:
            log(f"Invalid JSON input: {e}")
            continue

        if not isinstance(message, dict):
            continue
        if "method" not in message:
            continue

        response = handle_message(message)
        if response is not None:
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
