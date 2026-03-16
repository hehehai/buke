import Electrobun, { BrowserView, BrowserWindow, Session, Utils } from "electrobun/bun";
import {
  DEFAULT_CONFIG,
  type Settings,
  type BukeConfig,
  loadConfig,
  normalizePartition,
  safeParseUrl,
} from "./config";
import { ensureSettingsPath, readJson, saveSettings } from "./storage";
import {
  buildMenu,
  handleMenuAction,
  type AboutMenuConfig,
} from "./menu";
import { setupTray } from "./tray";
import {
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
  standard: { width: 1200, height: 780 },
  wide: { width: 1500, height: 900 },
} as const;

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.1;

const buildAboutMenu = (
  about: BukeConfig["about"],
  appName: string,
  originUrl: string
): AboutMenuConfig => {
  if (!about?.enabled && about?.enabled !== undefined) {
    return [];
  }

  const configuredItems = Array.isArray(about?.items) ? about.items : [];
  if (configuredItems.length === 0) {
    return [{ type: "link", label: appName, url: originUrl }];
  }

  const normalized: AboutMenuConfig = [];

  for (const item of configuredItems) {
    if (item?.separator === true) {
      normalized.push({ type: "separator" });
      continue;
    }

    const url = typeof item?.url === "string" ? item.url.trim() : "";
    if (!url) {
      continue;
    }

    const label =
      typeof item?.label === "string" && item.label.trim().length > 0
        ? item.label.trim()
        : url;
    normalized.push({ type: "link", label, url });
  }

  if (!normalized.some((item) => item.type !== "separator")) {
    return [{ type: "link", label: appName, url: originUrl }];
  }

  return normalized;
};

const settingsPath = await ensureSettingsPath();
const persistedSettings = await readJson<Settings>(settingsPath);
let zoomLevel =
  typeof persistedSettings?.zoomLevel === "number"
    ? persistedSettings.zoomLevel
    : typeof bukeConfig.zoom === "number"
      ? bukeConfig.zoom
      : DEFAULT_CONFIG.zoom;

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
    revealContentWebview();
  });
};

const ensureContentWebview = async () => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const webview = resolveContentWebview();
    if (webview) {
      applyNavigationRules();
      applyZoom(webview, zoomLevel);
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

const revealContentWebview = () => {
  const win = getMainWindow();
  if (!win) {
    return;
  }

  win.webview.executeJavascript(`(() => {
    const webview = document.querySelector("electrobun-webview[data-init-pending='true']");
    if (webview instanceof HTMLElement) {
      webview.dataset.initPending = "false";
    }

    const safeAreaWebview = document.querySelector(
      "electrobun-webview[data-safe-area-pending='true']"
    );
    if (!(safeAreaWebview instanceof HTMLElement)) {
      return;
    }

    safeAreaWebview.dataset.safeAreaPending = "false";
  })();`);
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

const openInBrowser = (url: string) => {
  const target = url.trim();
  if (!target) {
    return;
  }

  if (process.platform === "darwin") {
    Bun.spawn(["open", target], { stdout: "ignore", stderr: "ignore" });
    return;
  }

  if (process.platform === "win32") {
    Bun.spawn(["cmd", "/c", "start", "", target], {
      stdout: "ignore",
      stderr: "ignore"
    });
    return;
  }

  Bun.spawn(["xdg-open", target], { stdout: "ignore", stderr: "ignore" });
};

const applyWindowPreset = (preset: keyof typeof WINDOW_PRESETS) => {
  const win = getMainWindow();
  if (!win) {
    return;
  }
  const frame = WINDOW_PRESETS[preset];
  win.setSize(frame.width, frame.height);
  win.focus();
};

const menuHandlers = {
  openUrl: openInBrowser,
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
  const minWidth = windowConfig.minWidth;
  const minHeight = windowConfig.minHeight;

  if (minWidth <= 0 && minHeight <= 0) {
    return;
  }

  const { width, height } = win.getSize();
  const nextWidth = Math.max(width, minWidth);
  const nextHeight = Math.max(height, minHeight);
  if (nextWidth !== width || nextHeight !== height) {
    win.setSize(nextWidth, nextHeight);
  }
};

function createMainWindow() {
  const initialWidth = Math.max(windowConfig.width, windowConfig.minWidth);
  const initialHeight = Math.max(windowConfig.height, windowConfig.minHeight);

  const win = new BrowserWindow({
    title: APP_NAME,
    url: "views://main/index.html",
    frame: {
      x: 0,
      y: 0,
      width: initialWidth,
      height: initialHeight,
    },
    ...(isMacOS && windowConfig.hideTitleBar
      ? {
          titleBarStyle: "hiddenInset",
          transparent: true,
        }
      : {}),
  });

  mainWindow = win;
  contentWebview = null;

  const controllableWindow = win as BrowserWindow & {
    maximize(): void;
    setFullScreen(fullScreen: boolean): void;
  };

  win.on("close", () => {
    console.log("Window close requested");
    if (trayConfig.enabled && trayConfig.hideOnClose) {
      win.minimize();
      return;
    }
    if (!isMacOS) {
      Utils.quit();
    }
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

  if (windowConfig.maximized) {
    controllableWindow.maximize();
  }
  if (windowConfig.fullscreen) {
    controllableWindow.setFullScreen(true);
  }

  ensureContentWebview();

  return win;
}

const aboutMenu = buildAboutMenu(bukeConfig.about, APP_NAME, APP_URL);
buildMenu(APP_NAME, isMacOS, aboutMenu.length > 0, aboutMenu);
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

Electrobun.events.on("reopen", () => {
  showMainWindow();
});
