#!/usr/bin/env bun

import os from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, writeFile, mkdtemp } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const VERSION = "0.1.0";
const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".html",
  ".css",
  ".txt"
]);

type Flags = Record<string, string | boolean>;

const SHORT_FLAGS: Record<string, string> = {
  h: "help",
  v: "version",
  n: "name",
  o: "out",
  i: "id",
  p: "partition",
  s: "safe-top",
  w: "width",
  H: "height",
  I: "icon",
  t: "template",
  c: "cwd",
  e: "env",
  u: "url"
};

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { flags, positionals } = parseArgs(rest);

  if (!command || flags.help) {
    printHelp();
    return;
  }

  if (flags.version) {
    console.log(VERSION);
    return;
  }

  switch (command) {
    case "init":
      await handleInit(flags, positionals);
      return;
    case "pack":
      await handlePack(flags, positionals);
      return;
    case "dev":
      await handleRun(flags, positionals, "dev");
      return;
    case "build":
      await handleBuild(flags, positionals);
      return;
    case "help":
      printHelp();
      return;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

function parseArgs(args: string[]) {
  const flags: Flags = {};
  const positionals: string[] = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--") {
      positionals.push(...args.slice(i + 1));
      break;
    }
    if (arg.startsWith("--")) {
      const [rawKey, rawValue] = arg.slice(2).split("=");
      if (rawValue !== undefined) {
        flags[rawKey] = rawValue;
      } else {
        const next = args[i + 1];
        if (next && !next.startsWith("-")) {
          flags[rawKey] = next;
          i += 1;
        } else {
          flags[rawKey] = true;
        }
      }
      continue;
    }
    if (arg.startsWith("-") && arg.length === 2) {
      const key = SHORT_FLAGS[arg[1]] ?? arg[1];
      const next = args[i + 1];
      if (next && !next.startsWith("-") && key !== "help" && key !== "version") {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
      continue;
    }
    positionals.push(arg);
  }

  return { flags, positionals };
}

function printHelp() {
  console.log(`\nBuke CLI v${VERSION}\n\nUsage:\n  buke init <url> [--name <AppName>] [--out <dir>] [--id <bundleId>]\n  buke pack <url> [--name <AppName>] [--out <dir>] [--id <bundleId>] [--env dev|canary|stable] [--force]\n  buke dev [--cwd <dir>]\n  buke build [--cwd <dir>] [--env dev|canary|stable]\n\nOptions:\n  -n, --name           App display name\n  -o, --out            Output directory\n  -i, --id             Bundle identifier (e.g. com.example.app)\n  -p, --partition      Webview session partition\n  -w, --width          Initial window width\n  -H, --height         Initial window height\n  --min-width          Minimum window width\n  --min-height         Minimum window height\n  --show-title-bar     macOS show title bar\n  -I, --icon           App icon path or URL\n  --show-system-tray   Enable system tray\n  --system-tray-icon   Tray icon path or URL\n  --hide-on-close      Close button minimizes to tray\n  --user-agent         Override user agent (JS)\n  --proxy-url          Proxy URL (HTTP/HTTPS)\n  -s, --safe-top       macOS safe-area top padding\n  --safe-left          macOS safe-area left padding\n  --safe-right         macOS safe-area right padding\n  --safe-bottom        macOS safe-area bottom padding\n  --safe-off           Disable macOS safe-area padding\n  -t, --template       Template directory override\n  -c, --cwd            Run command in target directory\n  -e, --env            Build env for release channel\n  --force              Overwrite existing output directory\n  -h, --help           Show help\n  -v, --version        Show version\n`);
}

async function handleInit(flags: Flags, positionals: string[]) {
  const urlInput = (flags.url as string) ?? positionals[0];
  if (!urlInput) {
    console.error("Missing URL. Example: buke init https://example.com");
    process.exit(1);
  }

  const projectInfo = deriveProjectInfo(urlInput, flags);
  const outDir = path.resolve(process.cwd(), (flags.out as string) ?? projectInfo.slug);

  await scaffoldProject({
    outDir,
    templateDir: resolveTemplateDir(flags),
    projectInfo
  });

  console.log("\n✔ Project created\n");
  console.log(`Next:\n  cd ${path.basename(outDir)}\n  bun install\n  bun run dev\n`);
}

async function handlePack(flags: Flags, positionals: string[]) {
  const urlInput = (flags.url as string) ?? positionals[0];
  if (!urlInput) {
    console.error("Missing URL. Example: buke pack https://example.com");
    process.exit(1);
  }

  const projectInfo = deriveProjectInfo(urlInput, flags);
  const env = (flags.env as string | undefined)?.toLowerCase();
  const script = env ? `build:${env}` : "build:dev";
  const force = Boolean(flags.force);

  if (env && !["dev", "canary", "stable"].includes(env)) {
    console.error("Invalid --env. Use dev, canary, or stable.");
    process.exit(1);
  }

  const outDir = path.resolve(
    process.cwd(),
    (flags.out as string) ?? path.join("dist", projectInfo.slug)
  );
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "buke-pack-"));
  let succeeded = false;

  try {
    await scaffoldProject({
      outDir: tempDir,
      templateDir: resolveTemplateDir(flags),
      projectInfo
    });

    await runBunInstall(tempDir);
    await runBunScript(tempDir, script);

    const buildDir = path.join(tempDir, "build");
    if (!existsSync(buildDir)) {
      console.error("Build directory not found. Build may have failed.");
      process.exit(1);
    }

    await prepareOutDir(outDir, force);
    await cp(buildDir, outDir, { recursive: true });
    succeeded = true;

    console.log(`\n✔ App packaged at: ${outDir}\n`);
  } finally {
    if (succeeded) {
      await rm(tempDir, { recursive: true, force: true });
    } else {
      console.log(`\nTemporary build directory kept for inspection: ${tempDir}\n`);
    }
  }
}

async function handleRun(flags: Flags, positionals: string[], script: string) {
  const cwd = resolveCwd(flags, positionals);
  await runBunScript(cwd, script);
}

async function handleBuild(flags: Flags, positionals: string[]) {
  const cwd = resolveCwd(flags, positionals);
  const env = (flags.env as string | undefined)?.toLowerCase();
  const script = env ? `build:${env}` : "build:dev";

  if (env && !["dev", "canary", "stable"].includes(env)) {
    console.error("Invalid --env. Use dev, canary, or stable.");
    process.exit(1);
  }

  await runBunScript(cwd, script);
}

function resolveCwd(flags: Flags, positionals: string[]) {
  const raw = (flags.cwd as string) ?? positionals[0];
  return raw ? path.resolve(process.cwd(), raw) : process.cwd();
}

async function runBunScript(cwd: string, script: string) {
  const proc = Bun.spawn(["bun", "run", script], {
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit"
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

async function runBunInstall(cwd: string) {
  const proc = Bun.spawn(["bun", "install", "--no-cache", "--no-progress"], {
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit"
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

function deriveProjectInfo(urlInput: string, flags: Flags) {
  const normalizedUrl = normalizeUrl(urlInput);
  const url = new URL(normalizedUrl);
  const defaultName = url.hostname.replace(/^www\./, "");
  const appName = (flags.name as string) ?? defaultName;
  const slug = slugify(appName);
  const appId = (flags.id as string) ?? `com.buke.${slug}`;
  const partition = (flags.partition as string) ?? "persist:default";
  const safeArea = deriveSafeArea(flags);
  const window = deriveWindow(flags);
  const tray = deriveTray(flags);
  const network = deriveNetwork(flags);
  const icon = typeof flags.icon === "string" ? flags.icon : undefined;

  return {
    normalizedUrl,
    appName,
    slug,
    appId,
    partition,
    safeArea,
    window,
    tray,
    network,
    icon
  };
}

function resolveTemplateDir(flags: Flags) {
  return flags.template
    ? path.resolve(process.cwd(), flags.template as string)
    : fileURLToPath(new URL("../../template", import.meta.url));
}

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return new URL(withScheme).toString();
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 64) || "app";
}

async function ensureEmptyDir(dir: string) {
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

async function prepareOutDir(dir: string, force: boolean) {
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

async function scaffoldProject({
  outDir,
  templateDir,
  projectInfo
}: {
  outDir: string;
  templateDir: string;
  projectInfo: {
    normalizedUrl: string;
    appName: string;
    slug: string;
    appId: string;
    partition: string;
    safeArea: {
      enabled: boolean;
      top: number;
      left: number;
      right: number;
      bottom: number;
    };
    window: {
      width: number;
      height: number;
      minWidth: number;
      minHeight: number;
      hideTitleBar: boolean;
    };
    tray: {
      enabled: boolean;
      icon?: string;
      hideOnClose: boolean;
    };
    network: {
      userAgent?: string;
      proxyUrl?: string;
    };
    icon?: string;
  };
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

function parseNumberFlag(value: string | boolean | undefined, fallback: number) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function deriveSafeArea(flags: Flags) {
  const enabled = !flags["safe-off"];
  const top = parseNumberFlag(flags["safe-top"], 28);
  const left = parseNumberFlag(flags["safe-left"], 12);
  const right = parseNumberFlag(flags["safe-right"], 0);
  const bottom = parseNumberFlag(flags["safe-bottom"], 0);

  return { enabled, top, left, right, bottom };
}

function deriveWindow(flags: Flags) {
  const width = parseNumberFlag(flags.width, 1200);
  const height = parseNumberFlag(flags.height, 800);
  const minWidth = parseNumberFlag(flags["min-width"], 960);
  const minHeight = parseNumberFlag(flags["min-height"], 640);
  const hideTitleBar = flags["show-title-bar"]
    ? false
    : flags["hide-title-bar"] !== undefined
      ? Boolean(flags["hide-title-bar"])
      : true;

  return { width, height, minWidth, minHeight, hideTitleBar };
}

function deriveTray(flags: Flags) {
  const enabled = Boolean(flags["show-system-tray"]);
  const icon =
    typeof flags["system-tray-icon"] === "string"
      ? (flags["system-tray-icon"] as string)
      : undefined;
  const hideOnClose = Boolean(flags["hide-on-close"]);

  return { enabled, icon, hideOnClose };
}

function deriveNetwork(flags: Flags) {
  const userAgent =
    typeof flags["user-agent"] === "string" ? (flags["user-agent"] as string) : undefined;
  const proxyUrl =
    typeof flags["proxy-url"] === "string" ? (flags["proxy-url"] as string) : undefined;

  return { userAgent, proxyUrl };
}

type IconAssets = {
  mac?: string;
  win?: string;
  linux?: string;
  tray?: string;
};

async function prepareIconAssets(
  outDir: string,
  projectInfo: {
    normalizedUrl: string;
    icon?: string;
    tray: { icon?: string };
  }
): Promise<IconAssets> {
  const assetsDir = path.join(outDir, "assets");
  await mkdir(assetsDir, { recursive: true });

  const mainSource = await resolveIconSource(
    projectInfo.icon,
    projectInfo.normalizedUrl,
    assetsDir,
    "icon"
  );
  const traySource = projectInfo.tray.icon
    ? await resolveIconSource(
        projectInfo.tray.icon,
        projectInfo.normalizedUrl,
        assetsDir,
        "tray"
      )
    : null;

  const mainIcons = await buildIconVariants(mainSource, assetsDir, "icon");
  const trayIcons = traySource ? await buildIconVariants(traySource, assetsDir, "tray") : {};

  return {
    mac: mainIcons.mac,
    win: mainIcons.win,
    linux: mainIcons.linux,
    tray: trayIcons.linux ?? mainIcons.linux
  };
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

await main();
