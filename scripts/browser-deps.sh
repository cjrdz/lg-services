#!/usr/bin/env bash
# Librerías que Chromium necesita, instaladas SIN root.
#
# Playwright pide `sudo npx playwright install-deps`, pero acá no hace falta:
# se bajan los .deb y se extraen en el home. `scripts/smoke.mjs` los engancha
# con LD_LIBRARY_PATH.
set -euo pipefail

DEST="$HOME/.local/lib/playwright-deps"
PKGS=(libnspr4 libnss3 libasound2t64)

mkdir -p "$DEST/debs"
cd "$DEST/debs"

echo "Bajando: ${PKGS[*]}"
for p in "${PKGS[@]}"; do
  apt-get download "$p" >/dev/null 2>&1 && echo "  ✓ $p" || echo "  ✗ $p (¿nombre distinto en esta distro?)"
done

for d in *.deb; do
  [ -e "$d" ] || continue
  dpkg-deb -x "$d" "$DEST/root"
done

LIB="$DEST/root/usr/lib/x86_64-linux-gnu"
echo
echo "Extraídas en: $LIB"

SHELL_BIN=$(find "$HOME/.cache/ms-playwright" -name chrome-headless-shell -type f 2>/dev/null | head -1)
if [ -n "$SHELL_BIN" ]; then
  if LD_LIBRARY_PATH="$LIB" "$SHELL_BIN" --version >/dev/null 2>&1; then
    echo "✓ El navegador arranca. Ya podés correr: bun run smoke"
  else
    echo "✗ Todavía falta algo:"
    LD_LIBRARY_PATH="$LIB" ldd "$SHELL_BIN" 2>/dev/null | grep "not found" | sort -u
  fi
fi
