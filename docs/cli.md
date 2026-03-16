# Buke CLI

Buke CLI 用于把任意网页打包成 Electrobun 原生应用（Pake-like 体验），适合快速生成轻量桌面壳。

> Electrobun 版本固定在模板中，当前为 `1.16.0`。

## 系统要求

- **Bun**: `>= 1.3`
- **macOS (推荐)**: 毛玻璃与原生拖拽区域仅在 macOS 生效
- **Xcode CLI Tools (macOS)**: 用于 `sips` / `iconutil` 生成图标

## 安装方式

### 1) npm（发布后）

```bash
npm install -g @buke/cli
# 或
pnpm add -g @buke/cli
```

### 2) Bun（发布后）

```bash
bun add -g @buke/cli
```

### 3) Homebrew（发布后）

```bash
brew install buke/tap/buke
```

### 4) 源码安装（推荐开发/试用）

```bash
git clone <your-repo>
cd Buke
bun install
bun run build:cli

# 直接运行
bun run packages/cli/dist/index.js --help

# 或者用本地脚本快捷调用
bun run cli -- help
```

## 快速开始

```bash
buke init https://example.com --name Example
cd example
bun install
bun run dev
```

一键打包：

```bash
buke pack https://example.com --name Example --force
```

## 命令说明

### `buke init <url>`

生成一个 Electrobun 项目模板。

常用参数：
- `--name <AppName>`：应用名称
- `--out <dir>`：输出目录（默认是 slug）
- `--id <bundleId>`：Bundle ID
- `--partition <name>`：Webview session partition
- `--fullscreen`：全屏启动
- `--maximized`：最大化启动
- `--hide-title-bar`：隐藏标题栏
- `--safe-top/left/right/bottom`：macOS safe-area padding
- `--safe-off`：关闭 safe-area padding

### `buke pack <url>`

在临时目录构建应用并输出打包结果（默认 `./dist/<slug>`）。

常用参数：
- `--name <AppName>`：应用名称
- `--out <dir>`：输出目录
- `--id <bundleId>`：Bundle ID
- `--env dev|canary|stable`：Electrobun 构建环境
- `--force`：覆盖已有输出目录

> 打包会优先复用 builder cache。首次切换模板或 Electrobun 版本时，仍可能做一次依赖预热和 Electrobun core binaries 下载。

使用配置文件：

```bash
buke pack --config ./buke.pack.json
```

配置文件可配合 JSON Schema（`docs/buke.schema.json`）获得类型提示。

示例配置可参考 `packages/examples`。

### `buke dev`

进入项目后启动开发模式（Electrobun dev）。

### `buke build`

在项目中构建应用（Electrobun build）。

## 全部参数（init / pack）

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
-t, --template       Template directory override
-c, --cwd            Run command in target directory
-e, --env            Build env for release channel
--force              Overwrite existing output directory
```

## 使用示例

```bash
# 打包 Kimi（极简默认配置）
buke pack https://www.kimi.com --name Kimi --force

# 指定窗口尺寸与最小尺寸
buke pack https://x.com --name X --width 1200 --height 780 --min-width 960 --min-height 640

# 最大化启动
buke pack https://example.com --name Example --maximized

# 隐藏标题栏
buke pack https://example.com --name Example --hide-title-bar
```

## 配置文件说明

生成项目后会带 `buke.config.json`，常用字段如下：

```json
{
  "name": "Example",
  "url": "https://example.com",
  "id": "com.buke.example",
  "templateVersion": "0.1.0"
}
```

## 说明与注意事项

- **默认显示标题栏**；如需更贴近 Pake，可用 `--hide-title-bar`。
- **safe-area 默认关闭**；仅在网站顶部 UI 被交通灯遮挡时再显式配置。
- **User-Agent** 仅做 JS 层覆盖（`navigator.userAgent`），网络层 UA 由 WebView 控制。
- **Proxy** 暂不支持 per-app 代理，`--proxy-url` 仅存储配置（请用系统代理）。
- **App 体积**：macOS 包内包含 Bun 运行时（约 58MB），体积主要由 Bun 决定。
- **多平台构建**：Electrobun 构建会生成当前系统平台的包；若要生成 Windows / Linux / macOS Intel，请在对应平台或 CI 环境运行 `buke pack`。

## 卸载

```bash
npm uninstall -g @buke/cli
# 或
brew uninstall buke
```
