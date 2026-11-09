#!/bin/bash
# One-time setup of the Charlotte App on a Mac.
#
# Usage:   bash setup-mac.sh <git-repo-url> [target-folder]
# Example: bash setup-mac.sh https://github.com/USER/charlotte-app.git ~/Charlotte-App
#
# Installs (only if missing): Homebrew, git, git-lfs, Node.js, pnpm.
# Then clones the repo, installs dependencies and makes start.command executable.
# Safe to run more than once.
#
# NOTE FOR CLAUDE: Homebrew's installer asks for the Mac password and may open a
# dialog for the Xcode Command Line Tools. Tell the user to enter the password in the
# terminal / confirm the dialog, then wait for the script to finish.

set -euo pipefail

REPO_URL="${1:-}"
TARGET="${2:-$HOME/Charlotte-App}"

if [ -z "$REPO_URL" ]; then
  echo "Usage: bash setup-mac.sh <git-repo-url> [target-folder]"
  exit 1
fi

if [ "$(uname)" != "Darwin" ]; then
  echo "This script is for macOS only."
  exit 1
fi

step() { echo; echo "==> $*"; }

# --- Homebrew (also installs the Xcode Command Line Tools if needed) ---
load_brew() {
  if [ -x /opt/homebrew/bin/brew ]; then eval "$(/opt/homebrew/bin/brew shellenv)";
  elif [ -x /usr/local/bin/brew ]; then eval "$(/usr/local/bin/brew shellenv)"; fi
}
load_brew
if ! command -v brew >/dev/null 2>&1; then
  step "Installing Homebrew (you may be asked for your Mac password)"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  load_brew
fi

# --- git, git-lfs, node ---
step "Installing git, git-lfs and Node.js (skipped if already present)"
command -v git >/dev/null 2>&1 && git --version >/dev/null 2>&1 || brew install git
command -v git-lfs >/dev/null 2>&1 || brew install git-lfs
command -v node >/dev/null 2>&1 || brew install node
git lfs install

# --- pnpm ---
if ! command -v pnpm >/dev/null 2>&1; then
  step "Installing pnpm"
  npm install -g pnpm || sudo npm install -g pnpm
fi

# --- clone the project ---
if [ -d "$TARGET/.git" ]; then
  step "Project already exists in $TARGET, updating"
  git -C "$TARGET" pull
else
  step "Cloning project into $TARGET"
  git clone "$REPO_URL" "$TARGET"
fi

cd "$TARGET"
git lfs pull || true

step "Installing project dependencies"
pnpm install

chmod +x start.command
# Remove the macOS quarantine flag so a double-click works right away
xattr -d com.apple.quarantine start.command 2>/dev/null || true

step "Done!"
echo "Start the app by double-clicking start.command in: $TARGET"
echo "or run:  cd \"$TARGET\" && pnpm dev --open"
