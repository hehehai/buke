#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs, printHelp } from "./args";
import {
  listBuilderWorkspaces,
  listElectrobunCliCaches,
  prepareBuilderWorkspace,
  readLatestBuilderActivity,
  removeInvalidElectrobunCliCaches,
  resolveCacheDir,
} from "./cache";
import { deriveProjectInfo } from "./config";
import { loadPackConfig } from "./config-file";
import { VERSION } from "./constants";
import { resolveCwd, resolveTemplateDir } from "./helpers";
import { resolvePreset } from "./presets";
import { runBunScript } from "./runner";
import { applyProjectInfo, prepareOutDir, scaffoldProject, syncRuntimeConfig } from "./scaffold";

async function main() {
  const { flags, positionals } = parseArgs(process.argv.slice(2));
  const [command, ...commandPositionals] = positionals;

  if (flags.version) {
    console.log(VERSION);
    return;
  }

  if (!command || flags.help) {
    printHelp();
    return;
  }

  switch (command) {
    case "init":
      await handleInit(flags, commandPositionals);
      return;
    case "pack":
      await handlePack(flags, commandPositionals);
      return;
    case "dev":
      await handleRun(flags, commandPositionals, "dev");
      return;
    case "build":
      await handleBuild(flags, commandPositionals);
      return;
    case "doctor":
      await handleDoctor(flags);
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

async function handleInit(flags: Record<string, string | boolean>, positionals: string[]) {
  let urlInput = (flags.url as string) ?? positionals[0];
  if (!urlInput) {
    console.error("Missing URL. Example: buke init https://example.com");
    process.exit(1);
  }

  // Resolve preset
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(urlInput) && !urlInput.includes(".")) {
    const preset = resolvePreset(urlInput);
    if (preset) {
      console.log(`Resolved preset: ${urlInput} → ${preset.url} (${preset.name})`);
      urlInput = preset.url;
      if (!flags.name) {
        flags.name = preset.name;
      }
    }
  }

  const projectInfo = deriveProjectInfo(urlInput, flags);
  const outDir = path.resolve(process.cwd(), (flags.out as string) ?? projectInfo.slug);

  await scaffoldProject({
    outDir,
    templateDir: resolveTemplateDir(flags),
    projectInfo,
  });

  console.log("\n✔ Project created\n");
  console.log(`Next:\n  cd ${path.basename(outDir)}\n  bun install\n  bun run dev\n`);
}

async function handlePack(flags: Record<string, string | boolean>, positionals: string[]) {
  const mutablePositionals = [...positionals];
  const configFlag = typeof flags.config === "string" ? (flags.config as string) : undefined;
  let configPath = configFlag;
  if (!configPath) {
    const candidate = mutablePositionals[0];
    if (candidate?.toLowerCase().endsWith(".json")) {
      const resolved = path.resolve(process.cwd(), candidate);
      if (existsSync(resolved)) {
        configPath = candidate;
        mutablePositionals.shift();
      }
    }
  }

  const loadedConfig = configPath ? await loadPackConfig(configPath) : null;
  let rawUrlInput = (flags.url as string) ?? mutablePositionals[0] ?? loadedConfig?.config.url;

  // Resolve preset names (e.g. "deepseek" → "https://chat.deepseek.com/")
  let presetConfig: Record<string, unknown> | undefined;
  if (
    rawUrlInput &&
    !/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(rawUrlInput) &&
    !rawUrlInput.includes(".")
  ) {
    const preset = resolvePreset(rawUrlInput);
    if (preset) {
      console.log(`Resolved preset: ${rawUrlInput} → ${preset.url} (${preset.name})`);
      rawUrlInput = preset.url;
      if (!flags.name && !loadedConfig?.config.name) {
        flags.name = preset.name;
      }
      presetConfig = preset.config;
    }
  }

  const urlInput = rawUrlInput;
  if (!urlInput) {
    console.error("Missing URL. Example: buke pack https://example.com");
    console.error("Or use: buke pack --config ./buke.pack.json");
    console.error("Or use a preset: buke pack deepseek");
    process.exit(1);
  }

  // Merge preset config into loaded config
  const mergedConfig = loadedConfig?.config
    ? { ...loadedConfig.config }
    : presetConfig
      ? ({ ...presetConfig } as Parameters<typeof deriveProjectInfo>[2])
      : undefined;
  if (mergedConfig && presetConfig?.allowlist && !mergedConfig.allowlist) {
    mergedConfig.allowlist = presetConfig.allowlist as string[];
  }

  const projectInfo = deriveProjectInfo(
    urlInput,
    flags,
    mergedConfig,
    loadedConfig?.configDir ?? process.cwd(),
  );
  const env = (
    (flags.env as string | undefined) ??
    loadedConfig?.config?.env ??
    (mergedConfig?.env as string | undefined)
  )?.toLowerCase();
  const script = env ? `build:${env}` : "build:dev";
  const force = Boolean(flags.force);
  const refreshBuilder = Boolean(flags["refresh-builder"]);
  const offline = Boolean(flags.offline);

  if (env && !["dev", "canary", "stable"].includes(env)) {
    console.error("Invalid --env. Use dev, canary, or stable.");
    process.exit(1);
  }

  const outDir = path.resolve(
    process.cwd(),
    (flags.out as string) ?? loadedConfig?.config.outDir ?? path.join("dist", projectInfo.slug),
  );
  const templateDir = resolveTemplateDir(flags);
  const builder = await prepareBuilderWorkspace({
    templateDir,
    refresh: refreshBuilder,
    offline,
  });

  console.log(
    `Builder cache ${builder.status}: ${builder.key}\nBuilder workspace: ${builder.workspaceDir}`,
  );
  if (builder.status !== "hit") {
    console.log(
      "Builder cache warmed. First build on a new Electrobun version may still download core binaries once.",
    );
  }

  const tempRootDir = await mkdtemp(path.join(os.tmpdir(), "buke-pack-"));
  const tempDir = path.join(tempRootDir, "app");
  let succeeded = false;

  try {
    await cp(builder.workspaceDir, tempDir, { recursive: true });
    await applyProjectInfo(tempDir, projectInfo);
    await syncRuntimeConfig(tempDir, projectInfo, loadedConfig?.configDir ?? process.cwd());

    // Inject app version into electrobun.config.ts if specified
    if (projectInfo.buildConfig.appVersion) {
      await injectAppVersion(tempDir, projectInfo.buildConfig.appVersion);
    }

    // Handle local file packaging
    if (projectInfo.useLocalFile) {
      await copyLocalFile(tempDir, projectInfo.useLocalFile);
    }

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

    // Post-build install
    if (projectInfo.buildConfig.install && process.platform === "darwin") {
      await installMacOSApp(outDir, projectInfo.appName);
    }
  } finally {
    if (succeeded) {
      await rm(tempRootDir, { recursive: true, force: true });
    } else {
      console.log(`\nTemporary build directory kept for inspection: ${tempDir}\n`);
    }
  }
}

async function injectAppVersion(tempDir: string, version: string) {
  const configPath = path.join(tempDir, "electrobun.config.ts");
  if (!existsSync(configPath)) {
    return;
  }
  const content = await readFile(configPath, "utf8");
  const updated = content.replace(/version:\s*["'][^"']*["']/, `version: "${version}"`);
  if (updated !== content) {
    await writeFile(configPath, updated, "utf8");
  }
}

async function copyLocalFile(tempDir: string, localFilePath: string) {
  const resolved = path.isAbsolute(localFilePath)
    ? localFilePath
    : path.resolve(process.cwd(), localFilePath);
  if (!existsSync(resolved)) {
    console.error(`Local file not found: ${resolved}`);
    process.exit(1);
  }
  const viewsDir = path.join(tempDir, "src", "views", "main");
  const target = path.join(viewsDir, "local.html");
  await cp(resolved, target);
  console.log(`Local file copied: ${resolved} → ${target}`);
}

async function installMacOSApp(buildDir: string, appName: string) {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(buildDir);
  const appBundle = entries.find((e) => e.endsWith(".app"));
  if (!appBundle) {
    console.log("No .app bundle found for installation.");
    return;
  }

  const source = path.join(buildDir, appBundle);
  const dest = path.join("/Applications", appBundle);
  console.log(`Installing: ${source} → ${dest}`);

  const proc = Bun.spawn(["cp", "-R", source, dest], {
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await proc.exited;
  if (exitCode === 0) {
    console.log(`✔ Installed to ${dest}`);
  } else {
    console.log(`Failed to install (exit ${exitCode}). You may need sudo.`);
  }
}

async function handleRun(
  flags: Record<string, string | boolean>,
  positionals: string[],
  script: string,
) {
  const cwd = resolveCwd(flags, positionals);
  await runBunScript(cwd, script);
}

async function handleBuild(flags: Record<string, string | boolean>, positionals: string[]) {
  const cwd = resolveCwd(flags, positionals);
  const env = (flags.env as string | undefined)?.toLowerCase();
  const script = env ? `build:${env}` : "build:dev";

  if (env && !["dev", "canary", "stable"].includes(env)) {
    console.error("Invalid --env. Use dev, canary, or stable.");
    process.exit(1);
  }

  await runBunScript(cwd, script);
}

async function handleDoctor(flags: Record<string, string | boolean>) {
  const cacheDir = resolveCacheDir();
  const fix = Boolean(flags.fix);

  if (fix) {
    const removedCaches = await removeInvalidElectrobunCliCaches();
    if (removedCaches.length === 0) {
      console.log("No invalid Electrobun CLI caches found.");
    } else {
      console.log(`Removed invalid Electrobun CLI caches: ${removedCaches.length}`);
      for (const cliCache of removedCaches) {
        console.log(`- ${cliCache.key}`);
      }
    }
  }

  const builders = await listBuilderWorkspaces();
  const electrobunCliCaches = await listElectrobunCliCaches();
  const latestActivity = await readLatestBuilderActivity();

  console.log(`Buke cache directory: ${cacheDir}`);
  if (latestActivity) {
    console.log("Latest builder activity:");
    console.log(`- ${latestActivity.status} ${latestActivity.key}`);
    console.log(`  at: ${latestActivity.timestamp}`);
    console.log(`  workspace: ${latestActivity.workspaceDir}`);
  }
  if (builders.length === 0) {
    console.log("No builder caches found.");
  } else {
    console.log(`Builder caches: ${builders.length}`);
    for (const builder of builders) {
      console.log(
        [
          `- ${builder.key}`,
          `  created: ${builder.createdAt}`,
          `  electrobun: ${builder.electrobunVersion ?? "unknown"}`,
          `  platform: ${builder.platform}/${builder.arch}`,
          `  template: ${builder.templateDir}`,
          `  workspace: ${builder.workspaceDir}`,
        ].join("\n"),
      );
    }
  }

  if (electrobunCliCaches.length === 0) {
    console.log("Electrobun CLI caches: 0");
    console.log("Electrobun CLI will download on first successful build.");
    return;
  }

  console.log(`Electrobun CLI caches: ${electrobunCliCaches.length}`);
  for (const cliCache of electrobunCliCaches) {
    console.log(`- ${cliCache.key}${cliCache.valid ? "" : " [invalid]"}`);
    console.log(`  binary: ${cliCache.binaryPath}`);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
