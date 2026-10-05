<#================================================================
  run_demo.ps1 – One-click launch, skips reinstall if .venv exists
================================================================#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$Venv = Join-Path $Root ".venv"
$Activate = Join-Path $Venv "Scripts\Activate.ps1"
$Ui = Join-Path $Root "ui"
$Art = "$env:USERPROFILE\.gemini\antigravity-ide\brain\ab77ad42-3304-484c-b456-0dbb78f45d5d"

# --- 1️⃣ Activate (or create) the venv ------------------------------------
if (-Not (Test-Path $Venv)) {
    Write-Host "Creating virtual-env ..."
    python -m venv $Venv
}
Write-Host "Activating venv ..."
& $Activate

# --- 2️⃣ Install only if requirements.txt changed (simple timestamp check) --
$stamp = Join-Path $Venv "requirements_stamp.txt"
$needsInstall = $true
if (Test-Path $stamp) {
    $last = Get-Content $stamp
    if (Test-Path "requirements.txt") {
        $current = (Get-Item "requirements.txt").LastWriteTimeUtc
        if ($last -eq $current.ToString("o")) { $needsInstall = $false }
    }
}
if ($needsInstall) {
    Write-Host "Installing / upgrading packages ..."
    python -m pip install --upgrade pip
    if (Test-Path "requirements.txt") {
        python -m pip install -r requirements.txt
    }
    python -m pip install fastapi uvicorn[standard] python-multipart websockets httpx
    if (Test-Path "requirements.txt") {
        (Get-Item "requirements.txt").LastWriteTimeUtc.ToString("o") | Set-Content $stamp
    }
} else {
    Write-Host "Packages already up-to-date - skipping pip install."
}

# --- 3️⃣ Copy placeholder images (once) ----------------------------------
$srcCam = Join-Path $Art "dummy_cam1_1791111129585.jpg"
$dstCam = Join-Path $Ui "dummy_cam1.jpg"
$srcViol = Join-Path $Art "violation1_1791111151233.jpg"
$dstViol = Join-Path $Ui "violation1.jpg"
if ((Test-Path $srcCam) -and (-not (Test-Path $dstCam))) { Copy-Item $srcCam $dstCam }
if ((Test-Path $srcViol) -and (-not (Test-Path $dstViol))) { Copy-Item $srcViol $dstViol }

# --- 4️⃣ Launch the Complete Real-World AI 4-Way Traffic Suite ---
Write-Host "Launching Complete UK-ITCS AI Vision Suite & 4-Way Real-Time ATSC System..."
Write-Host "URL: http://localhost:8000/"
$PythonExe = Join-Path $Venv "Scripts\python.exe"

& "$PythonExe" run_4way.py --port 8000
