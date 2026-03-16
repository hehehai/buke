#!/usr/bin/env bun

import { writeFile } from "node:fs/promises";
import {
  RELEASE_TARGETS,
  ensureCleanReleaseDir,
  getArchiveFileName,
  getArchivePath,
  getCliPackageMetadata,
  sha256File,
} from "./release-lib";

async function run(args: string[]) {
  const proc = Bun.spawn(args, {
    cwd: process.cwd(),
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
  const metadata = await getCliPackageMetadata();
  const releaseDir = await ensureCleanReleaseDir(metadata.version);

  await run(["bun", "run", "typecheck"]);
  await run(["bun", "run", "build:cli"]);

  for (const target of RELEASE_TARGETS) {
    await run(["bun", "run", `build:release:${target}`]);
  }

  const checksums: string[] = [];
  for (const target of RELEASE_TARGETS) {
    const archivePath = getArchivePath(metadata.version, target);
    const sha = await sha256File(archivePath);
    checksums.push(`${sha}  ${getArchiveFileName(metadata.version, target)}`);
  }

  await writeFile(`${releaseDir}/checksums.txt`, `${checksums.join("\n")}\n`, "utf8");
  console.log(`Release assets prepared in ${releaseDir}`);
}

void main();
