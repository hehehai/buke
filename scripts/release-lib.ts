import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { mkdir, readFile, rm } from "node:fs/promises";

export const REPO_ROOT = process.cwd();
export const CLI_DIR = path.join(REPO_ROOT, "packages", "cli");
export const CLI_ENTRY = path.join(REPO_ROOT, "packages", "cli", "src", "index.ts");
export const RELEASE_ROOT = path.join(REPO_ROOT, "dist", "release");
export const DEFAULT_REPOSITORY = process.env.GITHUB_REPOSITORY ?? "hehehai/buke";
export const DEFAULT_HOMEBREW_TAP_DIR =
  process.env.HOMEBREW_TAP_DIR ?? "/Users/guanwei/x/doit/homebrew-tap";

const TARGET_CONFIG = {
  "darwin-arm64": {
    bunTarget: "bun-darwin-arm64",
    archiveExtension: "tar.gz",
    binaryName: "buke",
  },
  "darwin-x64": {
    bunTarget: "bun-darwin-x64",
    archiveExtension: "tar.gz",
    binaryName: "buke",
  },
  "linux-x64": {
    bunTarget: "bun-linux-x64",
    archiveExtension: "tar.gz",
    binaryName: "buke",
  },
  "windows-x64": {
    bunTarget: "bun-windows-x64",
    archiveExtension: "zip",
    binaryName: "buke.exe",
  },
} as const;

export type ReleaseTarget = keyof typeof TARGET_CONFIG;

export const RELEASE_TARGETS = Object.keys(TARGET_CONFIG) as ReleaseTarget[];

export async function getCliPackageMetadata() {
  const packageJson = JSON.parse(
    await readFile(path.join(CLI_DIR, "package.json"), "utf8")
  ) as {
    name: string;
    version: string;
    description?: string;
    homepage?: string;
  };

  return {
    name: packageJson.name,
    version: packageJson.version,
    description:
      packageJson.description ??
      "Pake-like Electrobun CLI for wrapping websites into lightweight desktop apps",
    homepage: packageJson.homepage ?? `https://github.com/${DEFAULT_REPOSITORY}`,
  };
}

export function getTargetConfig(target: ReleaseTarget) {
  return TARGET_CONFIG[target];
}

export function getReleaseDir(version: string) {
  return path.join(RELEASE_ROOT, `v${version}`);
}

export function getTargetDir(version: string, target: ReleaseTarget) {
  return path.join(getReleaseDir(version), target);
}

export function getArchiveBaseName(version: string, target: ReleaseTarget) {
  return `buke-v${version}-${target}`;
}

export function getArchiveFileName(version: string, target: ReleaseTarget) {
  return `${getArchiveBaseName(version, target)}.${getTargetConfig(target).archiveExtension}`;
}

export function getBinaryPath(version: string, target: ReleaseTarget) {
  return path.join(getTargetDir(version, target), getTargetConfig(target).binaryName);
}

export function getArchivePath(version: string, target: ReleaseTarget) {
  return path.join(getReleaseDir(version), getArchiveFileName(version, target));
}

export function getReleaseDownloadUrl(version: string, target: ReleaseTarget) {
  return `https://github.com/${DEFAULT_REPOSITORY}/releases/download/v${version}/${getArchiveFileName(version, target)}`;
}

export async function ensureCleanReleaseDir(version: string) {
  const releaseDir = getReleaseDir(version);
  await rm(releaseDir, { recursive: true, force: true });
  await mkdir(releaseDir, { recursive: true });
  return releaseDir;
}

export async function ensureTargetDir(version: string, target: ReleaseTarget) {
  const targetDir = getTargetDir(version, target);
  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });
  return targetDir;
}

export async function sha256File(filePath: string) {
  const contents = await readFile(filePath);
  return createHash("sha256").update(contents).digest("hex");
}

export async function sha256Remote(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return createHash("sha256").update(buffer).digest("hex");
}

export function releaseAssetExists(version: string, target: ReleaseTarget) {
  return existsSync(getArchivePath(version, target));
}

export function parseFlag(argv: string[], name: string) {
  const index = argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return argv[index + 1];
}
