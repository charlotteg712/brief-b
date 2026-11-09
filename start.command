#!/bin/bash
# Starts the Charlotte App (Mac). Double-click in Finder.
cd "$(dirname "$0")" || exit 1

if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack enable pnpm 2>/dev/null || sudo corepack enable pnpm
  fi
fi
if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found. Please install Node.js (https://nodejs.org), then run: npm i -g pnpm"
  read -n 1 -s -r -p "Press any key to exit..."
  exit 1
fi

pnpm install
pnpm dev --open
