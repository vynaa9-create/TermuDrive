#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
MIN_NODE="22.13.0"

say() { printf '%s\n' "[TermuDrive] $*"; }
fail() { printf '%s\n' "[TermuDrive] ERROR: $*" >&2; exit 1; }

command -v node >/dev/null 2>&1 || fail "Node.js is missing. Run: pkg install nodejs"
node -e 'const a=process.versions.node.split(".").map(Number),b=[22,13,0];process.exit(a[0]>b[0]||a[0]===b[0]&&(a[1]>b[1]||a[1]===b[1]&&a[2]>=b[2])?0:1)' || fail "Node.js >= $MIN_NODE is required; found $(node -v)."
command -v npm >/dev/null 2>&1 || fail "npm is missing. Reinstall the Termux nodejs package."

mkdir -p "$APP_DIR/data/backups" "$APP_DIR/runtime" "$APP_DIR/logs"
chmod 700 "$APP_DIR/data" "$APP_DIR/runtime" "$APP_DIR/logs"
say "Installing portable JavaScript dependencies..."
cd "$APP_DIR"
if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
node -e "import('./src/database/index.js').then(m=>{m.openDatabase();m.closeDatabase()})"

BIN_DIR="${PREFIX:-$HOME/.local}/bin"
mkdir -p "$BIN_DIR"
LAUNCHER="$BIN_DIR/termudrive"
printf '#!/data/data/com.termux/files/usr/bin/bash\nexec node %q "$@"\n' "$APP_DIR/cli/termudrive.js" > "$LAUNCHER"
chmod 700 "$LAUNCHER" "$APP_DIR/cli/termudrive.js"

if [ "${1:-}" = "--update" ]; then say "Update installed; database was backed up automatically before schema changes."; else say "Installation complete."; fi
say "Command: $LAUNCHER"
say "Next: termudrive doctor && termudrive start"
say "Dashboard: http://127.0.0.1:8765"
