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
  const zoomPct = Math.round(zoomLevel * 100);
  webview.executeJavascript(`(() => {
    const zoom = ${zoomPct};
    const zoomValue = zoom / 100;
    const isWindows = /windows/i.test(navigator.userAgent);
    if (isWindows) {
      document.body.style.transform = "scale(" + zoomValue + ")";
      document.body.style.transformOrigin = "top left";
      document.body.style.width = (100 / zoomValue) + "%";
      document.body.style.height = (100 / zoomValue) + "%";
    } else {
      document.documentElement.style.zoom = zoom + "%";
    }
    window.localStorage.setItem("htmlZoom", zoom + "%");
  })();`);
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

export function applyDarkMode(webview: BrowserView) {
  webview.executeJavascript(`(() => {
    document.documentElement.style.colorScheme = "dark";
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      meta.setAttribute("content", "dark");
    } else {
      const newMeta = document.createElement("meta");
      newMeta.name = "color-scheme";
      newMeta.content = "dark";
      (document.head || document.documentElement).appendChild(newMeta);
    }
  })();`);
}

export function applyBuiltinShortcuts(webview: BrowserView) {
  webview.executeJavascript(`(() => {
    if (window.__buke_builtin_shortcuts__) return;
    window.__buke_builtin_shortcuts__ = true;

    const isMac = /macintosh|mac os x/i.test(navigator.userAgent);
    const shortcuts = {
      "[": () => window.history.back(),
      "]": () => window.history.forward(),
      "-": () => {
        const cur = window.localStorage.getItem("htmlZoom") || "100%";
        const next = Math.max(parseInt(cur) - 10, 30) + "%";
        window.__bukeSetZoom?.(next);
      },
      "=": () => {
        const cur = window.localStorage.getItem("htmlZoom") || "100%";
        const next = Math.min(parseInt(cur) + 10, 200) + "%";
        window.__bukeSetZoom?.(next);
      },
      "+": () => {
        const cur = window.localStorage.getItem("htmlZoom") || "100%";
        const next = Math.min(parseInt(cur) + 10, 200) + "%";
        window.__bukeSetZoom?.(next);
      },
      "0": () => window.__bukeSetZoom?.("100%"),
      "r": () => window.location.reload(),
      "ArrowUp": () => window.scrollTo(0, 0),
      "ArrowDown": () => window.scrollTo(0, document.body.scrollHeight),
    };

    window.__bukeSetZoom = (zoom) => {
      const zoomValue = parseFloat(zoom) / 100;
      const isWindows = /windows/i.test(navigator.userAgent);
      if (isWindows) {
        document.body.style.transform = "scale(" + zoomValue + ")";
        document.body.style.transformOrigin = "top left";
        document.body.style.width = (100 / zoomValue) + "%";
        document.body.style.height = (100 / zoomValue) + "%";
      } else {
        document.documentElement.style.zoom = zoom;
      }
      window.localStorage.setItem("htmlZoom", zoom);
    };

    document.addEventListener("keyup", (e) => {
      if ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) {
        const fn = shortcuts[e.key];
        if (fn) { e.preventDefault(); fn(); }
      }
    });
  })();`);
}

export function applyChineseIMEFix(webview: BrowserView) {
  webview.executeJavascript(`(() => {
    if (window.__buke_ime_fix__) return;
    window.__buke_ime_fix__ = true;
    document.addEventListener("keydown", (e) => {
      if (e.key === "Process") e.stopPropagation();
    }, true);
  })();`);
}

export function applyNotificationOverride(webview: BrowserView) {
  webview.executeJavascript(`(() => {
    if (window.__buke_notification_override__) return;
    window.__buke_notification_override__ = true;
    let permVal = "granted";
    window.Notification = function(title, options) {
      const body = options?.body || "";
      let icon = options?.icon || "";
      if (icon.startsWith("/")) icon = window.location.origin + icon;
      if (typeof window.__electrobunSendToHost === "function") {
        window.__electrobunSendToHost({ __buke_notification__: true, title, body, icon });
      }
    };
    window.Notification.requestPermission = async () => "granted";
    Object.defineProperty(window.Notification, "permission", {
      enumerable: true,
      get: () => permVal,
      set: (v) => { permVal = v; },
    });
  })();`);
}

export function applyDisabledWebShortcuts(webview: BrowserView) {
  webview.executeJavascript(`(() => {
    if (window.__buke_shortcuts_disabled__) return;
    window.__buke_shortcuts_disabled__ = true;
    document.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey) {
        const key = e.key.toLowerCase();
        const allowed = ["a", "c", "v", "x", "z"];
        if (!allowed.includes(key)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }, true);
  })();`);
}

export function applyDragDrop(webview: BrowserView) {
  webview.executeJavascript(`(() => {
    if (window.__buke_dragdrop__) return;
    window.__buke_dragdrop__ = true;
    document.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    document.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const event = new CustomEvent("buke-file-drop", {
          detail: { files: Array.from(e.dataTransfer.files).map(f => f.name) }
        });
        document.dispatchEvent(event);
      }
    });
  })();`);
}

export function applyPastePlainText(webview: BrowserView) {
  webview.executeJavascript(`(() => {
    if (window.__buke_paste_plain__) return;
    window.__buke_paste_plain__ = true;
    document.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData("text/plain");
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }, true);
  })();`);
}

export function applyFullscreenPolyfill(webview: BrowserView) {
  webview.executeJavascript(`(() => {
    if (window.__buke_fullscreen_polyfill__) return;
    window.__buke_fullscreen_polyfill__ = true;

    let fsElement = null;
    let actualFsElement = null;
    let origStyles = null;
    let origParent = null;
    let origNextSibling = null;
    let wasInBody = false;

    if (!document.getElementById("buke-fullscreen-style")) {
      const s = document.createElement("style");
      s.id = "buke-fullscreen-style";
      s.textContent = [
        "body.buke-fs-active { overflow: hidden !important; }",
        ".buke-fs-element {",
        "  position: fixed !important; top: 0 !important; left: 0 !important;",
        "  width: 100vw !important; height: 100vh !important;",
        "  max-width: 100vw !important; max-height: 100vh !important;",
        "  margin: 0 !important; padding: 0 !important;",
        "  z-index: 2147483647 !important; background: #000 !important;",
        "  object-fit: contain !important;",
        "}",
        ".buke-fs-element video { width: 100% !important; height: 100% !important; object-fit: contain !important; }",
      ].join("\\n");
      (document.head || document.documentElement).appendChild(s);
    }

    function findLargestVideo() {
      const videos = document.querySelectorAll("video");
      if (!videos.length) return null;
      let best = videos[0], maxArea = 0;
      videos.forEach(v => {
        const r = v.getBoundingClientRect();
        const a = r.width * r.height;
        if (a > maxArea || !v.paused) { maxArea = a; best = v; }
      });
      return best;
    }

    function fireEvents(el) {
      for (const name of ["fullscreenchange", "webkitfullscreenchange"]) {
        const ev = new Event(name, { bubbles: true });
        document.dispatchEvent(ev);
        if (el) el.dispatchEvent(ev);
      }
    }

    function enterFs(element) {
      fsElement = element;
      let target = element;
      if (element === document.documentElement || element === document.body) {
        const vid = findLargestVideo();
        if (vid) { target = vid; actualFsElement = vid; }
        else { actualFsElement = element; }
      } else {
        actualFsElement = element;
      }

      origStyles = {};
      for (const k of ["position","top","left","width","height","maxWidth","maxHeight","margin","padding","zIndex","background","objectFit"]) {
        origStyles[k] = target.style[k];
      }
      wasInBody = target.parentNode === document.body;
      if (!wasInBody) { origParent = target.parentNode; origNextSibling = target.nextSibling; }

      target.classList.add("buke-fs-element");
      document.body.classList.add("buke-fs-active");
      if (!wasInBody) document.body.appendChild(target);

      if (typeof window.__electrobunSendToHost === "function") {
        window.__electrobunSendToHost({ __buke_fullscreen__: true, enter: true });
      }
      fireEvents(element);
      return Promise.resolve();
    }

    function exitFs() {
      if (!fsElement) return Promise.resolve();
      const exitEl = fsElement;
      const target = actualFsElement;

      target.classList.remove("buke-fs-element");
      document.body.classList.remove("buke-fs-active");

      if (origStyles) {
        for (const k of Object.keys(origStyles)) target.style[k] = origStyles[k];
      }
      if (!wasInBody && origParent) {
        if (origNextSibling && origNextSibling.parentNode === origParent) {
          origParent.insertBefore(target, origNextSibling);
        } else if (origParent.isConnected) {
          origParent.appendChild(target);
        }
      }

      fsElement = null; actualFsElement = null; origStyles = null;
      origParent = null; origNextSibling = null; wasInBody = false;

      if (typeof window.__electrobunSendToHost === "function") {
        window.__electrobunSendToHost({ __buke_fullscreen__: true, enter: false });
      }
      fireEvents(exitEl);
      return Promise.resolve();
    }

    Object.defineProperty(document, "fullscreenEnabled", { get: () => true, configurable: true });
    Object.defineProperty(document, "webkitFullscreenEnabled", { get: () => true, configurable: true });
    Object.defineProperty(document, "fullscreenElement", { get: () => fsElement, configurable: true });
    Object.defineProperty(document, "webkitFullscreenElement", { get: () => fsElement, configurable: true });
    Object.defineProperty(document, "webkitCurrentFullScreenElement", { get: () => fsElement, configurable: true });

    Element.prototype.requestFullscreen = function() { return enterFs(this); };
    Element.prototype.webkitRequestFullscreen = function() { return enterFs(this); };
    Element.prototype.webkitRequestFullScreen = function() { return enterFs(this); };
    document.exitFullscreen = exitFs;
    document.webkitExitFullscreen = exitFs;
    document.webkitCancelFullScreen = exitFs;

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && fsElement) exitFs();
    }, true);
  })();`);
}

export function applyWasmHeaders(webview: BrowserView) {
  webview.executeJavascript(`(() => {
    if (window.__buke_wasm_headers__) return;
    window.__buke_wasm_headers__ = true;
    if (typeof window.crossOriginIsolated === "undefined" || !window.crossOriginIsolated) {
      const origFetch = window.fetch;
      window.fetch = async function(...args) {
        const response = await origFetch.apply(this, args);
        return response;
      };
    }
  })();`);
}

export function applyToast(webview: BrowserView) {
  webview.executeJavascript(`(() => {
    if (window.__buke_toast__) return;
    window.__buke_toast__ = true;
    window.bukeToast = function(msg) {
      const m = document.createElement("div");
      m.textContent = msg;
      m.style.cssText = "max-width:60%;min-width:80px;padding:0 12px;height:32px;color:#fff;" +
        "line-height:32px;text-align:center;border-radius:8px;position:fixed;bottom:24px;right:28px;" +
        "z-index:999999;background:rgba(0,0,0,.8);font-size:13px;pointer-events:none;" +
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";
      document.body.appendChild(m);
      setTimeout(() => {
        m.style.transition = "opacity 0.5s ease-in";
        m.style.opacity = "0";
        setTimeout(() => { if (m.parentNode) m.parentNode.removeChild(m); }, 500);
      }, 3000);
    };
  })();`);
}

export function applyDownloadDetection(webview: BrowserView) {
  webview.executeJavascript(`(() => {
    if (window.__buke_download_detect__) return;
    window.__buke_download_detect__ = true;

    const DOWNLOADABLE_EXT = new Set([
      "pdf","doc","docx","xls","xlsx","ppt","pptx","txt","rtf","odt","ods","odp",
      "pages","numbers","key","epub","mobi",
      "zip","rar","7z","tar","gz","gzip","bz2","xz","deb","rpm","pkg","msi","exe","dmg","apk","ipa",
      "json","xml","csv","sql","db","sqlite","yaml","yml","toml","ini","cfg","conf","log",
      "js","ts","jsx","tsx","css","scss","sass","less","sh","bat","ps1",
      "ttf","otf","woff","woff2","eot",
      "ai","psd","sketch","fig","xd",
      "iso","img","bin","torrent","jar","war","raw"
    ]);
    const PREVIEW_EXT = new Set([
      "png","jpg","jpeg","gif","webp","svg","bmp","tiff","tif","avif",
      "mp4","webm","mov","mkv","avi","ogv","mp3","wav","ogg","flac","aac","m4a"
    ]);
    const DL_PATHS = ["/download/","/files/","/attachments/","/assets/","/releases/","/dist/"];

    function getExt(url) {
      try {
        const p = new URL(url).pathname.toLowerCase();
        const i = p.lastIndexOf(".");
        return i > -1 ? p.slice(i + 1) : "";
      } catch { return ""; }
    }

    function isDownloadable(url) {
      try {
        const ext = getExt(url);
        if (PREVIEW_EXT.has(ext)) return false;
        const u = new URL(url);
        if (u.searchParams.has("download") || u.searchParams.has("attachment")) return true;
        if (DOWNLOADABLE_EXT.has(ext)) return true;
        return DL_PATHS.some(p => u.pathname.toLowerCase().includes(p));
      } catch { return false; }
    }

    function getFilename(url) {
      try {
        const p = new URL(url).pathname;
        let name = p.substring(p.lastIndexOf("/") + 1);
        if (name && name.includes(".")) return decodeURIComponent(name);
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        if (url.startsWith("data:image/")) {
          const mime = url.substring(11, url.indexOf(";"));
          return "image-" + ts + "." + mime;
        }
        for (const [hint, ext] of [["jpg","jpg"],["jpeg","jpg"],["png","png"],["gif","gif"],["webp","webp"],["svg","svg"]]) {
          if (url.includes(hint)) return "image-" + ts + "." + ext;
        }
        return "download-" + ts;
      } catch {
        return "download-" + new Date().toISOString().replace(/[:.]/g, "-");
      }
    }

    function notifyHost(type, data) {
      if (typeof window.__electrobunSendToHost === "function") {
        window.__electrobunSendToHost({ __buke_download__: true, type, ...data });
      }
    }

    // Intercept anchor clicks for downloadable files
    document.addEventListener("click", (e) => {
      const anchor = e.target && typeof e.target.closest === "function" ? e.target.closest("a") : null;
      if (!anchor || !anchor.href) return;
      const url = anchor.href;
      if (url.startsWith("blob:") || url.startsWith("data:")) return;
      if (anchor.download || e.metaKey || e.ctrlKey || isDownloadable(url)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        notifyHost("url", { url: url, filename: anchor.download || getFilename(url) });
      }
    }, true);

    // Intercept blob downloads via createElement("a")
    const origCreateElement = document.createElement.bind(document);
    document.createElement = function(tag) {
      const el = origCreateElement(tag);
      if (tag !== "a") return el;
      el.addEventListener("click", (e) => {
        const url = el.href;
        if (!url) return;
        const filename = el.download || getFilename(url);
        if (url.startsWith("blob:")) {
          e.preventDefault();
          e.stopImmediatePropagation();
          // Convert blob to base64 and send
          const blob = window.__buke_blob_cache__?.get(url);
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => {
              notifyHost("binary", { filename, base64: reader.result.split(",")[1] || "" });
            };
            reader.readAsDataURL(blob);
          }
        } else if (url.startsWith("data:")) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const parts = url.split(",");
          notifyHost("binary", { filename, base64: parts[1] || "" });
        }
      }, true);
      return el;
    };

    // Track blob URLs
    window.__buke_blob_cache__ = new Map();
    const origCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = function(blob) {
      const url = origCreateObjectURL.call(URL, blob);
      window.__buke_blob_cache__.set(url, blob);
      return url;
    };
  })();`);
}

export function applyContextMenu(webview: BrowserView) {
  webview.executeJavascript(`(() => {
    if (window.__buke_context_menu__) return;
    window.__buke_context_menu__ = true;

    const isCN = (navigator.language || "").startsWith("zh");
    const T = {
      downloadImage: isCN ? "下载图片" : "Download Image",
      downloadVideo: isCN ? "下载视频" : "Download Video",
      downloadFile: isCN ? "下载文件" : "Download File",
      copyAddress: isCN ? "复制地址" : "Copy Address",
      openInBrowser: isCN ? "浏览器打开" : "Open in Browser",
    };

    function getThemeColors() {
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      return dark
        ? { bg: "#2d2d2d", border: "#404040", color: "#fff", shadow: "0 4px 16px rgba(0,0,0,0.4)", hover: "#404040" }
        : { bg: "#fff", border: "#e0e0e0", color: "#333", shadow: "0 4px 16px rgba(0,0,0,0.15)", hover: "#d0d0d0" };
    }

    let menuEl = null;

    function hideMenu() {
      if (menuEl) { menuEl.style.display = "none"; }
    }

    function showMenu(x, y, items) {
      if (menuEl) menuEl.remove();
      const t = getThemeColors();
      menuEl = document.createElement("div");
      menuEl.style.cssText = "position:fixed;background:" + t.bg + ";border:1px solid " + t.border +
        ";border-radius:6px;box-shadow:" + t.shadow + ";padding:4px 0;min-width:120px;" +
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:" +
        t.color + ";z-index:999999;user-select:none;";
      for (const {text, fn} of items) {
        const item = document.createElement("div");
        item.textContent = text;
        item.style.cssText = "padding:8px 16px;cursor:pointer;line-height:1.2;border-radius:3px;margin:2px 4px;transition:background 0.1s;white-space:nowrap;";
        item.addEventListener("mouseenter", () => { item.style.background = t.hover; });
        item.addEventListener("mouseleave", () => { item.style.background = "transparent"; });
        item.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); fn(); hideMenu(); });
        menuEl.appendChild(item);
      }
      menuEl.style.left = x + "px";
      menuEl.style.top = y + "px";
      document.body.appendChild(menuEl);
      const r = menuEl.getBoundingClientRect();
      if (r.right > window.innerWidth) menuEl.style.left = (x - r.width) + "px";
      if (r.bottom > window.innerHeight) menuEl.style.top = (y - r.height) + "px";
    }

    function notify(type, data) {
      if (typeof window.__electrobunSendToHost === "function") {
        window.__electrobunSendToHost({ __buke_download__: true, type, ...data });
      }
    }

    function openExternal(url) {
      if (typeof window.__electrobunSendToHost === "function") {
        window.__electrobunSendToHost({ __buke_open_external__: true, url });
      }
    }

    function getMediaInfo(el) {
      if (el.tagName === "IMG" && el.src) return { type: "image", url: el.src };
      if (el.tagName === "VIDEO") return { type: "video", url: el.src || el.currentSrc };
      const bg = el.style?.backgroundImage;
      if (bg) { const m = bg.match(/url\\(["']?([^"')]+)["']?\\)/); if (m) return { type: "image", url: m[1] }; }
      return null;
    }

    function getFilename(url) {
      try { const p = new URL(url).pathname; const n = p.substring(p.lastIndexOf("/") + 1); if (n && n.includes(".")) return decodeURIComponent(n); } catch {}
      return "download-" + Date.now();
    }

    document.addEventListener("contextmenu", (e) => {
      const media = getMediaInfo(e.target);
      const link = e.target.closest ? e.target.closest("a") : null;
      if (!media && (!link || !link.href)) return;

      e.preventDefault();
      e.stopPropagation();
      const items = [];

      if (media) {
        items.push(
          { text: media.type === "image" ? T.downloadImage : T.downloadVideo, fn: () => notify("url", { url: media.url, filename: getFilename(media.url) }) },
          { text: T.copyAddress, fn: () => navigator.clipboard.writeText(media.url) },
          { text: T.openInBrowser, fn: () => openExternal(media.url) }
        );
      } else if (link) {
        items.push(
          { text: T.copyAddress, fn: () => navigator.clipboard.writeText(link.href) },
          { text: T.openInBrowser, fn: () => openExternal(link.href) }
        );
      }

      showMenu(e.clientX, e.clientY, items);
    }, true);

    document.addEventListener("click", hideMenu);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideMenu(); });
  })();`);
}

export function applyThemeDetection(webview: BrowserView) {
  webview.executeJavascript(`(() => {
    if (window.__buke_theme_detect__) return;
    window.__buke_theme_detect__ = true;

    let debounceTimer;
    const notify = (mode) => {
      if (typeof window.__electrobunSendToHost === "function") {
        window.__electrobunSendToHost({ __buke_theme__: true, mode });
      }
    };

    const detectTheme = () => {
      const doc = document.documentElement;
      const body = document.body;
      const isDark = doc.classList.contains("dark") || body.classList.contains("dark") ||
        doc.getAttribute("data-theme") === "dark" || body.getAttribute("data-theme") === "dark" ||
        doc.style.colorScheme === "dark";
      const isLight = doc.classList.contains("light") || body.classList.contains("light") ||
        doc.getAttribute("data-theme") === "light" || body.getAttribute("data-theme") === "light" ||
        doc.style.colorScheme === "light";
      if (isDark) notify("dark");
      else if (isLight) notify("light");
    };

    const debounced = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(detectTheme, 200);
    };

    setTimeout(detectTheme, 500);

    const observer = new MutationObserver(debounced);
    const cfg = { attributes: true, attributeFilter: ["class", "data-theme", "style"], subtree: false };
    observer.observe(document.documentElement, cfg);
    if (document.body) observer.observe(document.body, cfg);

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", detectTheme);
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
