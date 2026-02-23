#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_ROOT=$(cd "${SCRIPT_DIR}/.." && pwd)
NATIVE_DIR="${PROJECT_ROOT}/native/macos"
OUT_DIR="${PROJECT_ROOT}/src/bun"
OUT_LIB="${OUT_DIR}/libMacWindowEffects.dylib"

mkdir -p "${OUT_DIR}"

if [[ "$(uname)" != "Darwin" ]]; then
  echo "Skipping macOS native effects build (not macOS)."
  echo "" > "${OUT_LIB}"
  exit 0
fi

if ! command -v xcrun >/dev/null 2>&1; then
  echo "xcrun not found. Please install Xcode command line tools."
  exit 1
fi

xcrun clang++ -std=c++17 -fobjc-arc \
  -framework Cocoa \
  -dynamiclib \
  "${NATIVE_DIR}/window-effects.mm" \
  -o "${OUT_LIB}"

echo "Built ${OUT_LIB}"
