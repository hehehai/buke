import Electrobun, { BrowserView, BrowserWindow, Session, Utils } from "electrobun/bun";
import {
  type BukeConfig,
  DEFAULT_CONFIG,
  type Settings,
  loadConfig,
  normalizePartition,
  safeParseUrl,
} from "./config";
import {
  type AboutMenuConfig,
  type MenuLocaleConfig,
  type NavigationHistoryItem,
  buildMenu,
  handleMenuAction,
} from "./menu";
import { ensureSettingsPath, readJson, saveSettings } from "./storage";
import { setupTray } from "./tray";
import {
  applySpaHistoryPatch,
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
const APP_LOCALE =
  typeof bukeConfig.locale === "string" && bukeConfig.locale.trim()
    ? bukeConfig.locale.trim()
    : "en";
const APP_I18N_MENU: MenuLocaleConfig = bukeConfig.i18n?.menu ?? {};

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

const MAX_HISTORY_ENTRIES = 100;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.1;

const buildAboutMenu = (
  about: BukeConfig["about"],
  appName: string,
  originUrl: string,
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
      typeof item?.label === "string" && item.label.trim().length > 0 ? item.label.trim() : url;
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
let popupWindows: BrowserWindow[] = [];
let navigationHistory: NavigationHistoryItem[] = [];

const resolveHistoryTitle = (entryTitle: string, existing?: NavigationHistoryItem) => {
  const trimmedTitle = entryTitle.trim();
  if (trimmedTitle.length > 0) {
    return trimmedTitle;
  }
  return existing?.title?.trim() ?? "";
};

const recordNavigationHistory = (rawUrl: string, title = "") => {
  const parsed = safeParseUrl(rawUrl);
  if (!parsed || !["http:", "https:"].includes(parsed.protocol)) {
    return;
  }

  const entry = parsed.href;
  if (!entry) {
    return;
  }

  const existed = navigationHistory.find((item) => item.url === entry);
  navigationHistory = navigationHistory.filter((item) => item.url !== entry);
  navigationHistory.unshift({
    url: entry,
    title: resolveHistoryTitle(title, existed),
  });
  if (navigationHistory.length > MAX_HISTORY_ENTRIES) {
    navigationHistory = navigationHistory.slice(0, MAX_HISTORY_ENTRIES);
  }
  refreshApplicationMenu();
};

const getMainWindow = () =>
  mainWindow && BrowserWindow.getById(mainWindow.id) ? mainWindow : null;

const ensureMainWindow = () => getMainWindow() ?? createMainWindow();

type WebviewEventWithPayload = {
  detail?: unknown;
  data?: unknown;
};

function extractEventUrl(payload: unknown): string | null {
  if (typeof payload === "string") {
    const parsed = safeParseEventPayload(payload);
    if (parsed !== null) {
      return extractEventUrl(parsed);
    }

    const trimmed = payload.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as {
    url?: unknown;
    href?: unknown;
    detail?: unknown;
    data?: unknown;
  };

  if (typeof data.url === "string") {
    const trimmed = data.url.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof data.href === "string") {
    const trimmed = data.href.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (data.detail !== undefined) {
    const nested: string | null = extractEventUrl(data.detail);
    if (nested) {
      return nested;
    }
  }

  if (data.data !== undefined) {
    const nested: string | null = extractEventUrl(data.data);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function safeParseEventPayload(payload: string): unknown | null {
  const trimmed = payload.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    return null;
  }
}

function extractNavigationAllowed(payload: unknown): boolean | null {
  if (typeof payload === "string") {
    const parsed = safeParseEventPayload(payload);
    if (parsed !== null) {
      return extractNavigationAllowed(parsed);
    }
    return null;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as {
    allowed?: unknown;
    detail?: unknown;
    data?: unknown;
    [key: string]: unknown;
  };

  if (typeof data.allowed === "boolean") {
    return data.allowed;
  }

  if (data.detail !== undefined) {
    const nested: boolean | null = extractNavigationAllowed(data.detail);
    if (nested !== null) {
      return nested;
    }
  }

  if (data.data !== undefined) {
    const nested: boolean | null = extractNavigationAllowed(data.data);
    if (nested !== null) {
      return nested;
    }
  }

  return null;
}

function extractPopupUrl(event: WebviewEventWithPayload) {
  const candidates = [event.detail, event.data];
  for (const candidate of candidates) {
    const url = extractUrl(candidate);
    if (url) {
      return url;
    }
  }
  return null;
}

function extractUrl(payload: unknown) {
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const detail = payload as { url?: unknown; href?: unknown; detail?: unknown };
  if (typeof detail.url === "string") {
    const trimmed = detail.url.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof detail.href === "string") {
    const trimmed = detail.href.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return extractUrl(detail.detail);
}

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

const isOAuthPopupUrl = (rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    if (!host) {
      return false;
    }

    if (
      host === "accounts.google.com" ||
      host.endsWith(".google.com") ||
      host.includes("twitter.com") ||
      host.includes("x.com")
    ) {
      return true;
    }

    return (
      parsed.pathname.includes("/oauth") ||
      parsed.search.includes("oauth=") ||
      parsed.search.includes("client_id=") ||
      parsed.pathname.includes("/signin") ||
      parsed.pathname.includes("/login")
    );
  } catch (error) {
    return false;
  }
};

const getHostFromUrl = (rawUrl: string) => {
  try {
    return safeParseUrl(rawUrl)?.hostname.toLowerCase() ?? "";
  } catch {
    return "";
  }
};

const getDomainStem = (host: string) => {
  const parts = host.toLowerCase().trim().split(".").filter(Boolean);
  if (parts.length < 2) {
    return "";
  }

  return parts[parts.length - 2];
};

const isFuzzyDomainMatch = (targetHost: string, allowlistHost: string) => {
  const targetDomain = getDomainStem(targetHost);
  const allowDomain = getDomainStem(allowlistHost);
  if (!targetDomain || !allowDomain) {
    return false;
  }

  return targetDomain === allowDomain;
};

const isAllowedPopupHost = (rawUrl: string) => {
  const targetHost = getHostFromUrl(rawUrl);
  if (!targetHost || !BASE_URL) {
    return false;
  }

  if (targetHost === BASE_URL.hostname || targetHost.endsWith(`.${BASE_URL.hostname}`)) {
    return true;
  }

  const allowlist = bukeConfig.allowlist ?? DEFAULT_CONFIG.allowlist;
  for (const entry of allowlist) {
    const trimmed = entry.trim().toLowerCase();
    if (!trimmed) {
      continue;
    }

    if (trimmed.includes("*") || trimmed.includes("/")) {
      if (
        trimmed.startsWith("*.") &&
        (targetHost === trimmed.slice(2) || targetHost.endsWith(`.${trimmed.slice(2)}`))
      ) {
        return true;
      }

      const wildcardMatch = (() => {
        const schemeIndex = trimmed.indexOf("://");
        if (schemeIndex === -1) {
          return null;
        }

        const hostPart = trimmed.slice(schemeIndex + 3).split("/")[0] ?? "";
        if (!hostPart.startsWith("*.") || hostPart.length <= 2) {
          return null;
        }

        const suffix = hostPart.slice(2).toLowerCase();
        return suffix ? [suffix] : null;
      })();
      if (wildcardMatch?.[0]) {
        const suffix = wildcardMatch[0];
        if (targetHost === suffix || targetHost.endsWith(`.${suffix}`)) {
          return true;
        }
      }

      const parsed = safeParseUrl(trimmed);
      if (parsed) {
        const host = parsed.hostname.toLowerCase();
        if (targetHost === host || targetHost.endsWith(`.${host}`)) {
          return true;
        }

        if (isFuzzyDomainMatch(targetHost, host)) {
          return true;
        }
      }
      continue;
    }

    if (trimmed === targetHost || targetHost.endsWith(`.${trimmed}`)) {
      return true;
    }

    if (isFuzzyDomainMatch(targetHost, trimmed)) {
      return true;
    }
  }

  return false;
};

const isSameDomainAsBase = (rawUrl: string) => {
  const targetHost = getHostFromUrl(rawUrl);
  if (!targetHost || !BASE_URL) {
    return false;
  }

  return targetHost === BASE_URL.hostname || targetHost.endsWith(`.${BASE_URL.hostname}`);
};

const getActivePopupWindow = () =>
  popupWindows.find((popup) => getPopupWindowById(popup.id) !== null);

const getPopupWindowById = (id: number) => {
  return BrowserWindow.getById(id) ?? null;
};

const applyPopupNavigationRules = (url: string) => {
  const popupUrl = safeParseUrl(url);
  if (!popupUrl) {
    return ["^*"];
  }

  const allowlist = BASE_URL ? [BASE_URL.hostname] : [];
  allowlist.push(popupUrl.hostname);
  return buildNavigationRules(popupUrl, allowlist);
};

const openPopupWindow = (url: string) => {
  const existing = getActivePopupWindow();
  if (existing) {
    existing.webview.executeJavascript(
      `(() => { if (window.location && typeof window.location.assign === "function") { window.location.assign(${JSON.stringify(
        url,
      )}); } })();`,
    );
    existing.focus();
    return;
  }

  const parent = getMainWindow();
  const parentSize = parent?.getSize();
  const width = 520;
  const height = 760;
  const x =
    parent && parentSize ? Math.max(0, Math.floor((parentSize.width - width) / 2)) : undefined;
  const y =
    parent && parentSize ? Math.max(0, Math.floor((parentSize.height - height) / 2)) : undefined;

  const popup = new BrowserWindow({
    title: APP_NAME,
    url,
    frame: {
      x,
      y,
      width,
      height,
    },
  });

  popup.webview.setNavigationRules(applyPopupNavigationRules(url));
  popup.webview.on("new-window-open", (event) => {
    const popupUrl = extractPopupUrl(event);
    if (!popupUrl) {
      return;
    }
    if (isOAuthPopupUrl(popupUrl)) {
      popup.webview.executeJavascript(
        `(() => { if (window.location && typeof window.location.assign === "function") { window.location.assign(${JSON.stringify(
          popupUrl,
        )}); } })();`,
      );
      return;
    }
    openInBrowser(popupUrl);
    popup.close();
  });

  popup.webview.on("will-navigate", (event) => {
    const blockedUrl = extractEventUrl(event) ?? "";
    if (!blockedUrl) {
      return;
    }

    const allowed = extractNavigationAllowed(event);
    if (allowed === true) {
      return;
    }

    if (isOAuthPopupUrl(blockedUrl)) {
      return;
    }
    console.log(`Popup navigation blocked: ${blockedUrl}`);
  });

  popup.webview.on("dom-ready", () => {
    applyZoom(popup.webview, zoomLevel);
  });

  popup.on("close", () => {
    popupWindows = popupWindows.filter((item) => item.id !== popup.id);
  });
  popupWindows.push(popup);
  popup.focus();
};

const navigateInMainWebview = (url: string) => {
  const webview = resolveContentWebview();
  if (!webview) {
    return;
  }
  const target = url.trim();
  if (!target) {
    return;
  }
  webview.executeJavascript(
    `(() => {
      if (window.location && typeof window.location.assign === "function") {
        window.location.assign(${JSON.stringify(target)});
      }
    })();`,
  );
};

const goBackInMainWebview = () => {
  const webview = resolveContentWebview();
  if (!webview) {
    return;
  }

  webview.executeJavascript(`(() => {
    if (window.history && typeof window.history.back === "function") {
      window.history.back();
    }
  })();`);
};

const goForwardInMainWebview = () => {
  const webview = resolveContentWebview();
  if (!webview) {
    return;
  }

  webview.executeJavascript(`(() => {
    if (window.history && typeof window.history.forward === "function") {
      window.history.forward();
    }
  })();`);
};

const goHomeInMainWebview = () => {
  if (!BASE_URL) {
    return;
  }
  navigateInMainWebview(BASE_URL.href);
};

const handleNavigationHistoryEvent = (rawEvent: unknown, _webview: BrowserView | null) => {
  if (rawEvent) {
    const url = extractEventUrl(rawEvent);
    if (!url || url.startsWith("about:blank")) {
      return;
    }
    recordNavigationHistory(url);
  }
};

const handleHostMessage = (event: unknown) => {
  if (!event || typeof event !== "object") {
    return;
  }
  const data = (event as { data?: unknown }).data;
  if (!data || typeof data !== "object") {
    return;
  }
  const detail = (data as { detail?: unknown }).detail;
  const payload =
    typeof detail === "string"
      ? (() => {
          try {
            return JSON.parse(detail);
          } catch {
            return null;
          }
        })()
      : detail && typeof detail === "object"
        ? detail
        : null;
  if (!payload || typeof payload !== "object") {
    return;
  }
  const nav = payload as { __buke_nav__?: boolean; url?: string; title?: string };
  if (!nav.__buke_nav__ || typeof nav.url !== "string" || !nav.url) {
    return;
  }
  recordNavigationHistory(nav.url, typeof nav.title === "string" ? nav.title : "");
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
      const blockedUrl = extractEventUrl(event) ?? "unknown";
      const allowed = extractNavigationAllowed(event);
      if (allowed !== false) {
        handleNavigationHistoryEvent(event, webview);
        return;
      }
      console.log(`Navigation blocked: ${blockedUrl}`);
    });
    webview.on("did-commit-navigation", (event) => {
      handleNavigationHistoryEvent(event, webview);
    });
    webview.on("did-navigate", (event) => {
      handleNavigationHistoryEvent(event, webview);
    });
    webview.on("did-navigate-in-page", (event) => {
      handleNavigationHistoryEvent(event, webview);
    });
    webview.on("did-finish-load", (event) => {
      handleNavigationHistoryEvent(event, webview);
    });
    webview.on("new-window-open", (event) => {
      const url = extractPopupUrl(event);
      if (!url) {
        return;
      }
      if (isSameDomainAsBase(url)) {
        navigateInMainWebview(url);
        return;
      }

      if (isOAuthPopupUrl(url) || isAllowedPopupHost(url)) {
        openPopupWindow(url);
        return;
      }
      openInBrowser(url);
    });
  }

  webview.on("host-message", handleHostMessage);

  webview.on("dom-ready", () => {
    applyUserAgentOverride(webview, userAgentOverride);
    applySpaHistoryPatch(webview);
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
      stderr: "ignore",
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

const aboutMenu = buildAboutMenu(bukeConfig.about, APP_NAME, APP_URL);
const refreshApplicationMenu = () => {
  buildMenu(
    APP_NAME,
    isMacOS,
    aboutMenu.length > 0,
    aboutMenu,
    navigationHistory,
    APP_I18N_MENU,
    APP_LOCALE,
  );
};

const menuHandlers = {
  openUrl: openInBrowser,
  goBack: goBackInMainWebview,
  goForward: goForwardInMainWebview,
  goHome: goHomeInMainWebview,
  reload: reloadContent,
  toggleDevTools,
  zoomIn: () => adjustZoom("in"),
  zoomOut: () => adjustZoom("out"),
  zoomReset: () => adjustZoom("reset"),
  windowCompact: () => applyWindowPreset("compact"),
  windowStandard: () => applyWindowPreset("standard"),
  windowWide: () => applyWindowPreset("wide"),
  clearData: () => void clearSiteData(),
  openHistoryUrl: (url: string) => {
    navigateInMainWebview(url);
  },
  clearHistory: () => {
    navigationHistory = [];
    refreshApplicationMenu();
  },
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

if (BASE_URL) {
  recordNavigationHistory(BASE_URL.href);
}
refreshApplicationMenu();
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
