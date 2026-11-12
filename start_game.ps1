# Run Adaptive Game Intelligence Server
Set-Location -Path $PSScriptRoot

if (Test-Path ".\.venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Cyan
    & ".\.venv\Scripts\Activate.ps1"
}

Write-Host "Starting Game Server..." -ForegroundColor Green
python run_server.py
