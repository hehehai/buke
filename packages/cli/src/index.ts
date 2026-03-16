#!/usr/bin/env bun

import os from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { parseArgs, printHelp } from "./args";
import {
  listBuilderWorkspaces,
  listElectrobunCliCaches,
  readLatestBuilderActivity,
  removeInvalidElectrobunCliCaches,
  prepareBuilderWorkspace,
  resolveCacheDir
} from "./cache";
import { deriveProjectInfo } from "./config";
import { loadPackConfig } from "./config-file";
import { resolveCwd, resolveTemplateDir } from "./helpers";
import { runBunScript } from "./runner";
import { applyProjectInfo, prepareOutDir, scaffoldProject, syncRuntimeConfig } from "./scaffold";
import { VERSION } from "./constants";

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

async function handleInit(
  flags: Record<string, string | boolean>,
  positionals: string[]
) {
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

async function handlePack(
  flags: Record<string, string | boolean>,
  positionals: string[]
) {
  const mutablePositionals = [...positionals];
  const configFlag = typeof flags.config === "string" ? (flags.config as string) : undefined;
  let configPath = configFlag;
  if (!configPath) {
    const candidate = mutablePositionals[0];
    if (candidate && candidate.toLowerCase().endsWith(".json")) {
      const resolved = path.resolve(process.cwd(), candidate);
      if (existsSync(resolved)) {
        configPath = candidate;
        mutablePositionals.shift();
      }
    }
  }

  const loadedConfig = configPath ? await loadPackConfig(configPath) : null;
  const urlInput =
    (flags.url as string) ?? mutablePositionals[0] ?? loadedConfig?.config.url;
  if (!urlInput) {
    console.error("Missing URL. Example: buke pack https://example.com");
    console.error("Or use: buke pack --config ./buke.pack.json");
    process.exit(1);
  }

  const projectInfo = deriveProjectInfo(
    urlInput,
    flags,
    loadedConfig?.config,
    loadedConfig?.configDir ?? process.cwd()
  );
  const env = ((flags.env as string | undefined) ?? loadedConfig?.config.env)?.toLowerCase();
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
    (flags.out as string) ??
      loadedConfig?.config.outDir ??
      path.join("dist", projectInfo.slug)
  );
  const templateDir = resolveTemplateDir(flags);
  const builder = await prepareBuilderWorkspace({
    templateDir,
    refresh: refreshBuilder,
    offline
  });

  console.log(
    `Builder cache ${builder.status}: ${builder.key}\nBuilder workspace: ${builder.workspaceDir}`
  );
  if (builder.status !== "hit") {
    console.log(
      "Builder cache warmed. First build on a new Electrobun version may still download core binaries once."
    );
  }

  const tempRootDir = await mkdtemp(path.join(os.tmpdir(), "buke-pack-"));
  const tempDir = path.join(tempRootDir, "app");
  let succeeded = false;

  try {
    await cp(builder.workspaceDir, tempDir, { recursive: true });
    await applyProjectInfo(tempDir, projectInfo);
    await syncRuntimeConfig(tempDir, projectInfo);
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
      await rm(tempRootDir, { recursive: true, force: true });
    } else {
      console.log(`\nTemporary build directory kept for inspection: ${tempDir}\n`);
    }
  }
}

async function handleRun(
  flags: Record<string, string | boolean>,
  positionals: string[],
  script: string
) {
  const cwd = resolveCwd(flags, positionals);
  await runBunScript(cwd, script);
}

async function handleBuild(
  flags: Record<string, string | boolean>,
  positionals: string[]
) {
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
          `  workspace: ${builder.workspaceDir}`
        ].join("\n")
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
