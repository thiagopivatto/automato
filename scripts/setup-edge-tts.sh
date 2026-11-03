#!/usr/bin/env bash
# Instala edge-tts em venv local (.venv-tts) — evita erro PEP 668 no Debian/Ubuntu.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v python3 >/dev/null 2>&1; then
  echo "Instale python3: sudo apt install python3 python3-venv python3-full"
  exit 1
fi

if [ ! -d .venv-tts ]; then
  echo "Criando .venv-tts ..."
  python3 -m venv .venv-tts
fi

echo "Instalando edge-tts ..."
./.venv-tts/bin/pip install -U pip edge-tts

./.venv-tts/bin/python -c "import edge_tts; print('OK edge-tts', getattr(edge_tts, '__version__', ''))"
echo ""
echo "Pronto. Reinicie o bot (pm2 restart automato)."
echo "O TTS usa automaticamente: $(pwd)/.venv-tts/bin/python"
