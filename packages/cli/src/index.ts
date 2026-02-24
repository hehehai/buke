#!/usr/bin/env bun

import os from "node:os";
import path from "node:path";
import { existsSync } from "node:fs";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { parseArgs, printHelp } from "./args";
import { deriveProjectInfo } from "./config";
import { resolveCwd, resolveTemplateDir } from "./helpers";
import { runBunInstall, runBunScript } from "./runner";
import { prepareOutDir, scaffoldProject } from "./scaffold";
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

await main();
