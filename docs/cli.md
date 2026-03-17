# Buke CLI

Buke CLI 用于把任意网页打包成轻量桌面应用，核心运行时基于 Electrobun。

## 安装

### 1. Homebrew

```bash
brew install hehehai/tap/buke
```

### 2. Shell 一键安装

```bash
curl -fsSL https://raw.githubusercontent.com/hehehai/buke/main/scripts/install.sh | sh
```

也可以指定版本：

```bash
curl -fsSL https://raw.githubusercontent.com/hehehai/buke/main/scripts/install.sh | sh -s -- v0.2.2
```

### 3. npm

```bash
npm install -g @hehehai/buke
```

说明：npm 发布的是 Bun 运行时版本的 CLI，机器上仍需要先安装 Bun。若希望无 Bun 安装，请使用 Homebrew、Shell 安装脚本或 GitHub Release 二进制。

### 4. Bun

```bash
bun add -g @hehehai/buke
```

### 5. GitHub Releases

预编译 CLI 二进制会发布到：

- https://github.com/hehehai/buke/releases

当前计划提供：

- macOS arm64
- macOS x64
- Linux x64
- Windows x64

## 快速开始

```bash
buke pack https://www.kimi.com --name Kimi --force
```

也支持通过 `buke.pack.json` 注入样式/脚本（`inject` 字段），详见配置指南。

或初始化模板项目：

```bash
buke init https://example.com --name Example
cd example
bun install
bun run dev
```

## 命令

```bash
buke init <url> [--name <AppName>] [--out <dir>] [--id <bundleId>]
buke pack <url> [--name <AppName>] [--out <dir>] [--id <bundleId>] [--env dev|canary|stable] [--force]
buke pack --config <file> [--env dev|canary|stable] [--force]
buke dev [--cwd <dir>]
buke build [--cwd <dir>] [--env dev|canary|stable]
buke doctor [--fix]
```

## 常用参数

```text
-n, --name           App display name
-o, --out            Output directory
-i, --id             Bundle identifier (e.g. com.example.app)
-p, --partition      Webview session partition
-w, --width          Initial window width
-H, --height         Initial window height
--min-width          Minimum window width
--min-height         Minimum window height
--show-title-bar     Show window title bar
--hide-title-bar     Hide window title bar
--fullscreen         Launch app in fullscreen
--maximized          Launch app maximized
-I, --icon           App icon path or URL
--show-system-tray   Enable system tray
--system-tray-icon   Tray icon path or URL
--hide-on-close      Close button minimizes to tray
--user-agent         Override user agent (JS)
--proxy-url          Proxy URL (HTTP/HTTPS)
-s, --safe-top       macOS safe-area top padding
--safe-left          macOS safe-area left padding
--safe-right         macOS safe-area right padding
--safe-bottom        macOS safe-area bottom padding
--safe-off           Disable macOS safe-area padding
--config             Use pack config JSON
--refresh-builder    Recreate the cached builder workspace before packaging
--offline            Require a warm builder cache and skip cache hydration
-t, --template       Template directory override
-c, --cwd            Run command in target directory
-e, --env            Build env for release channel
--force              Overwrite existing output directory
```

## 开发与发布

本仓库新增了 3 条发布链路：

- GitHub Actions `CI`：类型检查和 CLI smoke test
- GitHub Actions `Release`：tag 发布 GitHub Release、npm 和 Homebrew
- GitHub Actions `Sync Homebrew Formula`：单独重推 brew formula

发布入口固定为：

```bash
git tag v0.2.2
git push origin v0.2.2
```

## 说明

- `buke pack` 仍然按当前宿主平台打包应用产物。
- GitHub Release 里的 CLI 二进制用于安装 `buke` 命令本身，不等同于 `buke pack` 生成的应用产物。
- `buke pack` 会复用 `~/.cache/buke` 中的 builder cache。
- 首次切换模板或 Electrobun 版本时，仍可能额外下载一次 Electrobun core binaries。
