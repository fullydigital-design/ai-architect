# AI Architect

**Natural language → valid ComfyUI workflow JSON**

![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-purple?style=flat-square&logo=vite)
![Electron](https://img.shields.io/badge/Electron-36-47848F?style=flat-square&logo=electron)

---

## Screenshots

<table>
  <tr>
    <td><img src="docs/screenshot_1.png" alt="Workflow editor" width="480"/></td>
    <td><img src="docs/screenshot_2.png" alt="Node graph" width="480"/></td>
  </tr>
</table>

---

## What it does

Describe an image generation pipeline in plain English; AI Architect produces a valid ComfyUI workflow JSON you can load or execute immediately. It supports multiple AI providers (Claude, GPT-4o, Gemini, OpenRouter) and builds context-aware prompts from the live node registry of your running ComfyUI instance. Generated workflows go through multi-stage validation and are automatically corrected when the model produces invalid node connections or missing inputs.

---

## Features

- **Multi-provider AI** — 12+ models across Anthropic, OpenAI, Google, and OpenRouter; per-model token budgeting
- **Visual node graph** — ReactFlow canvas with auto-layout, type-checked edge connections, and inline editing
- **Live ComfyUI integration** — `/object_info` sync for node discovery, WebSocket execution pipeline, error auto-correction loop
- **Context-aware prompting** — system prompt assembled from live node registry + installed checkpoints/LoRAs at generation time
- **MCP server** — exposes ComfyUI operations as tools consumable by any MCP-compatible AI client
- **Zero-backend architecture** — fully client-side; AI calls go browser-direct, state persisted in localStorage

---

## Stack

![React](https://img.shields.io/badge/React_18-UI_layer-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript_5-type_safe-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_6-dev_server-646CFF?style=flat-square&logo=vite&logoColor=white)
![Electron](https://img.shields.io/badge/Electron_36-desktop_shell-47848F?style=flat-square&logo=electron&logoColor=white)
![ReactFlow](https://img.shields.io/badge/ReactFlow-node_graph-FF0072?style=flat-square)
![pnpm](https://img.shields.io/badge/pnpm-package_manager-F69220?style=flat-square&logo=pnpm&logoColor=white)

---

## Status

| Component | Status |
|---|---|
| Frontend (browser) | Complete — functional in browser dev mode |
| Electron desktop shell | Complete — window opens with full API access |
| Test suite | Not present |

---

## Setup

**Prerequisites:** Node 20+, pnpm, a running ComfyUI instance

```bash
cd webapp
pnpm install
cp .env.example .env          # fill in your AI provider keys
pnpm dev                      # browser — http://localhost:5173
pnpm electron:dev             # desktop (Electron)
```

Set `VITE_COMFYUI_URL` in `.env` to point at your ComfyUI instance (default `http://127.0.0.1:8188`).

For local path overrides (ComfyUI root, Python exe, etc.):

```bash
cp .env.secret.example .env.secret   # fill in absolute paths, never committed
```

---

## MCP Server

```bash
cd mcp-server
pnpm install
pnpm start
```

Add the server to your MCP client config (e.g. `.mcp.json`) to expose ComfyUI tools (`queue_prompt`, `get_history`, `get_models`, etc.) to your AI client.

---

## Project Layout

```
webapp/          React + Vite frontend + Electron shell
mcp-server/      TypeScript MCP server
scripts/         Bootstrap and check scripts (PowerShell)
docs/            Screenshots and internal docs
```
