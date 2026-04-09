# Local Setup

Primary setup path:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev-bootstrap.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\dev-check.ps1
```

Private local paths:

1. Copy `.env.secret.example` to `.env.secret`
2. Fill your ComfyUI/Python/Webapp paths in `.env.secret`
3. Run `start-fullydigital.bat`

If dependencies are not installed yet:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev-bootstrap.ps1 -InstallMissing
```

Then run:

```powershell
cd .\webapp
corepack pnpm dev
```

Open: `http://127.0.0.1:5173`
