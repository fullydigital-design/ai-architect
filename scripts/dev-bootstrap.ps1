[CmdletBinding()]
param(
  [switch]$InstallMissing
)

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

function Ensure-WingetPackage([string]$PackageId, [string]$Label) {
  $listOutput = & winget list --id $PackageId --exact --accept-source-agreements 2>$null | Out-String
  if ($listOutput -match [Regex]::Escape($PackageId)) {
    return
  }

  if (-not $InstallMissing) {
    throw "$Label is missing. Re-run with -InstallMissing or install manually: winget install --id $PackageId -e"
  }

  Write-Step "Installing $Label with winget"
  & winget install --id $PackageId -e --accept-source-agreements --accept-package-agreements
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to install $Label ($PackageId)."
  }
}

function Resolve-NodeToolchain {
  Ensure-WingetPackage -PackageId "OpenJS.NodeJS.LTS" -Label "Node.js LTS"

  $nodeExe = Find-CommandPath @(
    "$env:ProgramFiles\nodejs\node.exe",
    "${env:ProgramFiles(x86)}\nodejs\node.exe",
    "node.exe"
  )
  if (-not $nodeExe) { throw "Unable to locate node.exe." }

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

  if (-not $npmCmd) { throw "Unable to locate npm.cmd." }
  if (-not $corepackCmd) { throw "Unable to locate corepack.cmd." }

  return @{
    Node = $nodeExe
    Npm = $npmCmd
    Corepack = $corepackCmd
  }
}

function Resolve-PythonExe {
  Ensure-WingetPackage -PackageId "Python.Python.3.12" -Label "Python 3.12"

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
  if (-not $pythonExe) { throw "Unable to locate python.exe." }

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

Write-Step "Installing webapp dependencies"
Push-Location $webappDir
try {
  & $nodeTools.Corepack pnpm install --frozen-lockfile
  if ($LASTEXITCODE -ne 0) { throw "pnpm install failed in webapp." }
} finally {
  Pop-Location
}

Write-Step "Installing MCP server dependencies"
Push-Location $mcpDir
try {
  & $nodeTools.Npm ci
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed in mcp-server." }
} finally {
  Pop-Location
}

$requirementsFile = Join-Path $mcpDir "requirements.txt"
if (Test-Path $requirementsFile) {
  Write-Step "Installing Python requirements for legacy MCP server"
  Push-Location $mcpDir
  try {
    & $pythonExe -m pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) { throw "pip install failed." }
  } finally {
    Pop-Location
  }
}

Write-Step "Bootstrap complete"
Write-Host "Next: powershell -ExecutionPolicy Bypass -File .\scripts\dev-check.ps1"
