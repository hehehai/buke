# Buke Configuration Guide (EN)

Buke CLI wraps any website into a lightweight Electrobun desktop app. This guide focuses on **pack config files** and parameters.

## Install

- Homebrew: `brew install hehehai/tap/buke`
- Shell installer: `curl -fsSL https://raw.githubusercontent.com/hehehai/buke/main/scripts/install.sh | sh`
- npm: `npm install -g @hehehai/buke` (Bun runtime still required)
- Releases: https://github.com/hehehai/buke/releases

## Quick Start

```bash
# Pack with a URL
buke pack https://www.kimi.com --name Kimi --force

# Pack with a JSON config file
buke pack --config ./buke.pack.json
```

> Electrobun is pinned in the template. Current version: `1.16.0`.

## Config File Structure

Use the JSON schema at `docs/buke.schema.json` for autocompletion and validation.

```json
{
  "name": "Kimi",
  "url": "https://www.kimi.com"
}
```

## Field Reference

### Top-level

- `name`: App display name (defaults to URL host).
- `id`: Bundle identifier (default `com.buke.<slug>`).
- `url`: Target website URL (required).
- `partition`: Webview session partition (default `persist:default`). Usually not needed.
- `icon`: App icon path or URL.
- `outDir`: Pack output directory (default `dist/<slug>`).
- `env`: Build environment `dev | canary | stable`.
- `about`: Configure the About menu section.
- `locale`: Preferred locale string (for example `"en"` or `"zh-CN"`). Used for HTML `lang` and menu label fallback context.
- `i18n.menu`: Custom label overrides keyed by menu token (for example `"reload": "重新加载"`).

### about

- `enabled`: Whether to show the About menu (default `true`).
- `items`: Array of menu items, supports:
  - Link item: `{ "label": "xxx", "url": "https://..." }`
  - Separator item: `{ "separator": true }`

If `items` is omitted, a default entry labeled with the app name (for example `Kimi`) is added automatically, and it opens the app URL in the system default browser.

### i18n

- `i18n`: Internationalization config for runtime UI.
- `i18n.menu`: Map of built-in menu labels.

If you only set `locale`, menus will use built-in presets automatically (20+ locales supported). `i18n.menu` still overrides any preset keys.

Supported menu keys:

- `view`, `window`, `about`
- `reload`, `toggleDevTools`, `clearSiteData`, `closeWindow`, `quit`
- `zoomIn`, `zoomOut`, `zoomReset`
- `compact`, `standard`, `wide`

All keys are optional. Missing keys fall back to English.

Built-in supported locales:

- `en`, `en-US`, `en-GB`
- `zh-CN`, `zh-Hans`, `zh-SG`
- `zh-TW`, `zh-HK`, `zh-Hant`
- `ja`, `ja-JP`
- `ko`, `ko-KR`
- `fr`, `fr-FR`
- `de`, `de-DE`
- `es`, `es-ES`
- `it`, `it-IT`
- `pt`, `pt-BR`, `pt-PT`
- `ru`
- `ar`
- `tr`
- `vi`
- `id`
- `th`
- `nl`
- `sv`
- `no`
- `da`
- `fi`

### window

- `width` / `height`: Initial window size. Defaults to `1200 x 780`.
- `minWidth` / `minHeight`: Minimum size.
- `hideTitleBar`: Hide the macOS title bar. Default `false`.
- `fullscreen`: Launch in fullscreen. Default `false`.
- `maximized`: Launch maximized. Default `false`.

### tray

- `enabled`: Enable system tray.
- `icon`: Tray icon path or URL.
- `hideOnClose`: Close button minimizes to tray. Default is platform-aware: `true` on macOS, `false` on Windows/Linux.

### network

- `userAgent`: Override User-Agent (JS side).
- `proxyUrl`: Proxy URL (note: Electrobun does not support per-app proxy yet).

### inject

- `inject.css`: CSS content to inject. Supports:
  - Inline code by prefixing with `inline:`
  - Relative/absolute file path, resolved against config file directory
- `inject.js`: JavaScript content to inject. Same formats as `inject.css`.

Example:

```json
{
  "inject": {
    "css": [
      "inline:body { background: #111 !important; }",
      "./assets/extra.css"
    ],
    "js": [
      "./assets/force-dark.js"
    ]
  }
}
```

### macosSafeArea

- `enabled`: Enable safe-area padding. Default `false`.
- `top/left/right/bottom`: Padding values in px when enabled.

## Size Optimization Tips

- Use `--env stable` (or `env: "stable"` in config) for release builds.
- The template enables `build.bun.minify` and a `postPackage` cleanup script that removes `.map/.dSYM` debug artifacts.
- The template enables `build.useAsar` by default (disable it if native modules break).
- Pack reuses a cached builder workspace. First build on a new template or Electrobun version may still hydrate dependencies and download Electrobun core binaries once.

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

See `packages/examples` for minimal Pake-style configs.
