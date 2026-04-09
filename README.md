# AI Architect

**Natural language → valid ComfyUI workflow JSON**

![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-purple?style=flat-square&logo=vite)
![Tauri](https://img.shields.io/badge/Tauri-v2-orange?style=flat-square&logo=tauri)
![FastAPI](https://img.shields.io/badge/FastAPI-0.11x-green?style=flat-square&logo=fastapi)

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
- **MCP server** — exposes ComfyUI operations as tools consumable by Cursor or any MCP-compatible IDE
- **Zero-backend architecture** — fully client-side; AI calls go browser-direct, state persisted in localStorage

---

## Stack

![React](https://img.shields.io/badge/React_18-UI_layer-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript_5-type_safe-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_6-dev_server-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tauri](https://img.shields.io/badge/Tauri_v2-desktop_shell-FFC131?style=flat-square&logo=tauri&logoColor=black)
![ReactFlow](https://img.shields.io/badge/ReactFlow-node_graph-FF0072?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-backend_(WIP)-009688?style=flat-square&logo=fastapi&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-state-brown?style=flat-square)
![pnpm](https://img.shields.io/badge/pnpm-package_manager-F69220?style=flat-square&logo=pnpm&logoColor=white)

---

## Status

| Component | Status |
|---|---|
| Frontend (browser) | Complete — functional in browser dev mode |
| Tauri desktop shell | Scaffolded — window opens; direct fetch to AI APIs blocked by OS sandbox (WIP) |
| FastAPI backend | ~20% stubbed — scaffolding only, no production routes |
| Test suite | Not present |

---

## Setup

**Prerequisites:** Node 20+, pnpm, Rust toolchain (for Tauri), a running ComfyUI instance

```bash
cd webapp
pnpm install
cp .env.example .env          # fill in your AI provider keys
pnpm dev                      # browser — http://localhost:5173
pnpm tauri:dev                # desktop build (requires Rust)
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

Add the server to your Cursor MCP config to expose ComfyUI tools (`queue_prompt`, `get_history`, `get_models`, etc.) inside the IDE.

---

## Project Layout

```
webapp/          React + Vite frontend + Tauri shell
mcp-server/      TypeScript MCP server
scripts/         Bootstrap and check scripts (PowerShell)
docs/            Screenshots and internal docs
```
