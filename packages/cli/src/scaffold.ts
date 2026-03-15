import path from "node:path";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { TEXT_EXTENSIONS } from "./constants";
import type { ProjectInfo } from "./config";
import { prepareIconAssets } from "./icons";

const IGNORED_TEMPLATE_ENTRIES = new Set([".git", "build", "dist", "node_modules"]);

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
  projectInfo
}: {
  outDir: string;
  templateDir: string;
  projectInfo: ProjectInfo;
}) {
  await ensureEmptyDir(outDir);
  await cp(templateDir, outDir, {
    recursive: true,
    filter: (source) => !IGNORED_TEMPLATE_ENTRIES.has(path.basename(source))
  });
  await applyProjectInfo(outDir, projectInfo);
  await writeRuntimeConfig(outDir, projectInfo);
}

export async function applyProjectInfo(rootDir: string, projectInfo: ProjectInfo) {
  const iconAssets = await prepareIconAssets(rootDir, projectInfo);
  const trayIcon = projectInfo.tray.icon ?? iconAssets.tray ?? iconAssets.linux;

  const replacements = new Map<string, string>([
    ["__APP_NAME__", projectInfo.appName],
    ["__APP_SLUG__", projectInfo.slug],
    ["__APP_ID__", projectInfo.appId],
    ["__APP_URL__", projectInfo.normalizedUrl],
    ["__APP_PARTITION__", projectInfo.partition],
    ["\"__SAFE_AREA_ENABLED__\"", projectInfo.safeArea.enabled ? "true" : "false"],
    ["\"__SAFE_AREA_TOP__\"", String(projectInfo.safeArea.top)],
    ["\"__SAFE_AREA_LEFT__\"", String(projectInfo.safeArea.left)],
    ["\"__SAFE_AREA_RIGHT__\"", String(projectInfo.safeArea.right)],
    ["\"__SAFE_AREA_BOTTOM__\"", String(projectInfo.safeArea.bottom)],
    ["__SAFE_AREA_TOP__", String(projectInfo.safeArea.top)],
    ["__SAFE_AREA_LEFT__", String(projectInfo.safeArea.left)],
    ["__SAFE_AREA_RIGHT__", String(projectInfo.safeArea.right)],
    ["__SAFE_AREA_BOTTOM__", String(projectInfo.safeArea.bottom)],
    ["\"__WINDOW_WIDTH__\"", String(projectInfo.window.width)],
    ["\"__WINDOW_HEIGHT__\"", String(projectInfo.window.height)],
    ["\"__WINDOW_MIN_WIDTH__\"", String(projectInfo.window.minWidth)],
    ["\"__WINDOW_MIN_HEIGHT__\"", String(projectInfo.window.minHeight)],
    ["\"__HIDE_TITLE_BAR__\"", projectInfo.window.hideTitleBar ? "true" : "false"],
    ["\"__WINDOW_FULLSCREEN__\"", projectInfo.window.fullscreen ? "true" : "false"],
    ["\"__WINDOW_MAXIMIZED__\"", projectInfo.window.maximized ? "true" : "false"],
    ["\"__TRAY_ENABLED__\"", projectInfo.tray.enabled ? "true" : "false"],
    ["\"__TRAY_ICON__\"", JSON.stringify(trayIcon ?? "")],
    ["\"__HIDE_ON_CLOSE__\"", projectInfo.tray.hideOnClose ? "true" : "false"],
    ["\"__USER_AGENT__\"", JSON.stringify(projectInfo.network.userAgent ?? "")],
    ["\"__PROXY_URL__\"", JSON.stringify(projectInfo.network.proxyUrl ?? "")],
    ["\"__ICON_MAC__\"", JSON.stringify(iconAssets.mac ?? "")],
    ["\"__ICON_WIN__\"", JSON.stringify(iconAssets.win ?? "")],
    ["\"__ICON_LINUX__\"", JSON.stringify(iconAssets.linux ?? "")],
    ["__CREATED_AT__", new Date().toISOString()]
  ]);

  await replacePlaceholders(rootDir, replacements);
}

async function writeRuntimeConfig(rootDir: string, projectInfo: ProjectInfo) {
  const runtimeConfig: Record<string, unknown> = {
    name: projectInfo.appName,
    url: projectInfo.normalizedUrl,
    id: projectInfo.appId,
    templateVersion: "0.1.0"
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

  if (projectInfo.safeArea.enabled) {
    runtimeConfig.macosSafeArea = {
      enabled: true,
      top: projectInfo.safeArea.top,
      left: projectInfo.safeArea.left,
      right: projectInfo.safeArea.right,
      bottom: projectInfo.safeArea.bottom
    };
  }

  await writeFile(
    path.join(rootDir, "buke.config.json"),
    `${JSON.stringify(runtimeConfig, null, 2)}\n`,
    "utf8"
  );
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
