# Buke

A lightweight, Electrobun-based “Pake-like” toolchain for wrapping web apps into desktop shells.

## Quick start

```bash
# from repo root
bun install
bun run cli -- init https://example.com --name Example
cd example
bun install
bun run dev
```

## Repo layout

- `packages/cli` – Bun-based CLI to scaffold and build apps.
- `packages/template` – Electrobun app template used by `buke init`.
- `docs/roadmap.md` – Phased feature roadmap and delivery plan.

## CLI

See `docs/cli.md` for full install and usage guide.

```bash
buke init <url> [--name <AppName>] [--out <dir>] [--id <bundleId>] [--partition <name>]
buke pack <url> [--name <AppName>] [--out <dir>] [--id <bundleId>] [--env dev|canary|stable] [--force]
buke dev [--cwd <dir>]
buke build [--cwd <dir>] [--env dev|canary|stable]
```

## Notes

- Template is optimized for lightweight builds via system WebView.
- `buke.config.json` supports window sizing, tray options, safe-area padding, injection, allowlist, zoom, and partition.
- `buke pack` builds in a temp directory and outputs to `./dist/<slug>` by default (`--force` overwrites).
- macOS: native blur + traffic lights via `native/macos/window-effects.mm`.
- Electrobun APIs are evolving; keep template in sync with upstream docs.

### Common flags

- `--icon <path|url>`: app icon (mac iconset/PNG, win ICO, linux PNG).
- `--width/--height`: initial window size (defaults 1200x800).
- `--min-width/--min-height`: minimum window size (defaults 960x640).
- `--show-title-bar`: show macOS title bar (default hides).
- `--show-system-tray`: enable tray icon + menu.
- `--system-tray-icon`: tray icon path/URL (defaults to app icon).
- `--hide-on-close`: minimize to tray instead of quitting.
- `--user-agent`: override JS user agent (best-effort).
- `--proxy-url`: store proxy URL in config (use system proxy).
- `--safe-top/left/right/bottom`: macOS safe-area padding.
- `--safe-off`: disable safe-area padding.
