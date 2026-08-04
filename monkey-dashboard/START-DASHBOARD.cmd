@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\" (
  echo Dependencies are missing. Run npm install first.
  exit /b 1
)

call npm run dev -- --host 0.0.0.0
