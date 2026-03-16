#!/usr/bin/env bun

import path from "node:path";
import { rm } from "node:fs/promises";
import {
  CLI_ENTRY,
  ensureTargetDir,
  getArchivePath,
  getBinaryPath,
  getCliPackageMetadata,
  getTargetConfig,
  parseFlag,
  type ReleaseTarget,
} from "./release-lib";

async function run(args: string[], cwd = process.cwd()) {
  const proc = Bun.spawn(args, {
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`Command failed (${exitCode}): ${args.join(" ")}`);
  }
}

async function main() {
  const target = parseFlag(process.argv.slice(2), "--target") as ReleaseTarget | undefined;
  if (!target) {
    throw new Error("Missing --target. Example: bun run scripts/build-release.ts --target darwin-arm64");
  }

  const metadata = await getCliPackageMetadata();
  const targetConfig = getTargetConfig(target);
  await ensureTargetDir(metadata.version, target);

  const binaryPath = getBinaryPath(metadata.version, target);
  const archivePath = getArchivePath(metadata.version, target);

  const buildArgs = [
    "bun",
    "build",
    CLI_ENTRY,
    "--compile",
    "--bytecode",
    `--target=${targetConfig.bunTarget}`,
    `--outfile=${binaryPath}`,
  ];

  if (target === "windows-x64" && process.platform === "win32") {
    buildArgs.push("--windows-hide-console");
    buildArgs.push(`--windows-title=${metadata.name}`);
    buildArgs.push(`--windows-description=${metadata.description}`);
    buildArgs.push(`--windows-version=${metadata.version}.0`);
  }

  await run(buildArgs);

  if (targetConfig.archiveExtension === "zip") {
    await run(["zip", "-j", archivePath, path.basename(binaryPath)], path.dirname(binaryPath));
  } else {
    await run([
      "tar",
      "-czf",
      archivePath,
      "-C",
      path.dirname(binaryPath),
      path.basename(binaryPath),
    ]);
  }

  await rm(binaryPath, { force: true });
  console.log(`Created ${archivePath}`);
}

void main();
