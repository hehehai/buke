# Buke Configuration Guide (EN)

Buke CLI wraps any website into a lightweight Electrobun desktop app. This guide focuses on **pack config files** and parameters.

## Quick Start

```bash
# Pack with a URL
buke pack https://www.kimi.com --name Kimi --force

# Pack with a JSON config file
buke pack --config ./buke.pack.json
```

> Electrobun version follows npm `latest` (as of **2026-02-25**, it is `1.14.4`).

## Config File Structure

Use the JSON schema at `docs/buke.schema.json` for autocompletion and validation.

```json
{
  "name": "Kimi",
  "id": "com.buke.kimi",
  "url": "https://www.kimi.com",
  "partition": "persist:kimi",
  "icon": "./assets/icon.png",
  "outDir": "dist/kimi",
  "env": "dev",
  "window": {
    "width": 1200,
    "height": 800,
    "minWidth": 960,
    "minHeight": 640,
    "hideTitleBar": true
  },
  "tray": {
    "enabled": false,
    "icon": "./assets/tray.png",
    "hideOnClose": false
  },
  "network": {
    "userAgent": "",
    "proxyUrl": ""
  },
  "macosSafeArea": {
    "enabled": true,
    "top": 12,
    "left": 0,
    "right": 0,
    "bottom": 0
  }
}
```

## Field Reference

### Top-level

- `name`: App display name (defaults to URL host).
- `id`: Bundle identifier (default `com.buke.<slug>`).
- `url`: Target website URL (required).
- `partition`: Webview session partition (default `persist:default`).
- `icon`: App icon path or URL.
- `outDir`: Pack output directory (default `dist/<slug>`).
- `env`: Build environment `dev | canary | stable`.

### window

- `width` / `height`: Initial window size.
- `minWidth` / `minHeight`: Minimum size.
- `hideTitleBar`: Hide title bar on macOS (default true, uses hidden style with no inset).

### tray

- `enabled`: Enable system tray.
- `icon`: Tray icon path or URL.
- `hideOnClose`: Close button minimizes to tray.

### network

- `userAgent`: Override User-Agent (JS side).
- `proxyUrl`: Proxy URL (note: Electrobun does not support per-app proxy yet).

### macosSafeArea

- `enabled`: Enable safe-area padding.
- `top/left/right/bottom`: Padding values in px (set `top` only to avoid header overlap).

## Size Optimization Tips

- Use `--env stable` (or `env: "stable"` in config) for release builds.
- The template enables `build.bun.minify` and a `postPackage` cleanup script that removes `.map/.dSYM` debug artifacts.
- The template enables `build.useAsar` by default (disable it if native modules break).
- Pack uses `bun install --production` by default to avoid dev dependencies.

## Multi-platform Builds

Electrobun packages for the **current host platform**:

- macOS ARM64/Intel: run `buke pack` on the corresponding macOS machine
- Windows: run `buke pack` on Windows
- Linux: run `buke pack` on Linux

For CI, run per-OS jobs and compare sizes with `du -sh dist/*` (macOS/Linux) or `Get-ChildItem dist -Recurse | Measure-Object -Property Length -Sum` (Windows).

## Override Rules

CLI flags override config file values. Example:

```bash
buke pack --config ./buke.pack.json --safe-top 12
```

The CLI flag takes precedence.

## Example configs

See `packages/examples` for Kimi, WeRead, Twitter, DeepSeek, YouTube, YouTube Music, Excalidraw, and XiaoHongShu.
