# Buke 配置指南（中文）

Buke CLI 用于把网页快速打包成 Electrobun 桌面应用。本文聚焦 **打包配置文件** 与参数说明。

## 快速开始

```bash
# 使用 URL 直接打包
buke pack https://www.kimi.com --name Kimi --force

# 使用配置文件打包
buke pack --config ./buke.pack.json
```

> Electrobun 版本：跟随 npm `latest`（**2026-02-25** 时为 `1.14.4`）。

## 配置文件结构

配置文件为 JSON，建议配合 `docs/buke.schema.json` 获取类型提示与校验。

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

## 参数说明

### 顶层字段

- `name`：应用显示名称（默认取 URL host）。
- `id`：Bundle ID（默认 `com.buke.<slug>`）。
- `url`：网页地址（必填）。
- `partition`：Webview session partition（默认 `persist:default`）。
- `icon`：应用图标路径或 URL。
- `outDir`：打包输出目录（默认 `dist/<slug>`）。
- `env`：构建环境，`dev | canary | stable`。

### window

- `width` / `height`：初始窗口大小。
- `minWidth` / `minHeight`：最小窗口大小。
- `hideTitleBar`：macOS 是否隐藏标题栏（默认 true，使用无 inset 的 hidden 样式）。

### tray

- `enabled`：开启系统托盘。
- `icon`：托盘图标路径或 URL。
- `hideOnClose`：关闭按钮改为最小化到托盘。

### network

- `userAgent`：覆盖 User-Agent（JS 侧）。
- `proxyUrl`：代理 URL（注意：Electrobun 暂不支持应用级代理）。

### macosSafeArea

- `enabled`：开启 safe-area padding。
- `top/left/right/bottom`：padding 数值（px）。只设置 `top` 可避免顶部内容被覆盖。

## 体积优化建议

- 使用 `--env stable` 或配置文件中的 `env: "stable"` 进行正式打包。
- 模板内置 `build.bun.minify` 以及 `postPackage` 清理脚本，自动移除 `.map/.dSYM` 等调试文件。
- 模板默认开启 `build.useAsar`（如遇到原生模块问题可手动关闭）。
- 打包时默认使用 `bun install --production`，仅安装生产依赖以减少安装体积。

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

参考 `packages/examples` 目录（Kimi、WeRead、Twitter、DeepSeek、YouTube、YouTube Music、Excalidraw、XiaoHongShu）。
