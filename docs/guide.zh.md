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
- `allowlist`：主站同源以外允许跳转/加载的 host 或 URL 模式（例如 `accounts.google.com`、`*.stripe.com`、`https://*.example.com/*`）。
- 当 `allowlist` 填写多级域名时（如 `www.kimi.com`），会自动放行上级域名（如 `kimi.com`）及对应子域链路，方便 `*.kimi.com` 的 CNORG 等子域名访问。
- 对不带子域的主域也会按“同名模糊匹配”放行跨 TLD 的变体，例如 `weibo.com` 会匹配 `weibo.cn`/`weibo.net` 等同名域名变化。
- 默认 allowlist 已内置以下本地回环地址资源规则：`http://localhost`、`https://localhost`、`http://127.0.0.1`、`https://127.0.0.1`、`chrome-extension://*`。该行为用于减少小范围本地资源抓取/调试场景下的误拦截。

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

- `operations`、`view`、`window`、`about`、`edit`、`history`
- `back`、`forward`、`home`、`refresh`
- `reload`、`toggleDevTools`、`clearSiteData`、`clearCacheRestart`、`closeWindow`、`quit`
- `zoomIn`、`zoomOut`、`zoomReset`
- `compact`、`standard`、`wide`
- `clearHistory`、`copyUrl`、`alwaysOnTop`、`newWindow`、`pasteMatchStyle`

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
- `alwaysOnTop`：窗口始终置顶，默认 `false`。
- `title`：自定义窗口标题，默认使用应用名称。

### tray

- `enabled`：开启系统托盘。
- `icon`：托盘图标路径或 URL。
- `hideOnClose`：关闭按钮改为最小化到托盘。默认按平台处理：macOS 为 `true`，Windows/Linux 为 `false`。

### network

- `userAgent`：覆盖 User-Agent（JS 侧）。
- `proxyUrl`：代理 URL（注意：Electrobun 暂不支持应用级代理）。

### navigation（导航控制）

- `forceInternalNavigation`：将所有导航（包括弹窗）重定向到主 WebView，默认 `false`。
- `internalUrlRegex`：匹配的 URL 保留在应用内，其他按弹窗规则处理。
- `disabledWebShortcuts`：屏蔽网页上的 `Ctrl/Cmd+快捷键`，默认 `false`。标准剪贴板快捷键（Ctrl/Cmd+A/C/V/X/Z）保留。
- `newWindow`：允许弹窗窗口用于 OAuth 登录等，默认 `false`。

### instance（实例管理）

- `multiInstance`：允许同时运行多个应用实例，默认 `false`（默认单实例模式，使用文件锁）。
- `activationShortcut`：全局快捷键切换窗口显示/隐藏（例如 `"CmdOrControl+Shift+P"`）。

### runtime（运行时行为）

- `darkMode`：强制 WebView 使用深色模式，默认 `false`。
- `startToTray`：启动时隐藏到托盘，需要 `tray.enabled: true`，默认 `false`。
- `debug`：启用详细日志并自动打开 DevTools，默认 `false`。
- `incognito`：使用非持久化会话（重启后不保留 Cookie/存储），默认 `false`。
- `enableDragDrop`：启用文件拖放支持，默认 `false`。
- `pastePlainText`：强制粘贴为纯文本（去除格式），默认 `false`。
- `ignoreCertificateErrors`：忽略 TLS 证书错误（谨慎使用），默认 `false`。
- `wasm`：启用 WebAssembly CORS 隔离头，默认 `false`。
- `camera`：请求摄像头权限（macOS 签名），默认 `false`。
- `microphone`：请求麦克风权限（macOS 签名），默认 `false`。
- `multiWindow`：启用多窗口支持，默认 `false`。

### build（构建与分发）

- `appVersion`：应用版本号（注入到 `electrobun.config.ts`）。
- `install`：构建后安装到 `/Applications`（macOS），默认 `false`。
- `iterativeBuild`：跳过 DMG/安装器，仅生成应用包，默认 `false`。

### zoom

- `zoom`：WebView 缩放级别。支持 `0.5`-`2.0`（小数）或 `50`-`200`（百分比，自动除以 100）。设置后持久保存。

### 应用预设

可以使用预设名称代替 URL 来打包热门应用：

```bash
buke pack deepseek       # → https://chat.deepseek.com/
buke pack chatgpt        # → https://chatgpt.com/
buke pack youtube        # → https://www.youtube.com/
buke pack github         # → https://github.com/
buke pack twitter        # → https://x.com/
```

可用预设：`chatgpt`、`claude`、`deepseek`、`discord`、`excalidraw`、`figma`、`github`、`google-maps`、`google-translate`、`hacker-news`、`kimi`、`notion`、`poe`、`reddit`、`spotify`、`twitter`、`whatsapp`、`x`、`youtube`。

### 本地文件打包

可以打包本地 HTML 文件：

```bash
buke pack https://localhost --use-local-file ./index.html
```

### 内置运行时特性

以下功能在每个 Buke 应用中自动生效：

- **键盘快捷键**（未设置 `disabledWebShortcuts` 时）：`Cmd/Ctrl+[` 后退、`Cmd/Ctrl+]` 前进、`Cmd/Ctrl+R` 刷新、`Cmd/Ctrl+↑` 滚到顶部、`Cmd/Ctrl+↓` 滚到底部、`Cmd/Ctrl+-/+/0` 缩放。
- **下载检测**：点击可下载文件（65+ 种类型：PDF、ZIP、EXE 等）时自动拦截并保存到 `~/Downloads`，同时显示页内 toast 和系统通知。
- **右键菜单增强**：右键点击图片/视频/链接时显示自定义菜单，包含"下载"、"复制地址"、"在浏览器中打开"选项。自动适配深色/浅色主题。
- **全屏 polyfill**：HTML5 Fullscreen API（`requestFullscreen`）桥接到原生窗口全屏。支持 YouTube、Bilibili 等视频站点。Escape 退出全屏。
- **Toast 通知**：页面内底部右侧浮动通知，用于下载状态等事件，3 秒后自动消失。
- **Notification API 覆写**：网页 `Notification` 调用转发为系统原生通知。
- **主题检测**：MutationObserver 监听页面主题变化（`.dark` class、`data-theme` 属性、`color-scheme` 样式）并同步系统偏好。
- **中文输入法修复**：阻止 Safari WebView 中 `Process` 键事件传播问题。
- **SPA 路由追踪**：补丁 `history.pushState/replaceState` 以检测客户端导航，更新历史菜单。
- **窗口状态记忆**：窗口尺寸变化时保存到 `settings.json`，下次启动时恢复。

### 菜单

应用菜单包含：

- **应用菜单**：新建窗口（启用 `multiWindow` 时）、重新加载、切换 DevTools、清除站点数据、清除缓存并重启、关闭窗口、退出。
- **编辑菜单**（macOS）：撤销、重做、剪切、复制、粘贴、全选、复制网址（`Cmd+L`）。
- **视图菜单**：放大/缩小/重置、全屏切换（macOS）。
- **操作菜单**：后退、前进、主页、刷新、历史记录子菜单（最近 100 个访问页面）。
- **窗口菜单**：窗口置顶切换（带 ✓ 标记）、紧凑/标准/宽屏预设。
- **关于菜单**：通过 `about.items` 配置的自定义链接。

### 导航与弹窗（OAuth 登录）

- 默认情况下，主窗口仅允许当前站和 `allowlist` 中的域名导航，其他链接会在 `will-navigate` 阶段被拦截。
- 对于 `window.open` 弹窗，主窗口会优先在应用内尝试打开用于登录的弹窗（例如 Google/Twitter 登录页），并复用同一个弹窗窗口，避免反复弹多个窗口。
- 非登录类弹窗仍会交给系统默认浏览器打开。
- 若你在某些 OAuth 场景仍遇到登录页打不开：
  - 检查站点是否弹出 `accounts.google.com` 或 `*.twitter.com`（会走应用内窗口；通常可正常登录）。
  - 将相关域名加入 `allowlist` 再重启应用。
  - 保持 `partition` 不变可减少第三方登录状态清空。

### 白名单（allowlist）到底影响什么

- `allowlist` 只影响“主窗口”的跨域导航放行，不影响应用内脚本注入、窗口配置、菜单等其他能力。
- 默认会内置放行本地开发来源：`http://localhost`、`https://localhost`、`http://127.0.0.1`、`https://127.0.0.1`、`chrome-extension://*`。除此之外，若不显式填写其他规则，主窗口仍只放行主站本身与 `about:/data:`。
- 只有命中 allowlist 的域名或规则才会被 `setNavigationRules` 允许直接跳转，其他会在 `will-navigate` 阶段打印拦截日志（如 `Navigation blocked`）。
- 当前弹窗逻辑还会给弹出的 URL 单独配规则，避免误拦截 OAuth 流程里的重定向链。
- 你可以把要放行的第三方域名放进 `allowlist`，例如：
  - `"accounts.google.com"`
  - `"twitter.com"`
  - `"https://id.example.com/*"`

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

可在 CI 中分别执行。本仓库的 release workflow 现在会在 `macos-latest`、`macos-15-intel`、`ubuntu-latest` 和 `windows-latest` 上分别打包，并且只发布整理后的归档文件，例如 `excalidraw-stable-macos-arm64.tar.zst`，不再直接暴露 Electrobun 的内部文件。

## CLI 参数覆盖规则

如果 CLI 参数与配置文件同时出现，**CLI 参数优先生效**。例如：

```bash
buke pack --config ./buke.pack.json --safe-top 12
```

会以 CLI 的 `--safe-top` 为准。

## 示例配置

参考 `packages/examples` 目录中的极简 Pake 风格示例。

### 推荐 allowlist 示例

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

### 完整示例配置

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
      { "label": "官方网站", "url": "https://www.kimi.com" },
      { "separator": true },
      { "label": "隐私政策", "url": "https://www.kimi.com/privacy" }
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
