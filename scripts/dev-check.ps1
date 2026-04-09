[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step([string]$Message) {
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Add-PathFront([string]$Directory) {
  if (-not (Test-Path $Directory)) { return }
  $parts = $env:PATH -split ';' | Where-Object { $_ -ne '' }
  if ($parts -contains $Directory) { return }
  $env:PATH = "$Directory;$env:PATH"
}

function Find-CommandPath([string[]]$Candidates) {
  foreach ($candidate in $Candidates) {
    if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
    if (Test-Path $candidate) { return (Resolve-Path $candidate).Path }
    try {
      $cmd = Get-Command $candidate -ErrorAction Stop
      if ($null -ne $cmd -and $cmd.Source) { return $cmd.Source }
    } catch {
      # Continue trying other candidates.
    }
  }
  return $null
}

function Is-WindowsAppsShim([string]$PathValue) {
  return $PathValue -like "*\Microsoft\WindowsApps\*"
}

function Resolve-NodeToolchain {
  $nodeExe = Find-CommandPath @(
    "$env:ProgramFiles\nodejs\node.exe",
    "${env:ProgramFiles(x86)}\nodejs\node.exe",
    "node.exe"
  )
  if (-not $nodeExe) {
    throw "Node.js was not found. Run .\scripts\dev-bootstrap.ps1 -InstallMissing first."
  }

  $nodeDir = Split-Path -Parent $nodeExe
  Add-PathFront $nodeDir

  $npmCmd = Find-CommandPath @(
    (Join-Path $nodeDir "npm.cmd"),
    "npm.cmd"
  )
  $corepackCmd = Find-CommandPath @(
    (Join-Path $nodeDir "corepack.cmd"),
    "corepack.cmd"
  )

  if (-not $npmCmd) { throw "npm.cmd not found." }
  if (-not $corepackCmd) { throw "corepack.cmd not found." }

  return @{
    Node = $nodeExe
    Npm = $npmCmd
    Corepack = $corepackCmd
  }
}

function Resolve-PythonExe {
  $commandHits = @()
  try {
    $commandHits = Get-Command python -All -ErrorAction Stop | Select-Object -ExpandProperty Source
  } catch {
    $commandHits = @()
  }

  $filteredHits = @($commandHits | Where-Object { -not (Is-WindowsAppsShim $_) })
  $pythonExe = Find-CommandPath @(
    "$env:LocalAppData\Programs\Python\Python312\python.exe",
    "$env:LocalAppData\Programs\Python\Python311\python.exe"
  )

  if (-not $pythonExe -and $filteredHits.Count -gt 0) {
    $pythonExe = Find-CommandPath $filteredHits
  }

  if (-not $pythonExe) {
    throw "Python was not found. Run .\scripts\dev-bootstrap.ps1 -InstallMissing first."
  }
  return $pythonExe
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$webappDir = Join-Path $repoRoot "webapp"
$mcpDir = Join-Path $repoRoot "mcp-server"

Write-Step "Resolving toolchain"
$nodeTools = Resolve-NodeToolchain
$pythonExe = Resolve-PythonExe

& $nodeTools.Node -v
& $nodeTools.Npm -v
& $nodeTools.Corepack pnpm --version
& $pythonExe --version

$env:CI = "true"

Write-Step "Building webapp"
Push-Location $webappDir
try {
  & $nodeTools.Corepack pnpm run build
  if ($LASTEXITCODE -ne 0) { throw "Webapp build failed." }
} finally {
  Pop-Location
}

Write-Step "Building MCP server"
Push-Location $mcpDir
try {
  & $nodeTools.Npm run build
  if ($LASTEXITCODE -ne 0) { throw "MCP server build failed." }
} finally {
  Pop-Location
}

Write-Step "Syntax checking legacy Python MCP scripts"
Push-Location $mcpDir
try {
  & $pythonExe -m py_compile comfyui_mcp_server.py
  if ($LASTEXITCODE -ne 0) { throw "comfyui_mcp_server.py failed syntax check." }

  if (Test-Path ".\diagnose_models.py") {
    & $pythonExe -m py_compile diagnose_models.py
    if ($LASTEXITCODE -ne 0) { throw "diagnose_models.py failed syntax check." }
  }
} finally {
  Pop-Location
}

Write-Step "All checks passed"
