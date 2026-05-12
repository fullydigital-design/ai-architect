# AI Architect — task runner
# Requires: just (https://github.com/casey/just)
# Windows PowerShell backend

set shell := ["powershell", "-NoProfile", "-Command"]
set windows-shell := ["powershell", "-NoProfile", "-Command"]

# Default: list all recipes
default:
    @just --list

# ── Dev ────────────────────────────────────────────────────────────────────────

# Start the Vite dev server (browser mode)
dev:
    Set-Location webapp; pnpm dev

# Start Electron + Vite together
electron:
    Set-Location webapp; pnpm electron:dev

# Start the MCP server in dev mode
mcp:
    Set-Location mcp-server; npm run dev

# ── Build ──────────────────────────────────────────────────────────────────────

# Production Vite build
build:
    Set-Location webapp; pnpm build

# Build Electron NSIS installer
dist:
    Set-Location webapp; pnpm electron:build

# Build MCP server TypeScript
build-mcp:
    Set-Location mcp-server; npm run build

# ── Install ────────────────────────────────────────────────────────────────────

# Install all dependencies (webapp + mcp-server)
install:
    Set-Location webapp; pnpm install
    Set-Location mcp-server; npm install

# ── Check ──────────────────────────────────────────────────────────────────────

# Type-check via Vite build (surfaces all TS errors)
typecheck:
    Set-Location webapp; pnpm build --mode development 2>&1 | Select-String -Pattern "error TS"

# Run PowerShell health-check script
check:
    powershell -ExecutionPolicy Bypass -File scripts/dev-check.ps1

# ── Security ───────────────────────────────────────────────────────────────────

# Scan for accidental secrets (looks for API keys, tokens, passwords in source)
security:
    Write-Host "Scanning for secrets..."
    Select-String -Path "webapp/src/**/*.ts","webapp/src/**/*.tsx","mcp-server/**/*.ts" `
        -Pattern "(sk-|ANTHROPIC_API_KEY|OPENAI_API_KEY|AIza|ghp_|Bearer\s+[A-Za-z0-9]{20,})" `
        -Recurse -ErrorAction SilentlyContinue
    Write-Host "Checking .env.secret is not staged..."
    git status --short | Select-String ".env.secret"

# ── Fresh ──────────────────────────────────────────────────────────────────────

# Nuke node_modules and reinstall everything from scratch
fresh:
    Write-Host "Removing node_modules..."
    Remove-Item -Recurse -Force webapp/node_modules -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force mcp-server/node_modules -ErrorAction SilentlyContinue
    Remove-Item -Force webapp/pnpm-lock.yaml -ErrorAction SilentlyContinue
    Write-Host "Reinstalling..."
    Set-Location webapp; pnpm install
    Set-Location mcp-server; npm install

# ── Plan ───────────────────────────────────────────────────────────────────────

# Print project overview: git status + key file counts
plan:
    Write-Host "=== AI Architect — Project Status ==="
    git status --short
    Write-Host ""
    Write-Host "=== Webapp source files ==="
    Get-ChildItem -Recurse webapp/src -Include "*.ts","*.tsx" | Measure-Object | Select-Object Count
    Write-Host "=== Services ==="
    Get-ChildItem webapp/src/services -Include "*.ts" | Measure-Object | Select-Object Count
    Write-Host "=== Components ==="
    Get-ChildItem webapp/src/app/components -Recurse -Include "*.tsx" | Measure-Object | Select-Object Count
