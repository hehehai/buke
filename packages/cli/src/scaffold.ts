import path from "node:path";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { TEXT_EXTENSIONS } from "./constants";
import type { ProjectInfo } from "./config";
import { prepareIconAssets } from "./icons";

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
  await cp(templateDir, outDir, { recursive: true });

  const iconAssets = await prepareIconAssets(outDir, projectInfo);
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
    ["\"__WINDOW_WIDTH__\"", String(projectInfo.window.width)],
    ["\"__WINDOW_HEIGHT__\"", String(projectInfo.window.height)],
    ["\"__WINDOW_MIN_WIDTH__\"", String(projectInfo.window.minWidth)],
    ["\"__WINDOW_MIN_HEIGHT__\"", String(projectInfo.window.minHeight)],
    ["\"__HIDE_TITLE_BAR__\"", projectInfo.window.hideTitleBar ? "true" : "false"],
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

  await replacePlaceholders(outDir, replacements);
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
