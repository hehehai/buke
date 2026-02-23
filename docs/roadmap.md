# Buke Roadmap (Lightweight Pake-like)

## Phase 0 — Foundation (Now)
- Monorepo layout with Bun workspaces.
- Bun-based CLI (`buke`) with `init/dev/build` commands.
- Electrobun template with WebView wrapper and URL binding.
- Basic config file for metadata and reproducible builds.

## Phase 1 — MVP Web Shell
- App name, identifier, URL injection from CLI.
- Basic window controls (size, title, reload).
- Simple app menu with reload, open devtools.
- URL allowlist + HTTPS guard.

## Phase 2 — Pake-style Enhancements
- CSS/JS injection hooks.
- Custom user agent and zoom/scale settings.
- Window presets: compact/standard/fullscreen.
- Cache management and data reset.

## Phase 3 — Packaging & Updates
- Release channels (dev/canary/stable).
- Auto-update wiring with artifact hosting.
- Code signing + notarization guides (macOS).
- CI release pipeline templates.

## Phase 4 — Pro Features
- Multi-window support.
- Plugin hooks for pre/post build.
- App presets / templates registry.
- Telemetry opt-in + diagnostics bundle.
