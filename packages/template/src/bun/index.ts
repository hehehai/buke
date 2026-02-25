import Electrobun, { BrowserView, BrowserWindow, Session, Utils } from "electrobun/bun";
import {
  DEFAULT_CONFIG,
  type Settings,
  loadConfig,
  loadInjectionAssets,
  normalizePartition,
  safeParseUrl,
} from "./config";
import { ensureSettingsPath, readJson, saveSettings } from "./storage";
import { buildMenu, handleMenuAction } from "./menu";
import { setupTray } from "./tray";
import {
  applyInjectionAssets,
  applyUserAgentOverride,
  applyZoom,
  buildNavigationRules,
} from "./webview";

const isMacOS = process.platform === "darwin";
const { config: bukeConfig, configDir } = await loadConfig();

const APP_NAME = bukeConfig.name ?? "__APP_NAME__";
const APP_URL = bukeConfig.url ?? "__APP_URL__";
const APP_PARTITION = normalizePartition(bukeConfig.partition ?? DEFAULT_CONFIG.partition);
const BASE_URL = safeParseUrl(APP_URL);

const windowConfig = {
  ...DEFAULT_CONFIG.window,
  ...(bukeConfig.window ?? {}),
};
const trayConfig = {
  ...DEFAULT_CONFIG.tray,
  ...(bukeConfig.tray ?? {}),
};
const networkConfig = {
  ...DEFAULT_CONFIG.network,
  ...(bukeConfig.network ?? {}),
};
const userAgentOverride = networkConfig.userAgent?.trim() ?? "";
const proxyUrl = networkConfig.proxyUrl?.trim() ?? "";

const WINDOW_PRESETS = {
  compact: { width: 960, height: 640 },
  standard: { width: 1200, height: 800 },
  wide: { width: 1500, height: 900 },
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
  configDir,
);

const session = Session.fromPartition(APP_PARTITION);

let mainWindow: BrowserWindow | null = null;
let contentWebview: BrowserView | null = null;
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
    (view) => view.hostWebviewId === activeWindow.webview.id,
  );

  if (candidates.length > 0) {
    contentWebview = candidates[0];
  }

  return contentWebview;
};

const applyNavigationRules = () => {
  const webview = resolveContentWebview();
  if (!webview) {
    return;
  }

  if (BASE_URL) {
    webview.setNavigationRules(
      buildNavigationRules(BASE_URL, bukeConfig.allowlist ?? DEFAULT_CONFIG.allowlist),
    );
    webview.on("will-navigate", (event) => {
      if (!event.data.allowed) {
        console.log(`Navigation blocked: ${event.data.url}`);
      }
    });
  }

  webview.on("dom-ready", () => {
    applyUserAgentOverride(webview, userAgentOverride);
    applyZoom(webview, zoomLevel);
    applyInjection(webview);
  });
};

const ensureContentWebview = async () => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const webview = resolveContentWebview();
    if (webview) {
      applyNavigationRules();
      applyZoom(webview, zoomLevel);
      applyInjection(webview);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
};

const adjustZoom = (direction: "in" | "out" | "reset") => {
  if (direction === "reset") {
    zoomLevel = 1;
  } else if (direction === "in") {
    zoomLevel = Math.min(ZOOM_MAX, zoomLevel + ZOOM_STEP);
  } else {
    zoomLevel = Math.max(ZOOM_MIN, zoomLevel - ZOOM_STEP);
  }
  const webview = resolveContentWebview();
  if (webview) {
    applyZoom(webview, zoomLevel);
  }
  void saveSettings(settingsPath, { zoomLevel });
};

const applyInjection = (webview: BrowserView) => {
  applyInjectionAssets(webview, injectionAssets);
};

const warnProxyUnsupported = () => {
  if (!proxyUrl || proxyWarningShown) {
    return;
  }

  proxyWarningShown = true;
  console.log(
    `Proxy URL configured (${proxyUrl}). Electrobun WebView does not currently support per-app proxy settings; use system proxy if needed.`,
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

const menuHandlers = {
  reload: reloadContent,
  toggleDevTools,
  zoomIn: () => adjustZoom("in"),
  zoomOut: () => adjustZoom("out"),
  zoomReset: () => adjustZoom("reset"),
  windowCompact: () => applyWindowPreset("compact"),
  windowStandard: () => applyWindowPreset("standard"),
  windowWide: () => applyWindowPreset("wide"),
  clearData: () => void clearSiteData(),
  closeWindow: () => {
    const win = getMainWindow();
    if (!win) {
      return;
    }
    if (trayConfig.enabled && trayConfig.hideOnClose) {
      win.minimize();
      return;
    }
    win.close();
  },
  quit: () => Utils.quit(),
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
      ? "hidden"
      : "default"
    : "default";

  const win = new BrowserWindow({
    title: APP_NAME,
    url: "views://main/index.html",
    frame: {
      x: 0,
      y: 0,
      width: initialWidth,
      height: initialHeight,
    },
    ...(isMacOS
      ? {
          titleBarStyle,
          transparent: true,
        }
      : {}),
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

  ensureContentWebview();

  return win;
}

buildMenu(APP_NAME, isMacOS);
warnProxyUnsupported();
setupTray(
  { enabled: trayConfig.enabled, icon: trayConfig.icon, appName: APP_NAME, configDir },
  {
    show: showMainWindow,
    hide: hideMainWindow,
    toggle: () => {
      const win = getMainWindow();
      if (!win || win.isMinimized()) {
        showMainWindow();
      } else {
        hideMainWindow();
      }
    },
    quit: () => Utils.quit(),
  },
);
createMainWindow();

Electrobun.events.on("application-menu-clicked", (event) => {
  if (event.data.action) {
    handleMenuAction(event.data.action, menuHandlers);
  }
});
