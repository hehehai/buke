import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  chmod,
  copyFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runBunInstall } from "./runner";

const CACHE_DIR_ENV = "BUKE_CACHE_DIR";
const IGNORED_DIRECTORIES = new Set([".git", "build", "dist", "node_modules"]);
const IGNORED_COPY_ENTRIES = new Set([".git", "build", "dist"]);

export type BuilderWorkspaceStatus = "hit" | "miss" | "refresh";

export type BuilderWorkspace = {
  cacheDir: string;
  key: string;
  status: BuilderWorkspaceStatus;
  workspaceDir: string;
};

type BuilderMetadata = {
  key: string;
  createdAt: string;
  electrobunVersion: string;
  templateDir: string;
  templateHash: string;
  platform: string;
  arch: string;
  workspaceDir: string;
};

export type ElectrobunCliCache = {
  binaryPath: string;
  key: string;
  valid: boolean;
};

export type LatestBuilderActivity = {
  key: string;
  status: BuilderWorkspaceStatus;
  timestamp: string;
  workspaceDir: string;
};

export function resolveCacheDir() {
  const override = process.env[CACHE_DIR_ENV];
  return override ? path.resolve(override) : path.join(os.homedir(), ".cache", "buke");
}

export async function prepareBuilderWorkspace({
  templateDir,
  refresh = false,
  offline = false,
}: {
  templateDir: string;
  refresh?: boolean;
  offline?: boolean;
}): Promise<BuilderWorkspace> {
  const cacheDir = resolveCacheDir();
  const templateHash = await hashDirectory(templateDir);
  const key = `${process.platform}-${process.arch}-${templateHash.slice(0, 16)}`;
  const buildersDir = path.join(cacheDir, "builders");
  const builderDir = path.join(buildersDir, key);
  const workspaceDir = path.join(builderDir, "workspace");

  if (refresh && existsSync(builderDir)) {
    await rm(builderDir, { recursive: true, force: true });
  }

  if (existsSync(workspaceDir)) {
    await saveLatestBuilderActivity(cacheDir, {
      key,
      status: "hit",
      timestamp: new Date().toISOString(),
      workspaceDir,
    });
    return {
      cacheDir,
      key,
      status: "hit",
      workspaceDir,
    };
  }

  if (offline) {
    throw new Error(
      `Builder cache miss for ${key}. Re-run without --offline or warm the cache first.`,
    );
  }

  await mkdir(buildersDir, { recursive: true });
  const stagingDir = await mkdtemp(path.join(cacheDir, "builder-"));
  const stagingWorkspaceDir = path.join(stagingDir, "workspace");

  try {
    await cp(templateDir, stagingWorkspaceDir, {
      recursive: true,
      filter: (source) => !IGNORED_COPY_ENTRIES.has(path.basename(source)),
    });
    const templatePackageJson = JSON.parse(
      await readFile(path.join(templateDir, "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
    };
    const electrobunVersion = templatePackageJson.dependencies?.electrobun ?? "unknown";
    await copyTemplateBunStore(templateDir, buildersDir);
    await hydrateElectrobunCli(stagingWorkspaceDir, cacheDir);

    const electrobunBinPath = path.join(stagingWorkspaceDir, "node_modules", ".bin", "electrobun");

    if (!existsSync(electrobunBinPath)) {
      const packageJsonPath = path.join(stagingWorkspaceDir, "package.json");
      const originalPackageJson = await readFile(packageJsonPath, "utf8");

      await writeFile(packageJsonPath, sanitizeTemplatePackageJson(originalPackageJson), "utf8");

      try {
        await runBunInstall(stagingWorkspaceDir, {
          production: true,
          noCache: true,
        });
      } finally {
        await writeFile(packageJsonPath, originalPackageJson, "utf8");
      }
    }

    const metadata: BuilderMetadata = {
      key,
      createdAt: new Date().toISOString(),
      electrobunVersion,
      templateDir,
      templateHash,
      platform: process.platform,
      arch: process.arch,
      workspaceDir,
    };

    await writeFile(
      path.join(stagingDir, "metadata.json"),
      `${JSON.stringify(metadata, null, 2)}\n`,
      "utf8",
    );

    await rename(stagingDir, builderDir);
  } catch (error) {
    await rm(stagingDir, { recursive: true, force: true });
    throw error;
  }

  const status: BuilderWorkspaceStatus = refresh ? "refresh" : "miss";
  await saveLatestBuilderActivity(cacheDir, {
    key,
    status,
    timestamp: new Date().toISOString(),
    workspaceDir,
  });

  return {
    cacheDir,
    key,
    status,
    workspaceDir,
  };
}

export async function listBuilderWorkspaces() {
  const buildersDir = path.join(resolveCacheDir(), "builders");
  if (!existsSync(buildersDir)) {
    return [] as BuilderMetadata[];
  }

  const entries = await readdir(buildersDir, { withFileTypes: true });
  const builders = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const metadataPath = path.join(buildersDir, entry.name, "metadata.json");
        if (!existsSync(metadataPath)) {
          return null;
        }

        const contents = await readFile(metadataPath, "utf8");
        return JSON.parse(contents) as BuilderMetadata;
      }),
  );

  return builders
    .filter((builder): builder is BuilderMetadata => builder !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listElectrobunCliCaches() {
  const cliCacheRootDir = path.join(resolveCacheDir(), "electrobun-cli");
  if (!existsSync(cliCacheRootDir)) {
    return [] as ElectrobunCliCache[];
  }

  const entries = await readdir(cliCacheRootDir, { withFileTypes: true });
  const caches = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const binaryName = entry.name.includes("-win-") ? "electrobun.exe" : "electrobun";
        const binaryPath = path.join(cliCacheRootDir, entry.name, binaryName);
        return existsSync(binaryPath)
          ? {
              binaryPath,
              key: entry.name,
              valid: isUsableElectrobunCliBinary(binaryPath),
            }
          : null;
      }),
  );

  return caches.filter((cache): cache is ElectrobunCliCache => cache !== null);
}

export async function readLatestBuilderActivity() {
  const activityPath = path.join(resolveCacheDir(), "latest-builder-activity.json");
  if (!existsSync(activityPath)) {
    return null;
  }

  const contents = await readFile(activityPath, "utf8");
  return JSON.parse(contents) as LatestBuilderActivity;
}

export async function removeInvalidElectrobunCliCaches() {
  const caches = await listElectrobunCliCaches();
  const invalidCaches = caches.filter((cache) => !cache.valid);

  await Promise.all(
    invalidCaches.map((cache) =>
      rm(path.dirname(cache.binaryPath), { recursive: true, force: true }),
    ),
  );

  return invalidCaches;
}

async function hashDirectory(rootDir: string) {
  const hash = createHash("sha256");
  await walkDirectory(rootDir, rootDir, hash);
  return hash.digest("hex");
}

async function walkDirectory(
  rootDir: string,
  currentDir: string,
  hash: ReturnType<typeof createHash>,
) {
  const entries = await readdir(currentDir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(currentDir, entry.name);
    const relativePath = path.relative(rootDir, fullPath);
    hash.update(relativePath);

    if (entry.isDirectory()) {
      await walkDirectory(rootDir, fullPath, hash);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    hash.update(await readFile(fullPath));
  }
}

function sanitizeTemplatePackageJson(contents: string) {
  const parsed = JSON.parse(contents) as {
    name?: string;
    version?: string;
    private?: boolean;
    type?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  parsed.name = "buke-builder";
  return `${JSON.stringify(parsed, null, 2)}\n`;
}

async function copyTemplateBunStore(templateDir: string, buildersDir: string) {
  const sourceStoreDir = path.resolve(templateDir, "../../node_modules/.bun");
  const targetStoreDir = path.join(buildersDir, "node_modules", ".bun");

  if (!existsSync(sourceStoreDir) || existsSync(targetStoreDir)) {
    return;
  }

  await mkdir(path.dirname(targetStoreDir), { recursive: true });
  await cp(sourceStoreDir, targetStoreDir, { recursive: true });
}

async function hydrateElectrobunCli(workspaceDir: string, cacheRootDir: string) {
  const electrobunLinkPath = path.join(workspaceDir, "node_modules", "electrobun");
  if (!existsSync(electrobunLinkPath)) {
    return;
  }

  const electrobunDir = await realpath(electrobunLinkPath);
  const packageJsonPath = path.join(electrobunDir, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
    version: string;
  };

  const target = getElectrobunTarget();
  const binaryName = target.platform === "win" ? "electrobun.exe" : "electrobun";
  const packageCacheDir = path.join(electrobunDir, ".cache");
  const packageCacheBinary = path.join(packageCacheDir, binaryName);
  const packageBinBinary = path.join(electrobunDir, "bin", binaryName);
  const packageTarballPath = path.join(
    packageCacheDir,
    `electrobun-${target.platform}-${target.arch}.tar.gz`,
  );
  const sharedCacheDir = path.join(
    cacheRootDir,
    "electrobun-cli",
    `${packageJson.version}-${target.platform}-${target.arch}`,
  );
  const sharedCacheBinary = path.join(sharedCacheDir, binaryName);

  if (isUsableElectrobunCliBinary(sharedCacheBinary)) {
    await materializeElectrobunCli(sharedCacheBinary, packageCacheBinary, packageBinBinary);
    return;
  }

  if (isUsableElectrobunCliBinary(packageBinBinary)) {
    await persistElectrobunCli(packageBinBinary, sharedCacheBinary);
    return;
  }

  if (isUsableElectrobunCliBinary(packageCacheBinary)) {
    await materializeElectrobunCli(packageCacheBinary, packageCacheBinary, packageBinBinary);
    await persistElectrobunCli(packageCacheBinary, sharedCacheBinary);
    return;
  }

  if (!existsSync(packageTarballPath)) {
    return;
  }

  try {
    execFileSync("tar", ["-xzf", packageTarballPath], {
      cwd: packageCacheDir,
      stdio: "pipe",
    });
  } catch {
    await unlink(packageTarballPath).catch(() => undefined);
    return;
  }

  if (!existsSync(packageCacheBinary)) {
    return;
  }

  await materializeElectrobunCli(packageCacheBinary, packageCacheBinary, packageBinBinary);
  await persistElectrobunCli(packageCacheBinary, sharedCacheBinary);
}

async function materializeElectrobunCli(
  sourceBinary: string,
  cacheBinary: string,
  binBinary: string,
) {
  await mkdir(path.dirname(cacheBinary), { recursive: true });
  await mkdir(path.dirname(binBinary), { recursive: true });

  if (sourceBinary !== cacheBinary) {
    await copyFile(sourceBinary, cacheBinary);
  }

  await copyFile(sourceBinary, binBinary);

  if (process.platform !== "win32") {
    await chmod(cacheBinary, 0o755);
    await chmod(binBinary, 0o755);
  }

  await finalizeExecutable(cacheBinary);
  await finalizeExecutable(binBinary);
}

async function persistElectrobunCli(sourceBinary: string, sharedCacheBinary: string) {
  await mkdir(path.dirname(sharedCacheBinary), { recursive: true });
  await copyFile(sourceBinary, sharedCacheBinary);
  if (process.platform !== "win32") {
    await chmod(sharedCacheBinary, 0o755);
  }
  await finalizeExecutable(sharedCacheBinary);
}

function getElectrobunTarget() {
  const platform =
    process.platform === "win32" ? "win" : process.platform === "darwin" ? "darwin" : "linux";
  const arch = platform === "win" ? "x64" : process.arch;
  return { arch, platform };
}

async function finalizeExecutable(binaryPath: string) {
  if (process.platform !== "darwin") {
    return;
  }

  for (const attr of ["com.apple.provenance", "com.apple.quarantine"]) {
    try {
      execFileSync("xattr", ["-d", attr, binaryPath], { stdio: "pipe" });
    } catch {
      // Ignore missing xattrs.
    }
  }

  try {
    execFileSync("codesign", ["--force", "--sign", "-", binaryPath], {
      stdio: "pipe",
    });
  } catch {
    // Fall back to the unsigned binary if ad-hoc signing is unavailable.
  }
}

function isUsableElectrobunCliBinary(binaryPath: string) {
  if (!existsSync(binaryPath)) {
    return false;
  }

  if (process.platform !== "darwin") {
    return true;
  }

  return (
    !hasMacBinaryAttribute(binaryPath, "com.apple.provenance") &&
    !hasMacBinaryAttribute(binaryPath, "com.apple.quarantine")
  );
}

function hasMacBinaryAttribute(binaryPath: string, attribute: string) {
  try {
    execFileSync("xattr", ["-p", attribute, binaryPath], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

async function saveLatestBuilderActivity(cacheDir: string, activity: LatestBuilderActivity) {
  await mkdir(cacheDir, { recursive: true });
  await writeFile(
    path.join(cacheDir, "latest-builder-activity.json"),
    `${JSON.stringify(activity, null, 2)}\n`,
    "utf8",
  );
}
