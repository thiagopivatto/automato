# Start sem CMD/pushd (UNC da NAS não funciona no cmd.exe).
# Uso: .\start.ps1   ou   powershell -NoProfile -File .\start.ps1
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
node app.js
