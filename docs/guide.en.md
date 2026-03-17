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
- `allowlist`: Allowed hostnames or URL patterns outside the base host (for example `accounts.google.com`, `*.stripe.com`, `https://*.example.com/*`).
- For multi-level hostnames, the domain chain is expanded automatically (for example `www.kimi.com` will also allow `kimi.com` and its wildcard subdomain scope), so subdomains like `*.kimi.com` are supported.
- For non-subdomain base hosts, Buke also supports fuzzy matching across TLD variants, so `weibo.com` can match `weibo.cn`/`weibo.net`-type variants for the same brand/domain prefix.
- The default allowlist already includes `http://localhost`, `https://localhost`, `http://127.0.0.1`, `https://127.0.0.1`, and `chrome-extension://*` to reduce false-blocking in local debugging and embedded integration cases.

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

- `operations`, `view`, `window`, `about`, `edit`, `history`
- `back`, `forward`, `home`, `refresh`
- `reload`, `toggleDevTools`, `clearSiteData`, `clearCacheRestart`, `closeWindow`, `quit`
- `zoomIn`, `zoomOut`, `zoomReset`
- `compact`, `standard`, `wide`
- `clearHistory`, `copyUrl`, `alwaysOnTop`, `newWindow`, `pasteMatchStyle`

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
- `alwaysOnTop`: Keep window above all others. Default `false`.
- `title`: Override window title. Defaults to the app name.

### tray

- `enabled`: Enable system tray.
- `icon`: Tray icon path or URL.
- `hideOnClose`: Close button minimizes to tray. Default is platform-aware: `true` on macOS, `false` on Windows/Linux.

### network

- `userAgent`: Override User-Agent (JS side).
- `proxyUrl`: Proxy URL (note: Electrobun does not support per-app proxy yet).

### navigation

- `forceInternalNavigation`: Redirect all navigations (including popups) into the main webview. Default `false`.
- `internalUrlRegex`: Regex pattern for URLs to keep in-app. URLs matching this pattern stay in the webview; others follow normal popup rules.
- `disabledWebShortcuts`: Block `Ctrl/Cmd+key` keyboard shortcuts on the web page. Default `false`. Standard clipboard shortcuts (Ctrl/Cmd+A/C/V/X/Z) are preserved.
- `newWindow`: Allow popup windows for auth flows and other window.open calls. Default `false`.

### instance

- `multiInstance`: Allow multiple app instances to run simultaneously. Default `false` (single-instance by default using file lock).
- `activationShortcut`: Global shortcut to toggle window visibility (e.g. `"CmdOrControl+Shift+P"`).

### runtime

- `darkMode`: Force dark color scheme in the webview. Default `false`.
- `startToTray`: Start the app hidden (minimized to tray). Requires `tray.enabled: true`. Default `false`.
- `debug`: Enable verbose console logging and auto-open DevTools on launch. Default `false`.
- `incognito`: Use a non-persisting session partition (no cookies/storage saved after restart). Default `false`.
- `enableDragDrop`: Enable file drag and drop support in the webview. Default `false`.
- `pastePlainText`: Force paste as plain text (strips formatting). Default `false`.
- `ignoreCertificateErrors`: Ignore TLS certificate errors (use with caution). Default `false`.
- `wasm`: Enable WebAssembly CORS isolation headers. Default `false`.
- `camera`: Request camera permission (macOS entitlement). Default `false`.
- `microphone`: Request microphone permission (macOS entitlement). Default `false`.
- `multiWindow`: Enable multi-window support via menu. Default `false`.

### build

- `appVersion`: Application version string (injected into `electrobun.config.ts`).
- `install`: Install app to `/Applications` (macOS) after build. Default `false`.
- `iterativeBuild`: Skip DMG/installer, produce app bundle only. Default `false`.

### zoom

- `zoom`: Zoom level for the webview. Accepts `0.5`-`2.0` (fractional) or `50`-`200` (percentage, auto-divided by 100). Persisted in settings.

### App Presets

You can use preset names instead of URLs for popular apps:

```bash
buke pack deepseek       # → https://chat.deepseek.com/
buke pack chatgpt        # → https://chatgpt.com/
buke pack youtube        # → https://www.youtube.com/
buke pack github         # → https://github.com/
buke pack twitter        # → https://x.com/
```

Available presets: `chatgpt`, `claude`, `deepseek`, `discord`, `excalidraw`, `figma`, `github`, `google-maps`, `google-translate`, `hacker-news`, `kimi`, `notion`, `poe`, `reddit`, `spotify`, `twitter`, `whatsapp`, `x`, `youtube`.

### Local File Packaging

You can package a local HTML file instead of a URL:

```bash
buke pack https://localhost --use-local-file ./index.html
```

### Built-in Runtime Features

The following features are automatically active in every Buke app:

- **Keyboard shortcuts** (when `disabledWebShortcuts` is not set): `Cmd/Ctrl+[` back, `Cmd/Ctrl+]` forward, `Cmd/Ctrl+R` reload, `Cmd/Ctrl+↑` scroll top, `Cmd/Ctrl+↓` scroll bottom, `Cmd/Ctrl+-/+/0` zoom.
- **Download detection**: Clicks on downloadable files (65+ types: PDF, ZIP, EXE, etc.) are intercepted and saved to `~/Downloads` with a toast notification and system notification.
- **Right-click context menu**: Right-clicking images/videos/links shows a custom menu with "Download", "Copy Address", and "Open in Browser" options. Theme-aware (light/dark).
- **Fullscreen polyfill**: HTML5 Fullscreen API (`requestFullscreen`) is bridged to native window fullscreen. Works with YouTube, Bilibili, etc. Escape exits fullscreen.
- **Toast notifications**: In-page toast messages (bottom-right, auto-dismiss) for download status and other events.
- **Notification API override**: Web `Notification` calls are forwarded to OS native notifications.
- **Theme detection**: MutationObserver watches for page theme changes (`.dark` class, `data-theme` attribute, `color-scheme` style) and syncs with system preferences.
- **Chinese IME fix**: Prevents `Process` key event propagation issues in Safari-based WebView.
- **SPA navigation tracking**: Patches `history.pushState/replaceState` to detect client-side navigation for history menu.
- **Window state memory**: Window size is saved to `settings.json` on resize and restored on next launch.

### Menus

The app menu includes:

- **App menu**: New Window (if `multiWindow`), Reload, Toggle DevTools, Clear Site Data, Clear Cache & Restart, Close Window, Quit.
- **Edit menu** (macOS): Undo, Redo, Cut, Copy, Paste, Select All, Copy URL (`Cmd+L`).
- **View menu**: Zoom In/Out/Reset, Fullscreen toggle (macOS).
- **Operations menu**: Back, Forward, Home, Refresh, History submenu (last 100 visited pages).
- **Window menu**: Always on Top toggle (with checkmark), Compact/Standard/Wide presets.
- **About menu**: Custom links configured via `about.items`.

### Navigation and popup (OAuth login)

- By default, the main window only allows navigation to the base URL host and `allowlist` patterns; other top-level navigations are blocked in `will-navigate`.
- For `window.open`, OAuth-related popups (for example Google/Twitter login flows) are first opened in an app window and the popup instance is reused to avoid multiple blank windows.
- Non-auth popups still open in the system default browser.
- If login popup still fails:
  - Check whether it redirects to `accounts.google.com` or `*.twitter.com` (should use the in-app popup).
  - Add those hosts to `allowlist` and restart the app.
  - Keep `partition` stable to avoid login session reset.

### What `allowlist` does

- `allowlist` only affects cross-domain navigation policy in the main webview, and does not affect CSS/JS injection, window settings, or menu behavior.
- The default allowlist already includes local development sources: `http://localhost`, `https://localhost`, `http://127.0.0.1`, `https://127.0.0.1`, and `chrome-extension://*`. Beyond those built-ins, if you do not add any extra rules, the main window still only allows the base host plus `about:`/`data:`.
- Only URLs matching `allowlist` hosts/patterns are allowed through `setNavigationRules`; others are blocked and logged as `Navigation blocked` in `will-navigate`.
- Popup windows get their own dynamic rules so OAuth redirect chains are less likely to be broken.
- You can explicitly allow third-party login domains, e.g.:
  - `"accounts.google.com"`
  - `"twitter.com"`
  - `"https://id.example.com/*"`

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

For CI, run per-OS jobs. This repository's release workflow now builds app bundles on `macos-latest`, `macos-13`, `ubuntu-latest`, and `windows-latest`, then publishes only renamed archive assets such as `excalidraw-stable-macos-arm64.tar.zst` instead of raw internal Electrobun files.

## Override Rules

CLI flags override config file values. Example:

```bash
buke pack --config ./buke.pack.json --safe-top 12
```

The CLI flag takes precedence.

## Example configs

See `packages/examples` for minimal Pake-style configs.

### Recommended allowlist snippet

```json
{
  "allowlist": [
    "accounts.google.com",
    "twitter.com",
    "x.com",
    "https://id.example.com/*",
    "https://oauth.example.com/*"
  ]
}
```

### Full sample config

```json
{
  "name": "Kimi",
  "url": "https://www.kimi.com",
  "icon": "https://example.com/icon.png",
  "zoom": 100,
  "window": {
    "width": 1200,
    "height": 780,
    "minWidth": 960,
    "minHeight": 640,
    "hideTitleBar": true,
    "alwaysOnTop": false,
    "title": "Kimi AI"
  },
  "navigation": {
    "forceInternalNavigation": false,
    "internalUrlRegex": ".*\\.kimi\\.com",
    "disabledWebShortcuts": false,
    "newWindow": true
  },
  "instance": {
    "multiInstance": false,
    "activationShortcut": "CmdOrControl+Shift+K"
  },
  "runtime": {
    "darkMode": false,
    "debug": false,
    "incognito": false,
    "enableDragDrop": false,
    "pastePlainText": false,
    "multiWindow": false
  },
  "build": {
    "appVersion": "1.0.0"
  },
  "about": {
    "enabled": true,
    "items": [
      { "label": "Website", "url": "https://www.kimi.com" },
      { "separator": true },
      { "label": "Privacy", "url": "https://www.kimi.com/privacy" }
    ]
  },
  "allowlist": [
    "accounts.google.com",
    "twitter.com",
    "x.com",
    "https://id.kimi.com/*"
  ],
  "inject": {
    "css": [
      "inline: body { background: #fff !important; }"
    ],
    "js": [
      "inline: document.body.classList.add('buke-managed');"
    ]
  }
}
```
