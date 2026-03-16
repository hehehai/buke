#!/usr/bin/env sh
set -eu

REPOSITORY="${BUKE_REPOSITORY:-hehehai/buke}"
INSTALL_DIR="${BUKE_INSTALL_DIR:-$HOME/.local/bin}"
REQUESTED_VERSION="${1:-${BUKE_VERSION:-}}"

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

download() {
  url="$1"
  output="$2"

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$output"
    return
  fi

  if command -v wget >/dev/null 2>&1; then
    wget -qO "$output" "$url"
    return
  fi

  printf 'curl or wget is required to install buke\n' >&2
  exit 1
}

resolve_version() {
  if [ -n "$REQUESTED_VERSION" ]; then
    printf '%s' "${REQUESTED_VERSION#v}"
    return
  fi

  tmp_json="$1"
  download "https://api.github.com/repos/$REPOSITORY/releases/latest" "$tmp_json"
  version=$(sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"v\([^"]*\)".*/\1/p' "$tmp_json" | head -n 1)

  if [ -z "$version" ]; then
    printf 'Failed to resolve latest release version\n' >&2
    exit 1
  fi

  printf '%s' "$version"
}

platform() {
  os=$(uname -s)
  arch=$(uname -m)

  case "$os/$arch" in
    Darwin/arm64)
      printf 'darwin-arm64'
      ;;
    Darwin/x86_64)
      printf 'darwin-x64'
      ;;
    Linux/x86_64)
      printf 'linux-x64'
      ;;
    *)
      printf 'Unsupported platform: %s/%s\n' "$os" "$arch" >&2
      printf 'Download a release manually from https://github.com/%s/releases\n' "$REPOSITORY" >&2
      exit 1
      ;;
  esac
}

need_cmd tar
need_cmd mktemp

tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT INT TERM

version=$(resolve_version "$tmp_dir/release.json")
target=$(platform)
asset="buke-v${version}-${target}.tar.gz"
url="https://github.com/${REPOSITORY}/releases/download/v${version}/${asset}"
archive_path="$tmp_dir/$asset"

download "$url" "$archive_path"
mkdir -p "$INSTALL_DIR"
tar -xzf "$archive_path" -C "$tmp_dir"
install -m 0755 "$tmp_dir/buke" "$INSTALL_DIR/buke"

printf 'Installed buke %s to %s/buke\n' "$version" "$INSTALL_DIR"
"$INSTALL_DIR/buke" --version

case ":$PATH:" in
  *":$INSTALL_DIR:"*)
    ;;
  *)
    printf '\nAdd %s to your PATH to run buke globally.\n' "$INSTALL_DIR"
    ;;
esac
