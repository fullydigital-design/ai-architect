# ComfyUI Architect MCP Server

This folder contains two MCP implementations:

1. Primary: TypeScript server (`index.ts`)
2. Legacy: Python server (`comfyui_mcp_server.py`)

Use the TypeScript server by default.

## TypeScript MCP Server (Primary)

### Install

```powershell
cd .\mcp-server
npm ci
```

### Run in dev mode

```powershell
npx tsx index.ts
```

### Build

```powershell
npm run build
```

### Run built server

```powershell
node dist/index.js
```

## MCP Registration

Use this in your MCP client config (e.g. `.mcp.json` in the project root):

```json
{
  "mcpServers": {
    "comfyui-architect": {
      "command": "npx",
      "args": ["tsx", "mcp-server/index.ts"],
      "env": {
        "COMFY_BASE_URL": "http://127.0.0.1:8188",
        "ARCHITECT_URL": "http://127.0.0.1:5173"
      }
    }
  }
}
```

Paths like ComfyUI root/model directories are loaded from the root `comfyui-paths.config.json`.

## Legacy Python MCP Server (Optional)

`comfyui_mcp_server.py` is still available for compatibility.

### Install requirements

```powershell
cd .\mcp-server
python -m pip install -r requirements.txt
```

### Quick syntax check

```powershell
python -m py_compile comfyui_mcp_server.py
```
