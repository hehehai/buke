import path from "node:path";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dlopen, FFIType } from "bun:ffi";
import Electrobun, {
  ApplicationMenu,
  BrowserView,
  BrowserWindow,
  Session,
  Tray,
  Utils
} from "electrobun/bun";

type BukeConfig = {
  name?: string;
  id?: string;
  url?: string;
  partition?: string;
  zoom?: number;
  allowlist?: string[];
  window?: {
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
    hideTitleBar?: boolean;
  };
  tray?: {
    enabled?: boolean;
    icon?: string;
    hideOnClose?: boolean;
  };
  network?: {
    userAgent?: string;
    proxyUrl?: string;
  };
  macosSafeArea?: {
    enabled?: boolean;
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
  };
  inject?: {
    css?: string[];
    js?: string[];
  };
};

type InjectionAssets = {
  css: string[];
  js: string[];
};

type Settings = {
  zoomLevel?: number;
};

const DEFAULT_CONFIG: Required<Pick<BukeConfig, "partition" | "zoom" | "allowlist">> & {
  inject: Required<NonNullable<BukeConfig["inject"]>>;
  macosSafeArea: Required<NonNullable<BukeConfig["macosSafeArea"]>>;
  window: Required<NonNullable<BukeConfig["window"]>>;
  tray: Required<NonNullable<BukeConfig["tray"]>>;
  network: Required<NonNullable<BukeConfig["network"]>>;
} = {
  partition: "persist:default",
  zoom: 1,
  allowlist: [],
  inject: { css: [], js: [] },
  window: {
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    hideTitleBar: true
  },
  tray: {
    enabled: false,
    icon: "",
    hideOnClose: false
  },
  network: {
    userAgent: "",
    proxyUrl: ""
  },
  macosSafeArea: {
    enabled: true,
    top: 28,
    left: 12,
    right: 0,
    bottom: 0
  }
};

const isMacOS = process.platform === "darwin";
const MAC_TRAFFIC_LIGHTS_X = 14;
const MAC_TRAFFIC_LIGHTS_Y = 12;
const MAC_NATIVE_DRAG_REGION_X = 90;
const MAC_NATIVE_DRAG_REGION_HEIGHT = 32;

const { config: bukeConfig, configDir } = await loadConfig();

const APP_NAME = bukeConfig.name ?? "__APP_NAME__";
const APP_URL = bukeConfig.url ?? "__APP_URL__";
const APP_PARTITION = normalizePartition(
  bukeConfig.partition ?? DEFAULT_CONFIG.partition
);
const BASE_URL = safeParseUrl(APP_URL);

const windowConfig = {
  ...DEFAULT_CONFIG.window,
  ...(bukeConfig.window ?? {})
};
const trayConfig = {
  ...DEFAULT_CONFIG.tray,
  ...(bukeConfig.tray ?? {})
};
const networkConfig = {
  ...DEFAULT_CONFIG.network,
  ...(bukeConfig.network ?? {})
};
const userAgentOverride = networkConfig.userAgent?.trim() ?? "";
const proxyUrl = networkConfig.proxyUrl?.trim() ?? "";

const WINDOW_PRESETS = {
  compact: { width: 960, height: 640 },
  standard: { width: 1200, height: 800 },
  wide: { width: 1500, height: 900 }
} as const;

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.1;

const settingsPath = await ensureSettingsPath();
const persistedSettings = await readJson<Settings>(settingsPath);
let zoomLevel =
  typeof persistedSettings?.zoomLevel === "number"
    ? persistedSettings.zoomLevel
    : typeof bukeConfig.zoom === "number"
      ? bukeConfig.zoom
      : DEFAULT_CONFIG.zoom;

const injectionAssets = await loadInjectionAssets(
  bukeConfig.inject ?? DEFAULT_CONFIG.inject,
  configDir
);
const macosSafeArea = {
  ...DEFAULT_CONFIG.macosSafeArea,
  ...(bukeConfig.macosSafeArea ?? {})
};

const session = Session.fromPartition(APP_PARTITION);

let mainWindow: BrowserWindow | null = null;
let contentWebview: BrowserView | null = null;
let appTray: Tray | null = null;
let proxyWarningShown = false;

const getMainWindow = () =>
  mainWindow && BrowserWindow.getById(mainWindow.id) ? mainWindow : null;

const ensureMainWindow = () => getMainWindow() ?? createMainWindow();

const resolveContentWebview = () => {
  if (contentWebview) {
    return contentWebview;
  }

  const activeWindow = getMainWindow();
  if (!activeWindow) {
    return null;
  }

  const candidates = BrowserView.getAll().filter(
    (view) => view.hostWebviewId === activeWindow.webview.id
  );

  if (candidates.length > 0) {
    contentWebview = candidates[0];
  }

  return contentWebview;
};

const buildNavigationRules = (baseUrl: URL, allowlist: string[]) => {
  const rules = ["^*"];
  const addRule = (rule: string) => {
    if (!rules.includes(rule)) {
      rules.push(rule);
    }
  };
  const addHostRules = (protocol: string, host: string) => {
    const safeProtocol = protocol === "https" ? "https" : protocol;
    addRule(`${safeProtocol}://${host}/*`);
    addRule(`${safeProtocol}://${host}:*/*`);
    addRule(`${safeProtocol}://*.${host}/*`);
    addRule(`${safeProtocol}://*.${host}:*/*`);
  };

  addHostRules(baseUrl.protocol.replace(":", ""), baseUrl.hostname);

  for (const entry of allowlist) {
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.includes("*") || trimmed.includes("/")) {
      addRule(trimmed);
      continue;
    }

    try {
      const url = trimmed.includes("://")
        ? new URL(trimmed)
        : new URL(`${baseUrl.protocol}//${trimmed}`);
      addHostRules(url.protocol.replace(":", ""), url.hostname);
    } catch (error) {
      console.log(`Invalid allowlist entry: ${trimmed}`);
    }
  }

  addRule("about:*");
  addRule("data:*");
  return rules;
};

const applyNavigationRules = () => {
  const webview = resolveContentWebview();
  if (!webview) {
    return;
  }

  if (BASE_URL) {
    webview.setNavigationRules(
      buildNavigationRules(
        BASE_URL,
        bukeConfig.allowlist ?? DEFAULT_CONFIG.allowlist
      )
    );
    webview.on("will-navigate", (event) => {
      if (!event.data.allowed) {
        console.log(`Navigation blocked: ${event.data.url}`);
      }
    });
  }

  webview.on("dom-ready", () => {
    applyUserAgentOverride();
    applyZoom();
    applyInjection();
  });
};

const ensureContentWebview = async () => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (resolveContentWebview()) {
      applyNavigationRules();
      applyZoom();
      applyInjection();
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
};

const applyZoom = () => {
  const webview = resolveContentWebview();
  if (!webview) {
    return;
  }

  const zoomValue = zoomLevel.toFixed(2);
  webview.executeJavascript(
    `document.documentElement.style.zoom = ${JSON.stringify(zoomValue)};`
  );
};

const applyUserAgentOverride = () => {
  const webview = resolveContentWebview();
  if (!webview || !userAgentOverride) {
    return;
  }

  const script = `(() => {
    const ua = ${JSON.stringify(userAgentOverride)};
    try {
      Object.defineProperty(navigator, "userAgent", {
        get: () => ua,
        configurable: true
      });
      Object.defineProperty(navigator, "appVersion", {
        get: () => ua,
        configurable: true
      });
    } catch (error) {}
  })();`;

  webview.executeJavascript(script);
};

const adjustZoom = (direction: "in" | "out" | "reset") => {
  if (direction === "reset") {
    zoomLevel = 1;
  } else if (direction === "in") {
    zoomLevel = Math.min(ZOOM_MAX, zoomLevel + ZOOM_STEP);
  } else {
    zoomLevel = Math.max(ZOOM_MIN, zoomLevel - ZOOM_STEP);
  }
  applyZoom();
  void saveSettings({ zoomLevel });
};

const applyInjection = () => {
  const webview = resolveContentWebview();
  if (!webview) {
    return;
  }

  if (isMacOS && macosSafeArea.enabled) {
    const safeCss = [
      ":root {",
      `  --buke-safe-top: ${macosSafeArea.top}px;`,
      `  --buke-safe-left: ${macosSafeArea.left}px;`,
      `  --buke-safe-right: ${macosSafeArea.right}px;`,
      `  --buke-safe-bottom: ${macosSafeArea.bottom}px;`,
      "}",
      "html, body {",
      "  box-sizing: border-box;",
      "  padding-top: var(--buke-safe-top);",
      "  padding-left: var(--buke-safe-left);",
      "  padding-right: var(--buke-safe-right);",
      "  padding-bottom: var(--buke-safe-bottom);",
      "}"
    ].join("\n");
    const script = `(() => { const id='buke-macos-safe-area'; let el=document.getElementById(id); if(!el){ el=document.createElement('style'); el.id=id; document.head.appendChild(el);} el.textContent=${JSON.stringify(
      safeCss
    )}; })();`;
    webview.executeJavascript(script);
  }

  for (const [index, css] of injectionAssets.css.entries()) {
    const styleId = `buke-inject-style-${index}`;
    const script = `(() => { const id=${JSON.stringify(
      styleId
    )}; let el=document.getElementById(id); if(!el){ el=document.createElement('style'); el.id=id; document.head.appendChild(el); } el.textContent=${JSON.stringify(
      css
    )}; })();`;
    webview.executeJavascript(script);
  }

  for (const script of injectionAssets.js) {
    webview.executeJavascript(`(() => { ${script}\n })();`);
  }
};

const warnProxyUnsupported = () => {
  if (!proxyUrl || proxyWarningShown) {
    return;
  }

  proxyWarningShown = true;
  console.log(
    `Proxy URL configured (${proxyUrl}). Electrobun WebView does not currently support per-app proxy settings; use system proxy if needed.`
  );
};

const reloadContent = () => {
  const webview = resolveContentWebview();
  if (!webview) {
    return;
  }
  webview.executeJavascript("location.reload()");
};

const clearSiteData = async () => {
  try {
    await session.cookies.clear();
    await session.clearStorageData();
    reloadContent();
  } catch (error) {
    console.log("Failed to clear site data", error);
  }
};

const toggleDevTools = () => {
  const webview = resolveContentWebview();
  if (!webview) {
    return;
  }
  webview.toggleDevTools();
};

const applyWindowPreset = (preset: keyof typeof WINDOW_PRESETS) => {
  const frame = WINDOW_PRESETS[preset];
  const win = getMainWindow();
  if (!win) {
    return;
  }
  win.setSize(frame.width, frame.height);
  win.focus();
};

const buildMenu = () => {
  ApplicationMenu.setApplicationMenu([
    {
      label: APP_NAME,
      submenu: [
        { label: "Reload", action: "reload", accelerator: "r" },
        {
          label: "Toggle DevTools",
          action: "toggle-devtools",
          accelerator: "i"
        },
        { label: "Clear Site Data", action: "clear-data" },
        ...(isMacOS
          ? [
              { type: "separator" },
              { label: "Close Window", action: "close-main-window", accelerator: "w" }
            ]
          : []),
        { type: "separator" },
        { label: "Quit", action: "quit-app", accelerator: "q" }
      ]
    },
    {
      label: "View",
      submenu: [
        { label: "Zoom In", action: "zoom-in", accelerator: "+" },
        { label: "Zoom Out", action: "zoom-out", accelerator: "-" },
        { label: "Reset Zoom", action: "zoom-reset", accelerator: "0" }
      ]
    },
    {
      label: "Window",
      submenu: [
        ...(isMacOS
          ? [
              { role: "minimize" },
              { role: "zoom" },
              { role: "bringAllToFront" },
              { type: "separator" }
            ]
          : []),
        { label: "Compact", action: "window-compact" },
        { label: "Standard", action: "window-standard" },
        { label: "Wide", action: "window-wide" }
      ]
    }
  ]);
};

const handleMenuAction = (action: string) => {
  switch (action) {
    case "reload":
      reloadContent();
      return;
    case "toggle-devtools":
      toggleDevTools();
      return;
    case "zoom-in":
      adjustZoom("in");
      return;
    case "zoom-out":
      adjustZoom("out");
      return;
    case "zoom-reset":
      adjustZoom("reset");
      return;
    case "window-compact":
      applyWindowPreset("compact");
      return;
    case "window-standard":
      applyWindowPreset("standard");
      return;
    case "window-wide":
      applyWindowPreset("wide");
      return;
    case "clear-data":
      void clearSiteData();
      return;
    case "close-main-window":
      {
        const win = getMainWindow();
        if (!win) {
          return;
        }
        if (trayConfig.enabled && trayConfig.hideOnClose) {
          win.minimize();
          return;
        }
        win.close();
      }
      return;
    case "quit-app":
      Utils.quit();
      return;
    default:
      return;
  }
};

const resolveAssetPath = (value?: string) => {
  if (!value) {
    return "";
  }
  return path.isAbsolute(value) ? value : path.join(configDir, value);
};

const showMainWindow = () => {
  const win = ensureMainWindow();
  if (win.isMinimized()) {
    win.unminimize();
  }
  win.focus();
};

const hideMainWindow = () => {
  const win = getMainWindow();
  if (!win) {
    return;
  }
  win.minimize();
};

const setupTray = () => {
  if (!trayConfig.enabled) {
    return;
  }

  const trayIconPath = trayConfig.icon
    ? resolveAssetPath(trayConfig.icon)
    : "";
  if (trayIconPath && !existsSync(trayIconPath)) {
    console.log(`Tray icon not found: ${trayIconPath}`);
  }

  appTray = new Tray({
    image: trayIconPath,
    title: trayIconPath ? "" : APP_NAME,
    template: true
  });

  appTray.setMenu([
    { label: "Show", action: "tray-show" },
    { label: "Hide", action: "tray-hide" },
    { type: "separator" },
    { label: "Quit", action: "tray-quit" }
  ]);

  appTray.on("tray-clicked", (event) => {
    const action = event.data.action;
    if (action === "tray-quit") {
      Utils.quit();
      return;
    }
    if (action === "tray-hide") {
      hideMainWindow();
      return;
    }
    if (action === "tray-show") {
      showMainWindow();
      return;
    }

    const win = getMainWindow();
    if (!win || win.isMinimized()) {
      showMainWindow();
    } else {
      hideMainWindow();
    }
  });
};

const enforceMinSize = (win: BrowserWindow) => {
  if (windowConfig.minWidth <= 0 && windowConfig.minHeight <= 0) {
    return;
  }

  const { width, height } = win.getSize();
  const nextWidth = Math.max(width, windowConfig.minWidth);
  const nextHeight = Math.max(height, windowConfig.minHeight);
  if (nextWidth !== width || nextHeight !== height) {
    win.setSize(nextWidth, nextHeight);
  }
};

function createMainWindow() {
  const initialWidth = Math.max(windowConfig.width, windowConfig.minWidth);
  const initialHeight = Math.max(windowConfig.height, windowConfig.minHeight);
  const titleBarStyle = isMacOS
    ? windowConfig.hideTitleBar
      ? "hiddenInset"
      : "default"
    : "default";

  const win = new BrowserWindow({
    title: APP_NAME,
    url: "views://main/index.html",
    frame: {
      width: initialWidth,
      height: initialHeight
    },
    ...(isMacOS
      ? {
          titleBarStyle: titleBarStyle as const,
          transparent: true
        }
      : {})
  });

  mainWindow = win;
  contentWebview = null;

  win.on("close", () => {
    console.log("Window close requested");
    if (trayConfig.enabled && trayConfig.hideOnClose) {
      win.minimize();
      return;
    }
    Utils.quit();
  });

  win.on("minimize", () => {
    console.log("Window minimized");
  });

  win.on("restore", () => {
    console.log("Window restored");
  });

  win.on("resize", () => {
    enforceMinSize(win);
  });

  if (isMacOS) {
    applyMacOSWindowEffects(win);
  }

  ensureContentWebview();

  return win;
}

buildMenu();
warnProxyUnsupported();
setupTray();
createMainWindow();

Electrobun.events.on("application-menu-clicked", (event) => {
  if (event.data.action) {
    handleMenuAction(event.data.action);
  }
});

function applyMacOSWindowEffects(mainWindow: BrowserWindow) {
  const dylibPath = path.join(import.meta.dir, "libMacWindowEffects.dylib");
  if (!existsSync(dylibPath)) {
    console.warn(
      `Native macOS effects lib not found at ${dylibPath}. Falling back to transparent mode.`
    );
    return;
  }

  try {
    const lib = dlopen(dylibPath, {
      enableWindowVibrancy: {
        args: [FFIType.ptr, FFIType.bool],
        returns: FFIType.bool
      },
      ensureWindowShadow: {
        args: [FFIType.ptr],
        returns: FFIType.bool
      },
      setWindowTrafficLightsPosition: {
        args: [FFIType.ptr, FFIType.f64, FFIType.f64],
        returns: FFIType.bool
      },
      setNativeWindowDragRegion: {
        args: [FFIType.ptr, FFIType.f64, FFIType.f64],
        returns: FFIType.bool
      }
    });

    const vibrancyEnabled = lib.symbols.enableWindowVibrancy(
      mainWindow.ptr,
      windowConfig.hideTitleBar
    );
    const shadowEnabled = lib.symbols.ensureWindowShadow(mainWindow.ptr);

    const dragRegionX = macosSafeArea.enabled
      ? Math.max(MAC_NATIVE_DRAG_REGION_X, macosSafeArea.left + 72)
      : MAC_NATIVE_DRAG_REGION_X;
    const dragRegionHeight = macosSafeArea.enabled
      ? Math.max(12, macosSafeArea.top)
      : MAC_NATIVE_DRAG_REGION_HEIGHT;
    const shouldAlign = windowConfig.hideTitleBar;
    const alignButtons = () =>
      lib.symbols.setWindowTrafficLightsPosition(
        mainWindow.ptr,
        MAC_TRAFFIC_LIGHTS_X,
        MAC_TRAFFIC_LIGHTS_Y
      );

    const alignNativeDragRegion = () =>
      lib.symbols.setNativeWindowDragRegion(
        mainWindow.ptr,
        dragRegionX,
        dragRegionHeight
      );

    const buttonsAligned = shouldAlign ? alignButtons() : false;
    const dragAligned = shouldAlign ? alignNativeDragRegion() : false;

    if (shouldAlign) {
      setTimeout(() => {
        alignButtons();
        alignNativeDragRegion();
      }, 120);

      mainWindow.on("resize", () => {
        alignButtons();
        alignNativeDragRegion();
      });
    }

    console.log(
      `macOS effects applied (vibrancy=${vibrancyEnabled}, shadow=${shadowEnabled}, trafficLights=${buttonsAligned}, nativeDrag=${dragAligned})`
    );
  } catch (error) {
    console.warn("Failed to apply native macOS effects:", error);
  }
}

function normalizePartition(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_CONFIG.partition;
  }
  return trimmed.includes(":") ? trimmed : `persist:${trimmed}`;
}

async function loadConfig() {
  const candidates = [
    path.resolve(process.cwd(), "buke.config.json"),
    path.join(Utils.paths.userData, "buke.config.json")
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) {
      continue;
    }

    const raw = await readFile(candidate, "utf8");
    const parsed = JSON.parse(raw) as BukeConfig;
    return {
      config: normalizeConfig(parsed),
      configDir: path.dirname(candidate)
    };
  }

  return { config: normalizeConfig({}), configDir: process.cwd() };
}

function normalizeConfig(config: BukeConfig): BukeConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    window: {
      ...DEFAULT_CONFIG.window,
      ...(config.window ?? {})
    },
    tray: {
      ...DEFAULT_CONFIG.tray,
      ...(config.tray ?? {})
    },
    network: {
      ...DEFAULT_CONFIG.network,
      ...(config.network ?? {})
    },
    macosSafeArea: {
      ...DEFAULT_CONFIG.macosSafeArea,
      ...(config.macosSafeArea ?? {})
    },
    inject: {
      ...DEFAULT_CONFIG.inject,
      ...(config.inject ?? {})
    }
  };
}

async function loadInjectionAssets(inject: BukeConfig["inject"], dir: string) {
  const css = await loadInjectionList(inject?.css ?? [], dir);
  const js = await loadInjectionList(inject?.js ?? [], dir);
  return { css, js } satisfies InjectionAssets;
}

async function loadInjectionList(entries: string[], dir: string) {
  const results: string[] = [];
  for (const entry of entries) {
    if (!entry) {
      continue;
    }

    if (entry.startsWith("inline:")) {
      results.push(entry.slice("inline:".length));
      continue;
    }

    const resolved = path.isAbsolute(entry) ? entry : path.join(dir, entry);
    if (!existsSync(resolved)) {
      console.log(`Injection file not found: ${resolved}`);
      continue;
    }
    results.push(await readFile(resolved, "utf8"));
  }
  return results;
}

async function ensureSettingsPath() {
  await mkdir(Utils.paths.userData, { recursive: true });
  return path.join(Utils.paths.userData, "settings.json");
}

async function saveSettings(next: Settings) {
  const current = (await readJson<Settings>(settingsPath)) ?? {};
  const updated = { ...current, ...next };
  await writeFile(settingsPath, JSON.stringify(updated, null, 2), "utf8");
}

async function readJson<T>(filePath: string) {
  if (!existsSync(filePath)) {
    return null;
  }
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

function safeParseUrl(value: string) {
  try {
    return new URL(value);
  } catch (error) {
    console.log(`Invalid URL: ${value}`);
    return null;
  }
}
