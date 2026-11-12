@echo off
title Adaptive Game Intelligence Platform
cd /d "%~dp0"

echo Activating Python virtual environment...
if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
)

echo Starting Game Server...
python run_server.py
pause
