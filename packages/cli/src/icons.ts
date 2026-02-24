import path from "node:path";
import { existsSync } from "node:fs";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import type { ProjectInfo } from "./config";

export type IconAssets = {
  mac?: string;
  win?: string;
  linux?: string;
  tray?: string;
};

export async function prepareIconAssets(outDir: string, projectInfo: ProjectInfo) {
  const assetsDir = path.join(outDir, "assets");
  await mkdir(assetsDir, { recursive: true });

  const mainSource = await resolveIconSource(
    projectInfo.icon,
    projectInfo.normalizedUrl,
    assetsDir,
    "icon"
  );
  const traySource = projectInfo.tray.icon
    ? await resolveIconSource(projectInfo.tray.icon, projectInfo.normalizedUrl, assetsDir, "tray")
    : null;

  const mainIcons = await buildIconVariants(mainSource, assetsDir, "icon");
  const trayIcons = traySource ? await buildIconVariants(traySource, assetsDir, "tray") : {};

  return {
    mac: mainIcons.mac,
    win: mainIcons.win,
    linux: mainIcons.linux,
    tray: trayIcons.linux ?? mainIcons.linux
  } satisfies IconAssets;
}

async function resolveIconSource(
  input: string | undefined,
  baseUrl: string,
  assetsDir: string,
  prefix: string
) {
  if (!input) {
    return await tryDownloadFavicon(baseUrl, assetsDir, prefix);
  }

  if (isUrl(input)) {
    return await downloadIcon(input, assetsDir, prefix);
  }

  const resolved = path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);
  if (!existsSync(resolved)) {
    console.warn(`Icon not found: ${resolved}`);
    return null;
  }

  return { path: resolved, isDir: resolved.endsWith(".iconset") };
}

async function tryDownloadFavicon(baseUrl: string, assetsDir: string, prefix: string) {
  try {
    const faviconUrl = new URL("/favicon.ico", baseUrl).toString();
    return await downloadIcon(faviconUrl, assetsDir, prefix);
  } catch (error) {
    return null;
  }
}

function isUrl(input: string) {
  return /^https?:\/\//i.test(input);
}

async function downloadIcon(url: string, assetsDir: string, prefix: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Icon download failed (${response.status}): ${url}`);
      return null;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const ext = guessExtension(url, response.headers.get("content-type"));
    const filename = `${prefix}-source${ext}`;
    const targetPath = path.join(assetsDir, filename);
    await writeFile(targetPath, buffer);
    return { path: targetPath, isDir: false };
  } catch (error) {
    console.warn(`Icon download failed: ${url}`);
    return null;
  }
}

function guessExtension(url: string, contentType: string | null) {
  if (contentType?.includes("png")) return ".png";
  if (contentType?.includes("icon") || contentType?.includes("ico")) return ".ico";
  if (contentType?.includes("icns")) return ".icns";
  if (contentType?.includes("svg")) return ".svg";
  const ext = path.extname(new URL(url).pathname);
  return ext || ".png";
}

async function buildIconVariants(
  source: { path: string; isDir?: boolean } | null,
  assetsDir: string,
  name: string
) {
  if (!source) {
    return {} as IconAssets;
  }

  const ext = source.isDir ? ".iconset" : path.extname(source.path).toLowerCase();
  const result: IconAssets = {};
  const projectRoot = path.dirname(assetsDir);

  if (ext === ".iconset") {
    const targetDir = path.join(assetsDir, `${name}.iconset`);
    await rm(targetDir, { recursive: true, force: true });
    await cp(source.path, targetDir, { recursive: true });
    result.mac = path.relative(projectRoot, targetDir).replace(/\\/g, "/");
  } else if (ext === ".icns") {
    const iconsetDir = path.join(assetsDir, `${name}.iconset`);
    const converted = await buildIconsetFromIcns(source.path, iconsetDir);
    if (converted) {
      result.mac = path.relative(projectRoot, iconsetDir).replace(/\\/g, "/");
    }
  } else if (ext === ".png") {
    const targetPng = path.join(assetsDir, `${name}.png`);
    await cp(source.path, targetPng);
    result.linux = path.relative(projectRoot, targetPng).replace(/\\/g, "/");
    const iconsetDir = path.join(assetsDir, `${name}.iconset`);
    const generated = await buildIconsetFromPng(targetPng, iconsetDir);
    if (generated) {
      result.mac = path.relative(projectRoot, iconsetDir).replace(/\\/g, "/");
    }
  } else if (ext === ".ico") {
    const targetIco = path.join(assetsDir, `${name}.ico`);
    await cp(source.path, targetIco);
    result.win = path.relative(projectRoot, targetIco).replace(/\\/g, "/");
  } else {
    const targetPng = path.join(assetsDir, `${name}.png`);
    await cp(source.path, targetPng);
    result.linux = path.relative(projectRoot, targetPng).replace(/\\/g, "/");
  }

  return result;
}

async function buildIconsetFromIcns(sourcePath: string, iconsetDir: string) {
  if (process.platform !== "darwin") {
    return false;
  }

  await rm(iconsetDir, { recursive: true, force: true });
  const proc = Bun.spawn(["iconutil", "-c", "iconset", sourcePath, "-o", iconsetDir], {
    stdout: "inherit",
    stderr: "inherit"
  });
  const exitCode = await proc.exited;
  return exitCode === 0;
}

async function buildIconsetFromPng(sourcePath: string, iconsetDir: string) {
  if (process.platform !== "darwin") {
    return false;
  }

  await rm(iconsetDir, { recursive: true, force: true });
  await mkdir(iconsetDir, { recursive: true });

  const sizes = [16, 32, 64, 128, 256, 512];
  for (const size of sizes) {
    const output = path.join(iconsetDir, `icon_${size}x${size}.png`);
    const output2x = path.join(iconsetDir, `icon_${size}x${size}@2x.png`);
    const proc1 = Bun.spawn(
      ["sips", "-z", String(size), String(size), sourcePath, "--out", output],
      { stdout: "ignore", stderr: "ignore" }
    );
    await proc1.exited;
    const doubled = size * 2;
    const proc2 = Bun.spawn(
      ["sips", "-z", String(doubled), String(doubled), sourcePath, "--out", output2x],
      { stdout: "ignore", stderr: "ignore" }
    );
    await proc2.exited;
  }

  return true;
}
