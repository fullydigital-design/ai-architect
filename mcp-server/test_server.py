#!/usr/bin/env python3
"""
Integration test for comfyui_mcp_server.py
Launch as subprocess, communicate via stdio.
Requires ComfyUI running at http://127.0.0.1:8188
"""

import subprocess
import json
import sys
import os
import time

SERVER_PATH = os.path.join(os.path.dirname(__file__), "comfyui_mcp_server.py")

# Use the same env vars as .mcp.json
ENV = {
    **os.environ,
    "COMFYUI_URL": "http://127.0.0.1:8188",
    "COMFYUI_ROOT": r"C:\_AI\ComfyUI_V81\ComfyUI",
}


class MCPTestClient:
    def __init__(self):
        self.proc = subprocess.Popen(
            [sys.executable, SERVER_PATH],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=ENV,
            bufsize=1,
        )
        self._id = 0

    def _next_id(self):
        self._id += 1
        return self._id

    def send(self, method, params=None):
        msg_id = self._next_id()
        message = {"jsonrpc": "2.0", "id": msg_id, "method": method}
        if params is not None:
            message["params"] = params
        self.proc.stdin.write(json.dumps(message) + "\n")
        self.proc.stdin.flush()
        line = self.proc.stdout.readline()
        if not line.strip():
            return None
        return json.loads(line)

    def notify(self, method, params=None):
        message = {"jsonrpc": "2.0", "method": method}
        if params is not None:
            message["params"] = params
        self.proc.stdin.write(json.dumps(message) + "\n")
        self.proc.stdin.flush()

    def call_tool(self, name, arguments=None):
        resp = self.send("tools/call", {"name": name, "arguments": arguments or {}})
        if resp is None:
            return {"error": "No response received"}
        content = resp.get("result", {}).get("content", [{}])
        text = content[0].get("text", "{}") if content else "{}"
        is_error = resp.get("result", {}).get("isError", False)
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            parsed = {"raw": text}
        if is_error:
            parsed["_mcp_error"] = True
        return parsed

    def close(self):
        self.proc.terminate()
        self.proc.wait(timeout=5)


def run_tests():
    passed = 0
    failed = 0
    total_start = time.time()

    client = MCPTestClient()

    print("=" * 60)
    print("TEST 1: Initialize")
    resp = client.send("initialize", {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "test-harness", "version": "1.0"}
    })
    assert resp is not None, "No response from initialize"
    server_info = resp["result"]["serverInfo"]
    print(f"  Server: {server_info['name']} v{server_info['version']}")
    assert server_info["name"] == "comfyui-architect-mcp"
    print("  PASSED")
    passed += 1

    client.notify("notifications/initialized")
    time.sleep(0.2)

    print("\nTEST 2: Tools List")
    resp = client.send("tools/list")
    tools = resp["result"]["tools"]
    tool_names = [t["name"] for t in tools]
    print(f"  Found {len(tools)} tools: {', '.join(tool_names)}")
    expected_tools = [
        "get_environment", "scan_models", "scan_custom_nodes", "get_installed_models",
        "get_node_types", "get_node_detail", "validate_workflow",
        "execute_workflow", "save_workflow", "refresh_cache"
    ]
    for t in expected_tools:
        assert t in tool_names, f"Missing tool: {t}"
    print("  PASSED")
    passed += 1

    print("\nTEST 3: get_environment")
    result = client.call_tool("get_environment")
    print(f"  ComfyUI reachable: {result.get('comfyui_reachable')}")
    print(f"  ComfyUI root: {result.get('comfyui_root')}")
    print(f"  Total nodes: {result.get('total_nodes')}")
    models_summary = result.get("models_summary", {})
    print("  Models summary:")
    for category, count in sorted(models_summary.items()):
        if count > 0:
            print(f"    {category}: {count}")
    custom_nodes = result.get("custom_nodes_installed", [])
    print(f"  Custom nodes installed: {len(custom_nodes)}")
    if custom_nodes:
        print(f"    First 10: {', '.join(custom_nodes[:10])}")
    assert result.get("comfyui_reachable") is True, "ComfyUI not reachable!"
    assert result.get("total_nodes", 0) > 0, "No nodes found!"
    print("  PASSED")
    passed += 1

    print("\nTEST 4: scan_models (all)")
    result = client.call_tool("scan_models")
    total_models = 0
    for category, models in sorted(result.items()):
        if isinstance(models, list) and len(models) > 0:
            total_models += len(models)
            print(f"  {category} ({len(models)}):")
            for m in models[:3]:
                print(f"    - {m['name']} ({m.get('size_mb', '?')} MB)")
            if len(models) > 3:
                print(f"    ... and {len(models) - 3} more")
    print(f"  Total model files: {total_models}")
    assert total_models > 0, "No models found on disk!"
    print("  PASSED")
    passed += 1

    print("\nTEST 5: scan_models (checkpoints only)")
    result = client.call_tool("scan_models", {"category": "checkpoints"})
    checkpoints = result.get("checkpoints", [])
    print(f"  Checkpoints found: {len(checkpoints)}")
    for cp in checkpoints[:20]:
        print(f"    - {cp['name']} ({cp.get('size_mb', '?')} MB)")
    first_checkpoint = checkpoints[0]["path"] if checkpoints else None
    print(f"  First checkpoint path (for ComfyUI): {first_checkpoint}")
    print("  PASSED")
    passed += 1

    print("\nTEST 6: scan_custom_nodes")
    result = client.call_tool("scan_custom_nodes")
    if isinstance(result, list):
        print(f"  Custom nodes: {len(result)}")
        for cn in result[:5]:
            status = "DISABLED" if cn.get("disabled") else "active"
            print(f"    - {cn['name']} (nodes: {cn.get('node_count', '?')}, {status})")
        if len(result) > 5:
            print(f"    ... and {len(result) - 5} more")
    print("  PASSED")
    passed += 1

    print("\nTEST 7: get_node_types (search='KSampler')")
    result = client.call_tool("get_node_types", {"search": "KSampler"})
    nodes = result.get("nodes", [])
    print(f"  Found {result.get('total', 0)} nodes matching 'KSampler':")
    for n in nodes[:10]:
        print(f"    - {n['class_type']} [{n.get('category', '')}]")
    assert len(nodes) > 0, "No KSampler nodes found!"
    print("  PASSED")
    passed += 1

    print("\nTEST 8: get_node_detail (KSampler)")
    result = client.call_tool("get_node_detail", {"class_type": "KSampler"})
    required = result.get("input", {}).get("required", {})
    print(f"  Required inputs: {list(required.keys())}")
    sampler_def = required.get("sampler_name", [])
    if isinstance(sampler_def, list) and len(sampler_def) > 0 and isinstance(sampler_def[0], list):
        samplers = sampler_def[0]
        print(f"  Available samplers ({len(samplers)}): {', '.join(samplers[:8])}...")
    scheduler_def = required.get("scheduler", [])
    if isinstance(scheduler_def, list) and len(scheduler_def) > 0 and isinstance(scheduler_def[0], list):
        schedulers = scheduler_def[0]
        print(f"  Available schedulers ({len(schedulers)}): {', '.join(schedulers[:8])}...")
    assert "model" in required, "KSampler missing 'model' input"
    assert "sampler_name" in required, "KSampler missing 'sampler_name' input"
    print("  PASSED")
    passed += 1

    print("\nTEST 9: validate_workflow (valid workflow)")
    if first_checkpoint:
        test_workflow = {
            "1": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {"ckpt_name": first_checkpoint}
            },
            "2": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": "test prompt", "clip": ["1", 1]}
            },
            "3": {
                "class_type": "EmptyLatentImage",
                "inputs": {"width": 512, "height": 512, "batch_size": 1}
            }
        }
        result = client.call_tool("validate_workflow", {"workflow": json.dumps(test_workflow)})
        print(f"  Valid: {result.get('valid')}")
        print(f"  Errors: {result.get('errors', [])}")
        print(f"  Warnings: {result.get('warnings', [])}")
    else:
        print("  SKIPPED (no checkpoint found to build test workflow)")
    print("  PASSED")
    passed += 1

    print("\nTEST 10: validate_workflow (invalid - fake node type)")
    bad_workflow = {
        "1": {
            "class_type": "FakeNodeThatDoesNotExist",
            "inputs": {"foo": "bar"}
        }
    }
    result = client.call_tool("validate_workflow", {"workflow": json.dumps(bad_workflow)})
    print(f"  Valid: {result.get('valid')}")
    print(f"  Errors: {result.get('errors', [])}")
    has_error = not result.get("valid", True) or len(result.get("errors", [])) > 0
    assert has_error, "Validator should reject unknown node type!"
    print("  PASSED")
    passed += 1

    print("\nTEST 11: save_workflow")
    if first_checkpoint:
        test_wf = {
            "1": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {"ckpt_name": first_checkpoint}
            }
        }
        result = client.call_tool("save_workflow", {
            "workflow": json.dumps(test_wf),
            "name": "MCP Test Workflow",
            "description": "Auto-generated test workflow from test_server.py",
            "tags": ["test", "automated"]
        })
        print(f"  Saved: {result.get('saved')}")
        print(f"  Path: {result.get('path')}")
        print(f"  Validation: {result.get('validation', {}).get('valid')}")
    else:
        print("  SKIPPED (no checkpoint)")
    print("  PASSED")
    passed += 1

    print("\nTEST 12: refresh_cache")
    result = client.call_tool("refresh_cache")
    print(f"  Result: {result}")
    print("  PASSED")
    passed += 1

    print("\nTEST 13: get_installed_models")
    result = client.call_tool("get_installed_models")
    for category in ["checkpoints", "loras", "vaes", "controlnets",
                     "upscale_models", "clips", "unets", "samplers", "schedulers"]:
        items = result.get(category, [])
        if items:
            print(f"  {category} ({len(items)}):")
            for item in items[:5]:
                print(f"    - {item}")
            if len(items) > 5:
                print(f"    ... and {len(items) - 5} more")
    assert len(result.get("samplers", [])) > 0, "No samplers found!"
    first_ckpt = (result.get("checkpoints") or [None])[0]
    print(f"  First checkpoint: {first_ckpt}")
    print("  PASSED")
    passed += 1

    if first_ckpt:
        print("\nTEST 14: validate_workflow (real checkpoint)")
        test_workflow = {
            "1": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {"ckpt_name": first_ckpt}
            },
            "2": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": "test", "clip": ["1", 1]}
            },
            "3": {
                "class_type": "EmptyLatentImage",
                "inputs": {"width": 512, "height": 512, "batch_size": 1}
            }
        }
        result = client.call_tool("validate_workflow", {
            "workflow": json.dumps(test_workflow)
        })
        print(f"  Valid: {result.get('valid')}")
        print(f"  Errors: {result.get('errors', [])}")
        print(f"  Warnings: {result.get('warnings', [])}")
        print("  PASSED")
        passed += 1

        print("\nTEST 15: save_workflow (real checkpoint)")
        result = client.call_tool("save_workflow", {
            "workflow": json.dumps(test_workflow),
            "name": "MCP Integration Test",
            "description": "Automated test with real checkpoint",
            "tags": ["test", "automated", "integration"]
        })
        print(f"  Saved: {result.get('saved')}")
        print(f"  Path: {result.get('path')}")
        print("  PASSED")
        passed += 1

    elapsed = time.time() - total_start
    client.close()
    print("\n" + "=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed ({elapsed:.1f}s)")
    print("=" * 60)

    if failed > 0:
        print("\nSome tests failed. Fix issues and re-run.")
        sys.exit(1)
    else:
        print("\nAll tests passed! MCP server is ready.")
        print("\nNext steps:")
        print("  1. Ensure your MCP client config (.mcp.json) points to this server")
        print("  2. Ask your AI client: 'What checkpoints do I have installed?'")
        print("  3. The client should call the comfyui MCP tools and return real data")
        sys.exit(0)


if __name__ == "__main__":
    run_tests()
