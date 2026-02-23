# Buke CLI

Buke CLI 用于把任意网页打包成 Electrobun 原生应用（Pake-like 体验），适合快速生成轻量桌面壳。

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
--show-title-bar     macOS show title bar (默认隐藏)
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
-t, --template       Template directory override
-c, --cwd            Run command in target directory
-e, --env            Build env for release channel
--force              Overwrite existing output directory
```

## 使用示例

```bash
# 打包 Kimi，并设置 safe-area
buke pack https://www.kimi.com --name Kimi --safe-top 12 --force

# 指定窗口尺寸与最小尺寸
buke pack https://x.com --name X --width 1200 --height 800 --min-width 960 --min-height 640

# 托盘与关闭最小化
buke pack https://example.com --name Example --show-system-tray --hide-on-close

# 显示系统标题栏
buke pack https://example.com --name Example --show-title-bar
```

## 配置文件说明

生成项目后会带 `buke.config.json`，常用字段如下：

```json
{
  "url": "https://example.com",
  "partition": "persist:default",
  "window": {
    "width": 1200,
    "height": 800,
    "minWidth": 960,
    "minHeight": 640,
    "hideTitleBar": true
  },
  "tray": {
    "enabled": false,
    "icon": "",
    "hideOnClose": false
  },
  "network": {
    "userAgent": "",
    "proxyUrl": ""
  },
  "macosSafeArea": {
    "enabled": true,
    "top": 28,
    "left": 12,
    "right": 0,
    "bottom": 0
  },
  "inject": {
    "css": ["inject/custom.css"],
    "js": ["inject/custom.js"]
  }
}
```

## 说明与注意事项

- **默认隐藏标题栏**，只保留左上角红绿灯。
- **拖拽区域** 在窗口顶部；如网站 UI 被遮挡，可通过 `--safe-top` 增大拖拽区与安全边距。
- **User-Agent** 仅做 JS 层覆盖（`navigator.userAgent`），网络层 UA 由 WebView 控制。
- **Proxy** 暂不支持 per-app 代理，`--proxy-url` 仅存储配置（请用系统代理）。
- **App 体积**：macOS 包内包含 Bun 运行时（约 58MB），体积主要由 Bun 决定。

## 卸载

```bash
npm uninstall -g @buke/cli
# 或
brew uninstall buke
```
