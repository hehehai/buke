import type { BrowserView } from "electrobun/bun";
import type { InjectionAssets } from "./config";

export type SafeAreaConfig = {
  enabled: boolean;
  top: number;
  left: number;
  right: number;
  bottom: number;
};

export function buildNavigationRules(baseUrl: URL, allowlist: string[]) {
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
}

export function applyZoom(webview: BrowserView, zoomLevel: number) {
  const zoomValue = zoomLevel.toFixed(2);
  webview.executeJavascript(
    `document.documentElement.style.zoom = ${JSON.stringify(zoomValue)};`
  );
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
    } catch (error) {}
  })();`;
  webview.executeJavascript(script);
}

export function applySafeAreaCss(webview: BrowserView, safeArea: SafeAreaConfig, enabled: boolean) {
  if (!enabled) {
    return;
  }

  const safeCss = [
    ":root {",
    `  --buke-safe-top: ${safeArea.top}px;`,
    `  --buke-safe-left: ${safeArea.left}px;`,
    `  --buke-safe-right: ${safeArea.right}px;`,
    `  --buke-safe-bottom: ${safeArea.bottom}px;`,
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

export function applyInjectionAssets(webview: BrowserView, assets: InjectionAssets) {
  for (const [index, css] of assets.css.entries()) {
    const styleId = `buke-inject-style-${index}`;
    const script = `(() => { const id=${JSON.stringify(
      styleId
    )}; let el=document.getElementById(id); if(!el){ el=document.createElement('style'); el.id=id; document.head.appendChild(el); } el.textContent=${JSON.stringify(
      css
    )}; })();`;
    webview.executeJavascript(script);
  }

  for (const script of assets.js) {
    webview.executeJavascript(`(() => { ${script}\n })();`);
  }
}
