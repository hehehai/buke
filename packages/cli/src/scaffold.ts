import { existsSync } from "node:fs";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { InjectConfig, ProjectInfo } from "./config";
import { TEXT_EXTENSIONS } from "./constants";
import { prepareIconAssets } from "./icons";

const IGNORED_TEMPLATE_ENTRIES = new Set([".git", "build", "dist", "node_modules"]);
const INJECT_PRELOAD_SCRIPT_PATH = path.join("src", "views", "inject-preload.js");

export async function ensureEmptyDir(dir: string) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
    return;
  }
  const entries = await readdir(dir);
  if (entries.length > 0) {
    console.error(`Directory not empty: ${dir}`);
    process.exit(1);
  }
}

export async function prepareOutDir(dir: string, force: boolean) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
    return;
  }

  const entries = await readdir(dir);
  if (entries.length === 0) {
    return;
  }

  if (!force) {
    console.error(`Directory not empty: ${dir}`);
    process.exit(1);
  }

  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
}

export async function scaffoldProject({
  outDir,
  templateDir,
  projectInfo,
}: {
  outDir: string;
  templateDir: string;
  projectInfo: ProjectInfo;
}) {
  await ensureEmptyDir(outDir);
  await cp(templateDir, outDir, {
    recursive: true,
    filter: (source) => !IGNORED_TEMPLATE_ENTRIES.has(path.basename(source)),
  });
  await applyProjectInfo(outDir, projectInfo);
  await syncRuntimeConfig(outDir, projectInfo);
}

export async function applyProjectInfo(rootDir: string, projectInfo: ProjectInfo) {
  const iconAssets = await prepareIconAssets(rootDir, projectInfo);
  const trayIcon = projectInfo.tray.icon ?? iconAssets.tray ?? iconAssets.linux;
  const safeAreaPending = supportsSiteSafeArea(projectInfo);
  const initPending = safeAreaPending || hasInjection(projectInfo.inject);

  const replacements = new Map<string, string>([
    ["__APP_NAME__", projectInfo.appName],
    ["__APP_SLUG__", projectInfo.slug],
    ["__APP_ID__", projectInfo.appId],
    ["__APP_URL__", projectInfo.normalizedUrl],
    ["__APP_PARTITION__", projectInfo.partition],
    ["__SAFE_AREA_PENDING__", safeAreaPending ? "true" : "false"],
    ["__INIT_PENDING__", initPending ? "true" : "false"],
    ["__APP_LOCALE__", projectInfo.locale ? projectInfo.locale.trim() : "en"],
    ['"__WINDOW_WIDTH__"', String(projectInfo.window.width)],
    ['"__WINDOW_HEIGHT__"', String(projectInfo.window.height)],
    ['"__WINDOW_MIN_WIDTH__"', String(projectInfo.window.minWidth)],
    ['"__WINDOW_MIN_HEIGHT__"', String(projectInfo.window.minHeight)],
    ['"__HIDE_TITLE_BAR__"', projectInfo.window.hideTitleBar ? "true" : "false"],
    ['"__WINDOW_FULLSCREEN__"', projectInfo.window.fullscreen ? "true" : "false"],
    ['"__WINDOW_MAXIMIZED__"', projectInfo.window.maximized ? "true" : "false"],
    ['"__TRAY_ENABLED__"', projectInfo.tray.enabled ? "true" : "false"],
    ['"__TRAY_ICON__"', JSON.stringify(trayIcon ?? "")],
    ['"__HIDE_ON_CLOSE__"', projectInfo.tray.hideOnClose ? "true" : "false"],
    ['"__USER_AGENT__"', JSON.stringify(projectInfo.network.userAgent ?? "")],
    ['"__PROXY_URL__"', JSON.stringify(projectInfo.network.proxyUrl ?? "")],
    ['"__ICON_MAC__"', JSON.stringify(iconAssets.mac ?? "")],
    ['"__ICON_WIN__"', JSON.stringify(iconAssets.win ?? "")],
    ['"__ICON_LINUX__"', JSON.stringify(iconAssets.linux ?? "")],
    ["__CREATED_AT__", new Date().toISOString()],
  ]);

  await replacePlaceholders(rootDir, replacements);
}

function supportsSiteSafeArea(projectInfo: ProjectInfo) {
  if (!projectInfo.window.hideTitleBar || !projectInfo.safeArea.enabled) {
    return false;
  }

  try {
    const hostname = new URL(projectInfo.normalizedUrl).hostname;
    return hostname === "kimi.com" || hostname === "www.kimi.com";
  } catch {
    return false;
  }
}

function hasInjection(inject?: InjectConfig) {
  return (
    (Array.isArray(inject?.css) && inject.css.length > 0) ||
    (Array.isArray(inject?.js) && inject.js.length > 0)
  );
}

export async function syncRuntimeConfig(
  rootDir: string,
  projectInfo: ProjectInfo,
  configDir: string = process.cwd(),
) {
  const runtimeConfig: Record<string, unknown> = {
    name: projectInfo.appName,
    url: projectInfo.normalizedUrl,
    id: projectInfo.appId,
    templateVersion: "0.1.0",
  };

  if (projectInfo.partition !== "persist:default") {
    runtimeConfig.partition = projectInfo.partition;
  }

  const windowConfig: Record<string, unknown> = {};
  if (projectInfo.window.width !== 1200) {
    windowConfig.width = projectInfo.window.width;
  }
  if (projectInfo.window.height !== 780) {
    windowConfig.height = projectInfo.window.height;
  }
  if (projectInfo.window.minWidth !== 960) {
    windowConfig.minWidth = projectInfo.window.minWidth;
  }
  if (projectInfo.window.minHeight !== 640) {
    windowConfig.minHeight = projectInfo.window.minHeight;
  }
  if (projectInfo.window.hideTitleBar !== false) {
    windowConfig.hideTitleBar = projectInfo.window.hideTitleBar;
  }
  if (projectInfo.window.fullscreen) {
    windowConfig.fullscreen = true;
  }
  if (projectInfo.window.maximized) {
    windowConfig.maximized = true;
  }
  if (Object.keys(windowConfig).length > 0) {
    runtimeConfig.window = windowConfig;
  }

  const trayConfig: Record<string, unknown> = {};
  if (projectInfo.tray.enabled) {
    trayConfig.enabled = true;
  }
  if (projectInfo.tray.icon) {
    trayConfig.icon = projectInfo.tray.icon;
  }
  if (projectInfo.tray.hideOnClose !== (process.platform === "darwin")) {
    trayConfig.hideOnClose = projectInfo.tray.hideOnClose;
  }
  if (Object.keys(trayConfig).length > 0) {
    runtimeConfig.tray = trayConfig;
  }

  const networkConfig: Record<string, unknown> = {};
  if (projectInfo.network.userAgent) {
    networkConfig.userAgent = projectInfo.network.userAgent;
  }
  if (projectInfo.network.proxyUrl) {
    networkConfig.proxyUrl = projectInfo.network.proxyUrl;
  }
  if (Object.keys(networkConfig).length > 0) {
    runtimeConfig.network = networkConfig;
  }

  if (projectInfo.about) {
    runtimeConfig.about = projectInfo.about;
  }

  if (projectInfo.locale?.trim()) {
    runtimeConfig.locale = projectInfo.locale.trim();
  }

  if (projectInfo.i18n && Object.keys(projectInfo.i18n).length > 0) {
    runtimeConfig.i18n = projectInfo.i18n;
  }

  if (projectInfo.safeArea.enabled) {
    runtimeConfig.macosSafeArea = {
      enabled: true,
      top: projectInfo.safeArea.top,
      left: projectInfo.safeArea.left,
      right: projectInfo.safeArea.right,
      bottom: projectInfo.safeArea.bottom,
    };
  }

  const injectConfig = await resolveInjectionConfig(projectInfo.inject, configDir);
  if (injectConfig.css.length > 0 || injectConfig.js.length > 0) {
    runtimeConfig.inject = injectConfig;
  }

  await writeFile(
    path.join(rootDir, INJECT_PRELOAD_SCRIPT_PATH),
    `${buildInjectionPreloadScript(
      injectConfig,
      shouldApplySafeAreaPreload(projectInfo)
        ? buildSafeAreaCss(projectInfo.normalizedUrl, projectInfo.safeArea.top)
        : null,
    )}\n`,
    "utf8",
  );

  await writeFile(
    path.join(rootDir, "buke.config.json"),
    `${JSON.stringify(runtimeConfig, null, 2)}\n`,
    "utf8",
  );
}

const INLINE_PREFIX = "inline:";

async function resolveInjectionConfig(
  inject: InjectConfig | undefined,
  configDir: string,
): Promise<{ css: string[]; js: string[] }> {
  const [css, js] = await Promise.all([
    resolveInjectEntries(inject?.css, configDir),
    resolveInjectEntries(inject?.js, configDir),
  ]);
  return { css, js };
}

async function resolveInjectEntries(
  entries: string[] | undefined,
  configDir: string,
): Promise<string[]> {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }

  const normalized: string[] = [];
  for (const entry of entries) {
    if (typeof entry !== "string" || entry.trim() === "") {
      continue;
    }

    if (entry.startsWith(INLINE_PREFIX)) {
      normalized.push(entry);
      continue;
    }

    const resolvedPath = path.isAbsolute(entry) ? entry : path.join(configDir, entry);
    if (!existsSync(resolvedPath)) {
      console.log(`Injection file not found: ${resolvedPath}`);
      continue;
    }

    const content = await readFile(resolvedPath, "utf8");
    normalized.push(`${INLINE_PREFIX}${content}`);
  }

  return normalized;
}

function buildInjectionPreloadScript(inject: InjectConfig, safeAreaCss: string | null): string {
  const styleInjections = inject.css ?? [];
  const scriptInjections = inject.js ?? [];
  const cssEntries = styleInjections
    .map((entry) => unwrapInline(entry))
    .filter((css) => css.trim() !== "");
  const jsEntries = scriptInjections
    .map((entry) => unwrapInline(entry))
    .filter((js) => js.trim() !== "");

  const lines: string[] = [];
  lines.push("(() => {");
  lines.push("  const ensureStyle = (id, text) => {");
  lines.push("    if (!text) {");
  lines.push("      return;");
  lines.push("    }");
  lines.push("    let style = document.getElementById(id);");
  lines.push("    if (!style) {");
  lines.push(`      style = document.createElement("style");`);
  lines.push("      style.id = id;");
  lines.push("      (document.head || document.documentElement).appendChild(style);");
  lines.push("    }");
  lines.push("    style.textContent = text;");
  lines.push("  };");
  lines.push("  const runScript = (source) => {");
  lines.push("    if (!source) {");
  lines.push("      return;");
  lines.push("    }");
  lines.push("    try {");
  lines.push("      (new Function(source))();");
  lines.push("    } catch (error) {}");
  lines.push("  };");

  for (const [index, css] of cssEntries.entries()) {
    lines.push(
      `  ensureStyle(${JSON.stringify(`buke-inject-style-${index}`)}, ${JSON.stringify(css)});`,
    );
  }

  if (safeAreaCss) {
    lines.push(`  ensureStyle("buke-safe-area-style", ${JSON.stringify(safeAreaCss)});`);
  }

  for (const script of jsEntries) {
    lines.push(`  runScript(${JSON.stringify(script)});`);
  }

  lines.push("})();");

  return lines.join("\n");
}

function shouldApplySafeAreaPreload(projectInfo: ProjectInfo) {
  if (!projectInfo.safeArea.enabled || !projectInfo.window.hideTitleBar) {
    return false;
  }

  try {
    const hostname = new URL(projectInfo.normalizedUrl).hostname;
    return hostname === "kimi.com" || hostname === "www.kimi.com";
  } catch {
    return false;
  }
}

function buildSafeAreaCss(url: string, top: number): string | null {
  if (!url || top <= 0) {
    return null;
  }

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return null;
  }

  if (hostname !== "kimi.com" && hostname !== "www.kimi.com") {
    return null;
  }

  const safeTop = `${Math.max(0, top)}px`;
  return [
    ":root {",
    `  --buke-safe-top: ${safeTop};`,
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
  ].join("\n");
}

function unwrapInline(entry: string): string {
  if (entry.startsWith(INLINE_PREFIX)) {
    return entry.slice(INLINE_PREFIX.length);
  }
  return entry;
}

async function replacePlaceholders(root: string, replacements: Map<string, string>) {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") {
      continue;
    }

    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      await replacePlaceholders(fullPath, replacements);
      continue;
    }

    if (!TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      continue;
    }

    const contents = await readFile(fullPath, "utf8");
    let updated = contents;
    for (const [key, value] of replacements) {
      updated = updated.split(key).join(value);
    }

    if (updated !== contents) {
      await writeFile(fullPath, updated, "utf8");
    }
  }
}
