import path from "node:path";
import { existsSync, watch } from "node:fs";
import type { FSWatcher } from "node:fs";
import { mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { deriveProjectInfo, type ProjectInfo } from "../packages/cli/src/config";
import { loadPackConfig } from "../packages/cli/src/config-file";
import { prepareIconAssets, type IconAssets } from "../packages/cli/src/icons";
import { syncRuntimeConfig } from "../packages/cli/src/scaffold";

const REPO_ROOT = process.cwd();
const TEMPLATE_DIR = path.join(REPO_ROOT, "packages", "template");
const WORKSPACE_DIR = path.join(REPO_ROOT, ".cache", "template-dev");
const DEFAULT_CONFIG_PATH = path.join(
  "packages",
  "examples",
  "kimi",
  "buke.pack.json"
);

const GENERATED_TEMPLATE_FILES = {
  packageJson: path.join(TEMPLATE_DIR, "package.json"),
  electrobunConfig: path.join(TEMPLATE_DIR, "electrobun.config.ts"),
  indexHtml: path.join(TEMPLATE_DIR, "src", "views", "index.html"),
} as const;

async function main() {
  const configInput = getConfigInput(process.argv.slice(2));
  const configState = await loadProject(configInput);
  let currentProjectInfo = configState.projectInfo;

  await resetWorkspace();
  await linkWorkspaceSources();
  await renderWorkspace(currentProjectInfo);

  console.log(`Template dev workspace: ${WORKSPACE_DIR}`);
  console.log(`Using config: ${configState.loaded.configPath}`);

  let shuttingDown = false;
  let restartChain = Promise.resolve();
  let currentRunId = 0;
  const ignoredRunIds = new Set<number>();
  let devProcess: { proc: ReturnType<typeof Bun.spawn>; runId: number };
  let resolveExit: ((code: number) => void) | null = null;

  const handleExit = (runId: number, exitCode: number) => {
    if (ignoredRunIds.has(runId)) {
      ignoredRunIds.delete(runId);
      return;
    }

    if (runId !== currentRunId) {
      return;
    }

    if (!shuttingDown) {
      console.log(`Template dev exited with code ${exitCode}`);
    }

    closeWatchers();
    resolveExit?.(exitCode);
  };

  const startTrackedDevProcess = () => {
    currentRunId += 1;
    const runId = currentRunId;
    const proc = startDevProcess();
    void proc.exited.then((exitCode) => handleExit(runId, exitCode));
    return { proc, runId };
  };

  const restartDevProcess = (reason: string) => {
    restartChain = restartChain.then(async () => {
      if (shuttingDown || !devProcess) {
        return;
      }

      console.log(`Template dev refreshed: ${reason}`);
      const previousProcess = devProcess;
      ignoredRunIds.add(previousProcess.runId);
      previousProcess.proc.kill();
      await previousProcess.proc.exited;
      await closeRunningDevApp(currentProjectInfo);
      devProcess = startTrackedDevProcess();
    });
  };

  const closeWatchers = watchWorkspaceInputs(configState.loaded.configPath, async () => {
    try {
      const nextState = await loadProject(configState.loaded.configPath);
      currentProjectInfo = nextState.projectInfo;
      await renderWorkspace(currentProjectInfo);
      restartDevProcess("config or template files changed");
    } catch (error) {
      console.error("Failed to refresh template dev workspace");
      console.error(error);
    }
  });

  const shutdown = () => {
    shuttingDown = true;
    closeWatchers();
    ignoredRunIds.add(devProcess.runId);
    devProcess.proc.kill();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  devProcess = startTrackedDevProcess();

  return await new Promise<number>((resolve) => {
    resolveExit = resolve;
  });
}

function getConfigInput(argv: string[]) {
  const configIndex = argv.indexOf("--config");
  if (configIndex !== -1 && argv[configIndex + 1]) {
    return argv[configIndex + 1];
  }

  if (argv[0] && !argv[0].startsWith("-")) {
    return argv[0];
  }

  return DEFAULT_CONFIG_PATH;
}

async function loadProject(configInput: string) {
  const loaded = await loadPackConfig(configInput);
  const url = loaded.config.url;

  if (!url) {
    throw new Error(`Config file is missing "url": ${loaded.configPath}`);
  }

  const noFlags = {} as Parameters<typeof deriveProjectInfo>[1];
  const projectInfo = deriveProjectInfo(url, noFlags, loaded.config, loaded.configDir);

  return { loaded, projectInfo };
}

async function resetWorkspace() {
  await rm(WORKSPACE_DIR, { recursive: true, force: true });
  await mkdir(path.join(WORKSPACE_DIR, "src", "views"), { recursive: true });
}

async function linkWorkspaceSources() {
  await linkNodeModules();
  await linkDir(path.join(TEMPLATE_DIR, "src", "bun"), path.join(WORKSPACE_DIR, "src", "bun"));
  await linkFile(
    path.join(TEMPLATE_DIR, "src", "views", "styles.css"),
    path.join(WORKSPACE_DIR, "src", "views", "styles.css")
  );
  await linkDir(path.join(TEMPLATE_DIR, "inject"), path.join(WORKSPACE_DIR, "inject"));
  await linkDir(path.join(TEMPLATE_DIR, "scripts"), path.join(WORKSPACE_DIR, "scripts"));
}

async function renderWorkspace(projectInfo: ProjectInfo) {
  const iconAssets = await prepareIconAssets(WORKSPACE_DIR, projectInfo);

  await Promise.all([
    renderPackageJson(projectInfo),
    renderElectrobunConfig(projectInfo, iconAssets),
    renderIndexHtml(projectInfo),
    syncRuntimeConfig(WORKSPACE_DIR, projectInfo),
  ]);
}

async function closeRunningDevApp(projectInfo: ProjectInfo) {
  if (process.platform !== "darwin") {
    return;
  }

  const appBundlePath = path.join(
    WORKSPACE_DIR,
    "build",
    "dev-macos-arm64",
    `${projectInfo.appName}-dev.app`
  );
  const killResult = Bun.spawnSync(["pkill", "-f", appBundlePath], {
    stdout: "ignore",
    stderr: "ignore",
  });

  if (killResult.exitCode === 0) {
    await Bun.sleep(300);
  }
}

function startDevProcess() {
  return Bun.spawn(["bun", "run", "dev"], {
    cwd: WORKSPACE_DIR,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
}

async function renderPackageJson(projectInfo: ProjectInfo) {
  const template = await readFile(GENERATED_TEMPLATE_FILES.packageJson, "utf8");
  const output = template.replaceAll("__APP_SLUG__", projectInfo.slug);
  await writeFile(path.join(WORKSPACE_DIR, "package.json"), output, "utf8");
}

async function renderElectrobunConfig(projectInfo: ProjectInfo, iconAssets: IconAssets) {
  const template = await readFile(GENERATED_TEMPLATE_FILES.electrobunConfig, "utf8");
  const output = template
    .replaceAll("__APP_NAME__", projectInfo.appName)
    .replaceAll("__APP_ID__", projectInfo.appId)
    .replaceAll("__ICON_MAC__", iconAssets.mac ?? "")
    .replaceAll("__ICON_WIN__", iconAssets.win ?? "")
    .replaceAll("__ICON_LINUX__", iconAssets.linux ?? "");

  await writeFile(path.join(WORKSPACE_DIR, "electrobun.config.ts"), output, "utf8");
}

async function renderIndexHtml(projectInfo: ProjectInfo) {
  const template = await readFile(GENERATED_TEMPLATE_FILES.indexHtml, "utf8");
  const output = template
    .replaceAll("__APP_NAME__", projectInfo.appName)
    .replaceAll("__APP_URL__", projectInfo.normalizedUrl)
    .replaceAll("__APP_PARTITION__", projectInfo.partition)
    .replaceAll("__SAFE_AREA_PENDING__", supportsSiteSafeArea(projectInfo) ? "true" : "false");

  await writeFile(path.join(WORKSPACE_DIR, "src", "views", "index.html"), output, "utf8");
}

function supportsSiteSafeArea(projectInfo: ProjectInfo) {
  if (!projectInfo.window.hideTitleBar || !projectInfo.safeArea.enabled) {
    return false;
  }

  try {
    const hostname = new URL(projectInfo.normalizedUrl).hostname;
    return hostname === "kimi.com" || hostname === "www.kimi.com";
  } catch {
    return false;
  }
}

function watchWorkspaceInputs(configPath: string, onChange: () => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      onChange();
    }, 150);
  };

  const watchers = [
    watchFileParent(configPath, schedule),
    watchFileParent(GENERATED_TEMPLATE_FILES.packageJson, schedule),
    watchFileParent(GENERATED_TEMPLATE_FILES.electrobunConfig, schedule),
    watchFileParent(GENERATED_TEMPLATE_FILES.indexHtml, schedule),
  ];

  return () => {
    if (timer) {
      clearTimeout(timer);
    }
    for (const watcher of watchers) {
      watcher.close();
    }
  };
}

function watchFileParent(filePath: string, onChange: () => void) {
  const directory = path.dirname(filePath);
  const filename = path.basename(filePath);

  return watch(directory, (_, changedFile) => {
    if (!changedFile) {
      onChange();
      return;
    }

    if (changedFile === filename) {
      onChange();
    }
  }) satisfies FSWatcher;
}

async function linkDir(source: string, target: string) {
  await symlink(source, target, process.platform === "win32" ? "junction" : "dir");
}

async function linkFile(source: string, target: string) {
  await symlink(source, target, "file");
}

async function linkNodeModules() {
  const workspaceNodeModules = path.join(WORKSPACE_DIR, "node_modules");
  const candidateDirs = [
    path.join(TEMPLATE_DIR, "node_modules"),
    path.join(REPO_ROOT, "node_modules"),
  ];

  for (const candidate of candidateDirs) {
    if (!existsSync(candidate)) {
      continue;
    }

    const electrobunBin = path.join(candidate, ".bin", "electrobun");
    if (!existsSync(electrobunBin)) {
      continue;
    }

    await symlink(
      candidate,
      workspaceNodeModules,
      process.platform === "win32" ? "junction" : "dir"
    );
    return;
  }

  throw new Error("No node_modules directory found for template dev workspace");
}

await main();
