import type { BrowserView } from "electrobun/bun";
import { type BukeConfig, DEFAULT_ALLOWLIST, type InjectionAssets } from "./config";

export function buildNavigationRules(baseUrl: URL, allowlist: string[]) {
  const rules = ["^*"];
  const addRule = (rule: string) => {
    if (!rules.includes(rule)) {
      rules.push(rule);
    }
  };
  const addAllowlistEntry = (entry: string) => {
    const trimmed = entry.trim();
    if (!trimmed) {
      return;
    }

    if (trimmed.includes("*") || trimmed.includes("/")) {
      addRule(trimmed);
      return;
    }

    try {
      const url = trimmed.includes("://")
        ? new URL(trimmed)
        : new URL(`${baseUrl.protocol}//${trimmed}`);
      addHostRules(url.protocol.replace(":", ""), url.hostname);
    } catch {
      console.log(`Invalid allowlist entry: ${trimmed}`);
    }
  };

  const buildAliasHosts = (host: string) => {
    const trimmed = host.trim().toLowerCase();
    if (!trimmed || /^(\d{1,3}\.){3}\d{1,3}$/.test(trimmed)) {
      return [trimmed];
    }

    const parts = trimmed.split(".");
    if (parts.length <= 1) {
      return [trimmed];
    }

    const aliasHosts = [];
    for (let start = 0; start <= parts.length - 2; start += 1) {
      aliasHosts.push(parts.slice(start).join("."));
    }

    const rootDomain = parts[parts.length - 2];
    if (rootDomain) {
      aliasHosts.push(`${rootDomain}.*`);
    }

    return aliasHosts;
  };

  const addHostRules = (protocol: string, host: string) => {
    const safeProtocol = protocol === "https" ? "https" : protocol;
    for (const aliasHost of buildAliasHosts(host)) {
      addRule(`${safeProtocol}://${aliasHost}/*`);
      addRule(`${safeProtocol}://${aliasHost}:*/*`);

      if (aliasHost.includes("*")) {
        continue;
      }

      addRule(`${safeProtocol}://*.${aliasHost}/*`);
      addRule(`${safeProtocol}://*.${aliasHost}:*/*`);
    }
  };

  addHostRules(baseUrl.protocol.replace(":", ""), baseUrl.hostname);
  for (const entry of DEFAULT_ALLOWLIST) {
    addAllowlistEntry(entry);
  }

  for (const entry of allowlist) {
    addAllowlistEntry(entry);
  }

  addRule("about:*");
  addRule("data:*");
  return rules;
}

export function applyZoom(webview: BrowserView, zoomLevel: number) {
  const zoomValue = zoomLevel.toFixed(2);
  webview.executeJavascript(`document.documentElement.style.zoom = ${JSON.stringify(zoomValue)};`);
}

export function applyUserAgentOverride(webview: BrowserView, userAgentOverride: string) {
  if (!userAgentOverride) {
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
    } catch {}
  })();`;
  webview.executeJavascript(script);
}

export function applyInjectionAssets(webview: BrowserView, assets: InjectionAssets) {
  for (const [index, css] of assets.css.entries()) {
    const styleId = `buke-inject-style-${index}`;
    const script = `(() => { const id=${JSON.stringify(
      styleId,
    )}; let el=document.getElementById(id); if(!el){ el=document.createElement('style'); el.id=id; document.head.appendChild(el); } el.textContent=${JSON.stringify(
      css,
    )}; })();`;
    webview.executeJavascript(script);
  }

  for (const script of assets.js) {
    webview.executeJavascript(`(() => { ${script}\n })();`);
  }
}

export function applySafeArea(webview: BrowserView, config: BukeConfig) {
  const safeTop = getSafeTop(config);
  if (safeTop === null) {
    return false;
  }

  const css = buildSiteSafeAreaCss(config, safeTop);
  if (!css) {
    return false;
  }

  injectStyle(webview, "buke-safe-area-style", css);
  return true;
}

function getSafeTop(config: BukeConfig) {
  const safeArea = config.macosSafeArea;
  if (!safeArea?.enabled || !config.window?.hideTitleBar || process.platform !== "darwin") {
    return null;
  }
  return Math.max(0, safeArea.top ?? 0);
}

function buildSiteSafeAreaCss(config: BukeConfig, safeTop: number) {
  const url = config.url?.trim();
  if (!url) {
    return "";
  }

  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    return "";
  }

  if (hostname !== "kimi.com" && hostname !== "www.kimi.com") {
    return "";
  }

  const top = `${safeTop}px`;
  return [
    ":root {",
    `  --buke-safe-top: ${top};`,
    "}",
    "html, body {",
    "  overflow: hidden !important;",
    "}",
    ".home-page {",
    "  box-sizing: border-box !important;",
    "}",
    ".home-page::before {",
    "  content: '' !important;",
    "  display: block !important;",
    "  width: 100% !important;",
    "  height: var(--buke-safe-top) !important;",
    "  flex-shrink: 0 !important;",
    "}",
    ".home-top {",
    "  min-height: max(0px, calc(100px - var(--buke-safe-top))) !important;",
    "  height: max(0px, calc(((100dvh - 12px - 50px - 100px - var(--chat-input-height)) / 2) - var(--buke-safe-top))) !important;",
    "}",
  ].join("\\n");
}

export function applySpaHistoryPatch(webview: BrowserView) {
  webview.executeJavascript(`(() => {
    if (window.__buke_spa_patched__) return;
    window.__buke_spa_patched__ = true;

    let lastUrl = location.href;

    const notify = () => {
      const url = location.href;
      if (url === lastUrl) return;
      lastUrl = url;
      const title = document.title || "";
      if (typeof window.__electrobunSendToHost === "function") {
        window.__electrobunSendToHost({__buke_nav__: true, url, title});
      }
    };

    const wrap = (original) => function(...args) {
      const result = original.apply(this, args);
      setTimeout(notify, 0);
      return result;
    };

    history.pushState = wrap(history.pushState);
    history.replaceState = wrap(history.replaceState);
    window.addEventListener("popstate", () => setTimeout(notify, 0));
  })();`);
}

function injectStyle(webview: BrowserView, styleId: string, css: string) {
  webview.executeJavascript(`(() => {
    const id = ${JSON.stringify(styleId)};
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement("style");
      style.id = id;
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = ${JSON.stringify(css)};
  })();`);
}
