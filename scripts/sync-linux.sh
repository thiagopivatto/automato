#!/usr/bin/env bash
# Sincroniza o projeto do NAS/Documentos → ~/automato (Linux).
# Uso: bash scripts/sync-linux.sh
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${HOME}/automato"

echo "Origem : $SRC"
echo "Destino: $DEST"
echo "Build  : veja BUILD_ID no boot (deve ser 20261103-evon)"

mkdir -p "$DEST"
rsync -a --delete \
  --exclude node_modules \
  --exclude sessao \
  --exclude dados \
  --exclude .git \
  --exclude temp \
  --exclude '*.log' \
  "$SRC"/ "$DEST"/

echo ""
echo "Código sincronizado (sessao/dados preservados no destino)."
echo "Agora:"
echo "  cd ~/automato"
echo "  # se node_modules estiver velho:"
echo "  npm install @whiskeysockets/baileys@7.0.0-rc14 --ignore-scripts"
echo "  node node_modules/@whiskeysockets/baileys/engine-requirements.js || true"
echo "  node -e \"import('./scripts/patch-baileys-group-status.js').then(m=>m.aplicarPatchStatus())\""
echo "  # PARE o bot no Windows antes:"
echo "  npm start"
