# Buke 配置指南（中文）

Buke CLI 用于把网页快速打包成 Electrobun 桌面应用。本文聚焦 **打包配置文件** 与参数说明。

## 安装

- Homebrew：`brew install hehehai/tap/buke`
- Shell 一键安装：`curl -fsSL https://raw.githubusercontent.com/hehehai/buke/main/scripts/install.sh | sh`
- npm：`npm install -g @hehehai/buke`（仍需要 Bun 运行时）
- Releases：https://github.com/hehehai/buke/releases

## 快速开始

```bash
# 使用 URL 直接打包
buke pack https://www.kimi.com --name Kimi --force

# 使用配置文件打包
buke pack --config ./buke.pack.json
```

> Electrobun 版本固定在模板中，当前为 `1.16.0`。

## 配置文件结构

配置文件为 JSON，建议配合 `docs/buke.schema.json` 获取类型提示与校验。

```json
{
  "name": "Kimi",
  "url": "https://www.kimi.com"
}
```

## 参数说明

### 顶层字段

- `name`：应用显示名称（默认取 URL host）。
- `id`：Bundle ID（默认 `com.buke.<slug>`）。
- `url`：网页地址（必填）。
- `partition`：Webview session partition（默认 `persist:default`），大多数情况下不需要显式配置。
- `icon`：应用图标路径或 URL。
- `outDir`：打包输出目录（默认 `dist/<slug>`）。
- `env`：构建环境，`dev | canary | stable`。
- `about`：配置应用菜单里的 About 区域。
- `locale`：语言标识（如 `"en"`、`"zh-CN"`）。用于文档 `lang` 与菜单文案上下文。
- `i18n.menu`：菜单文案自定义映射，例如 `"reload": "重新加载"`。

### about

- `enabled`：是否显示 About 菜单，默认 `true`。
- `items`：菜单项数组，支持两类：
  - 普通链接项：`{ "label": "xxx", "url": "https://..." }`
  - 分割线：`{ "separator": true }`

默认未配置 `items` 时，会自动添加一个显示应用名（如 `Kimi`）的项，点击后在默认浏览器中打开该应用源站链接。

### i18n

- `i18n`：运行时界面国际化配置。
- `i18n.menu`：内置菜单文案键值覆盖。

只设置 `locale` 时会自动使用内置菜单语言包（支持 20+ 语言）。`i18n.menu` 可继续对特定 key 做覆盖。

支持的菜单键：

- `view`、`window`、`about`
- `reload`、`toggleDevTools`、`clearSiteData`、`closeWindow`、`quit`
- `zoomIn`、`zoomOut`、`zoomReset`
- `compact`、`standard`、`wide`

以上字段均为可选，未设置时自动回退到英文。

内置支持的 locale：

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

- `width` / `height`：初始窗口大小，默认 `1200 x 780`。
- `minWidth` / `minHeight`：最小窗口大小。
- `hideTitleBar`：是否隐藏 macOS 标题栏，默认 `false`。
- `fullscreen`：是否全屏启动，默认 `false`。
- `maximized`：是否最大化启动，默认 `false`。

### tray

- `enabled`：开启系统托盘。
- `icon`：托盘图标路径或 URL。
- `hideOnClose`：关闭按钮改为最小化到托盘。默认按平台处理：macOS 为 `true`，Windows/Linux 为 `false`。

### network

- `userAgent`：覆盖 User-Agent（JS 侧）。
- `proxyUrl`：代理 URL（注意：Electrobun 暂不支持应用级代理）。

### inject

- `inject.css`：要注入到页面的 CSS 内容。
  - 支持 `inline:` 开头的内联字符串
  - 支持相对/绝对路径，基于配置文件目录解析
- `inject.js`：要注入到页面的 JS 内容。
  - 支持 `inline:` 开头的内联字符串
  - 支持相对/绝对路径，基于配置文件目录解析

示例：

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

- `enabled`：开启 safe-area padding，默认 `false`。
- `top/left/right/bottom`：开启后生效的 padding 数值（px）。

## 体积优化建议

- 使用 `--env stable` 或配置文件中的 `env: "stable"` 进行正式打包。
- 模板内置 `build.bun.minify` 以及 `postPackage` 清理脚本，自动移除 `.map/.dSYM` 等调试文件。
- 模板默认开启 `build.useAsar`（如遇到原生模块问题可手动关闭）。
- 打包会复用 builder cache。首次切换模板或 Electrobun 版本时，仍可能做一次依赖预热并下载 Electrobun core binaries。

## 多平台构建

Electrobun 会按 **当前系统平台** 打包：

- macOS ARM64/Intel：在对应架构的 macOS 上执行 `buke pack`
- Windows：在 Windows 环境运行 `buke pack`
- Linux：在 Linux 环境运行 `buke pack`

可在 CI 中分别执行，产物体积可用 `du -sh dist/*`（Linux/macOS）或 `Get-ChildItem dist -Recurse | Measure-Object -Property Length -Sum`（Windows）统计。

## CLI 参数覆盖规则

如果 CLI 参数与配置文件同时出现，**CLI 参数优先生效**。例如：

```bash
buke pack --config ./buke.pack.json --safe-top 12
```

会以 CLI 的 `--safe-top` 为准。

## 示例配置

参考 `packages/examples` 目录中的极简 Pake 风格示例。
