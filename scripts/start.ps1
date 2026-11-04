# Start sem CMD/pushd (UNC da NAS não funciona no cmd.exe).
# Uso: powershell -NoProfile -File .\scripts\start.ps1
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
node app.js
