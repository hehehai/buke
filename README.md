# Buke

Buke is a Pake-like Electrobun CLI for turning websites into lightweight desktop apps.

## Install

### Homebrew

```bash
brew install hehehai/tap/buke
```

### Shell installer

```bash
curl -fsSL https://raw.githubusercontent.com/hehehai/buke/main/scripts/install.sh | sh
```

### npm

```bash
npm install -g @hehehai/buke
```

`@hehehai/buke` runs on Bun. If you install it from npm, make sure Bun is already available on your machine. If you want a no-Bun install, use Homebrew, the shell installer, or the GitHub Releases binaries.

### GitHub Releases

Prebuilt CLI binaries are published for:

- macOS arm64
- macOS x64
- Linux x64
- Windows x64

Release downloads: https://github.com/hehehai/buke/releases

## Quick start

```bash
buke pack https://www.kimi.com --name Kimi --force
```

Or initialize a template project:

```bash
buke init https://example.com --name Example
cd example
bun install
bun run dev
```

## Development

```bash
bun install
bun run typecheck
bun run build:cli
```

Template live-preview:

```bash
bun run dev:template:kimi
```

## Release

Releases are driven by Git tags:

```bash
git tag v0.2.1
git push origin v0.2.1
```

The release workflow publishes:

- GitHub Release assets
- npm package `@hehehai/buke`
- Homebrew formula `hehehai/tap/buke`
- popular app bundles for macOS arm64/x64, Linux x64, and Windows x64

## Docs

- [CLI guide](docs/cli.md)
- [English config guide](docs/guide.en.md)
- [中文配置指南](docs/guide.zh.md)
- [JSON schema](docs/buke.schema.json)
- [Examples](packages/examples)
