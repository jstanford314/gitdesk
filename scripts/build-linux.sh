#!/usr/bin/env bash
# Builds GitDesk for Linux: detects your distro, makes sure Node.js/npm and
# git are available, installs project dependencies, and packages the app
# with electron-builder into the appropriate installer format(s) for your
# system (AppImage always; deb/rpm/pacman added when that package manager
# is detected). Run it from anywhere after cloning the repo:
#
#   ./scripts/build-linux.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MIN_NODE_MAJOR=18

log() { printf '\033[1;36m==>\033[0m %s\n' "$1"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$1"; }
die() {
  printf '\033[1;31merror:\033[0m %s\n' "$1" >&2
  exit 1
}

if [[ "$(uname -s)" != "Linux" ]]; then
  die "This script is for Linux. Use scripts/build-windows.ps1 on Windows, or 'npm run dist:mac' on macOS."
fi

# --- Detect distro family -------------------------------------------------
DISTRO_ID=unknown
DISTRO_LIKE=""
if [[ -f /etc/os-release ]]; then
  # shellcheck disable=SC1091
  source /etc/os-release
  DISTRO_ID="${ID:-unknown}"
  DISTRO_LIKE="${ID_LIKE:-}"
fi
log "Detected distro: ${PRETTY_NAME:-$DISTRO_ID} (id=$DISTRO_ID, like=${DISTRO_LIKE:-none})"

family="unknown"
PKG_INSTALL=()
case "$DISTRO_ID $DISTRO_LIKE" in
  *debian*|*ubuntu*) family="debian"; PKG_INSTALL=(sudo apt-get install -y) ;;
  *fedora*|*rhel*|*centos*) family="fedora"; PKG_INSTALL=(sudo dnf install -y) ;;
  *arch*|*manjaro*) family="arch"; PKG_INSTALL=(sudo pacman -S --noconfirm) ;;
  *suse*) family="suse"; PKG_INSTALL=(sudo zypper install -y) ;;
esac

# --- Ensure git is available ----------------------------------------------
if ! command -v git >/dev/null 2>&1; then
  warn "git not found."
  if [[ ${#PKG_INSTALL[@]} -gt 0 ]]; then
    log "Installing git via ${PKG_INSTALL[0]}..."
    "${PKG_INSTALL[@]}" git
  else
    die "Please install git manually, then re-run this script."
  fi
fi

# --- Ensure Node.js/npm are available and recent enough -------------------
node_ok=false
if command -v node >/dev/null 2>&1; then
  node_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  if [[ "$node_major" -ge "$MIN_NODE_MAJOR" ]]; then
    node_ok=true
  else
    warn "Found Node.js $(node -v), but $MIN_NODE_MAJOR+ is required."
  fi
else
  warn "Node.js not found."
fi

if [[ "$node_ok" != true ]]; then
  log "Installing a current Node.js via NodeSource setup script..."
  if [[ ${#PKG_INSTALL[@]} -gt 0 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x 2>/dev/null | sudo -E bash - >/dev/null 2>&1 || true
    if [[ "$family" == "debian" ]]; then
      sudo apt-get install -y nodejs || die "Automatic Node.js install failed. Install Node.js 18+ manually from https://nodejs.org and re-run."
    else
      warn "Could not auto-install Node.js for this distro."
      die "Install Node.js 18+ manually from https://nodejs.org (or via nvm) and re-run this script."
    fi
  else
    die "Install Node.js 18+ manually from https://nodejs.org (or via nvm) and re-run this script."
  fi
fi

log "Using Node.js $(node -v) / npm $(npm -v)"

# --- Pick Linux package targets for this distro ---------------------------
targets=(AppImage)
case "$family" in
  debian) targets+=(deb) ;;
  fedora|suse) targets+=(rpm) ;;
  arch) targets+=(pacman) ;;
esac
log "Building targets: ${targets[*]}"

# --- Install deps and build -------------------------------------------------
cd "$PROJECT_DIR"
log "Installing project dependencies (npm ci)..."
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

log "Compiling GitDesk (electron-vite build)..."
npm run build

log "Packaging Linux installer(s) with electron-builder..."
npx electron-builder --linux "${targets[@]}"

echo
log "Done. Build artifacts are in: $PROJECT_DIR/release"
ls -1 "$PROJECT_DIR/release" 2>/dev/null | sed 's/^/  - /' || true
