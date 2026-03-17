#!/usr/bin/env bun

import { mkdir, readdir, rename, stat } from "node:fs/promises";
import path from "node:path";

const RELEASEABLE_EXTENSIONS = [
  ".tar.zst",
  ".tar.gz",
  ".zip",
  ".dmg",
  ".exe",
  ".msi",
  ".AppImage",
  ".deb",
  ".rpm",
] as const;

function parseFlag(argv: string[], name: string) {
  const index = argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return argv[index + 1];
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hasReleaseableExtension(fileName: string) {
  return RELEASEABLE_EXTENSIONS.some((extension) => fileName.endsWith(extension));
}

function getReleaseableExtension(fileName: string) {
  const extension = RELEASEABLE_EXTENSIONS.find((candidate) => fileName.endsWith(candidate));
  if (!extension) {
    throw new Error(`Unsupported release asset: ${fileName}`);
  }

  return extension;
}

async function walkFiles(rootDir: string): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        return walkFiles(fullPath);
      }
      if (entry.isFile()) {
        return [fullPath];
      }
      return [];
    }),
  );

  return files.flat();
}

async function main() {
  const args = process.argv.slice(2);
  const inputDir = parseFlag(args, "--input-dir");
  const outputDir = parseFlag(args, "--output-dir");
  const appName = parseFlag(args, "--app-name");
  const platform = parseFlag(args, "--platform");
  const channel = parseFlag(args, "--channel") ?? "stable";

  if (!inputDir || !outputDir || !appName || !platform) {
    throw new Error(
      "Usage: bun run scripts/collect-app-release-assets.ts --input-dir <dir> --output-dir <dir> --app-name <name> --platform <platform> [--channel <channel>]",
    );
  }

  const normalizedChannel = slugify(channel);
  const normalizedAppName = slugify(appName);
  const releasePrefix = `${normalizedAppName}-${normalizedChannel}-${platform}`;

  const allFiles = await walkFiles(path.resolve(inputDir));
  const releaseableFiles = allFiles.filter((filePath) =>
    hasReleaseableExtension(path.basename(filePath)),
  );

  if (releaseableFiles.length === 0) {
    throw new Error(`No releaseable assets found in ${inputDir}`);
  }

  await mkdir(path.resolve(outputDir), { recursive: true });

  const usedNames = new Set<string>();
  for (const filePath of releaseableFiles) {
    const sourceStat = await stat(filePath);
    if (!sourceStat.isFile()) {
      continue;
    }

    const extension = getReleaseableExtension(path.basename(filePath));
    let targetName = `${releasePrefix}${extension}`;
    let ordinal = 1;
    while (usedNames.has(targetName)) {
      ordinal += 1;
      targetName = `${releasePrefix}-${ordinal}${extension}`;
    }
    usedNames.add(targetName);

    const targetPath = path.join(path.resolve(outputDir), targetName);
    await rename(filePath, targetPath);
    console.log(`${filePath} -> ${targetPath}`);
  }
}

void main();
