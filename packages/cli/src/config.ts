import type { Flags } from "./args";
import { normalizeUrl, parseNumberFlag, resolveAssetPath, slugify } from "./helpers";

export type SafeAreaConfig = {
  enabled: boolean;
  top: number;
  left: number;
  right: number;
  bottom: number;
};

export type WindowConfig = {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  hideTitleBar: boolean;
  fullscreen: boolean;
  maximized: boolean;
  alwaysOnTop: boolean;
  title?: string;
};

export type TrayConfig = {
  enabled: boolean;
  icon?: string;
  hideOnClose: boolean;
};

export type NetworkConfig = {
  userAgent?: string;
  proxyUrl?: string;
};

export type AboutMenuItemConfig = {
  label?: string;
  url?: string;
  separator?: boolean;
};

export type AboutConfig = {
  enabled?: boolean;
  items?: AboutMenuItemConfig[];
};

export type LocaleMenuConfig = {
  [key: string]: string;
};

export type I18nConfig = {
  menu?: LocaleMenuConfig;
};

export type InjectConfig = {
  css?: string[];
  js?: string[];
};

export type NavigationConfig = {
  forceInternalNavigation: boolean;
  internalUrlRegex?: string;
  disabledWebShortcuts: boolean;
  newWindow: boolean;
};

export type InstanceConfig = {
  multiInstance: boolean;
  activationShortcut?: string;
};

export type RuntimeConfig = {
  darkMode: boolean;
  startToTray: boolean;
  debug: boolean;
  incognito: boolean;
  enableDragDrop: boolean;
  pastePlainText: boolean;
  ignoreCertificateErrors: boolean;
  wasm: boolean;
  camera: boolean;
  microphone: boolean;
  multiWindow: boolean;
};

export type BuildConfig = {
  appVersion?: string;
  install: boolean;
  iterativeBuild: boolean;
};

export type PackConfigFile = {
  name?: string;
  id?: string;
  url?: string;
  partition?: string;
  allowlist?: string[];
  icon?: string;
  outDir?: string;
  env?: string;
  zoom?: number;
  window?: Partial<WindowConfig>;
  tray?: Partial<TrayConfig>;
  network?: Partial<NetworkConfig>;
  navigation?: Partial<NavigationConfig>;
  instance?: Partial<InstanceConfig>;
  runtime?: Partial<RuntimeConfig>;
  build?: Partial<BuildConfig>;
  inject?: InjectConfig;
  macosSafeArea?: Partial<SafeAreaConfig>;
  about?: AboutConfig;
  locale?: string;
  i18n?: I18nConfig;
  useLocalFile?: string;
};

export type ProjectInfo = {
  normalizedUrl: string;
  appName: string;
  slug: string;
  appId: string;
  partition: string;
  allowlist: string[];
  safeArea: SafeAreaConfig;
  window: WindowConfig;
  tray: TrayConfig;
  network: NetworkConfig;
  navigation: NavigationConfig;
  instance: InstanceConfig;
  runtime: RuntimeConfig;
  buildConfig: BuildConfig;
  about?: AboutConfig;
  locale?: string;
  i18n?: I18nConfig;
  icon?: string;
  inject?: InjectConfig;
  zoom?: number;
  useLocalFile?: string;
};

export function deriveProjectInfo(
  urlInput: string,
  flags: Flags,
  config?: PackConfigFile,
  configDir: string = process.cwd(),
): ProjectInfo {
  const normalizedUrl = normalizeUrl(urlInput);
  const url = new URL(normalizedUrl);
  const defaultName = url.hostname.replace(/^www\./, "");
  const appName = (flags.name as string) ?? config?.name ?? defaultName;
  const slug = slugify(appName);
  const appId = (flags.id as string) ?? config?.id ?? `com.buke.${slug}`;
  const incognito =
    flags.incognito !== undefined ? Boolean(flags.incognito) : Boolean(config?.runtime?.incognito);
  const partition = incognito
    ? "default"
    : ((flags.partition as string) ?? config?.partition ?? "persist:default");
  const iconInput = typeof flags.icon === "string" ? flags.icon : config?.icon;
  const zoom = deriveZoom(flags, config);

  return {
    normalizedUrl,
    appName,
    slug,
    appId,
    partition,
    allowlist: normalizeAllowlist(config?.allowlist),
    safeArea: deriveSafeArea(flags, config),
    window: deriveWindow(flags, config),
    tray: deriveTray(flags, config, configDir),
    network: deriveNetwork(flags, config),
    navigation: deriveNavigation(flags, config),
    instance: deriveInstance(flags, config),
    runtime: deriveRuntime(flags, config),
    buildConfig: deriveBuild(flags, config),
    icon: resolveAssetPath(iconInput, configDir),
    about: config?.about,
    locale: config?.locale?.trim(),
    i18n: config?.i18n,
    inject: config?.inject,
    zoom,
    useLocalFile:
      typeof flags["use-local-file"] === "string"
        ? (flags["use-local-file"] as string)
        : config?.useLocalFile,
  };
}

export function deriveSafeArea(flags: Flags, config?: PackConfigFile): SafeAreaConfig {
  const hasFlagOverrides =
    flags["safe-top"] !== undefined ||
    flags["safe-left"] !== undefined ||
    flags["safe-right"] !== undefined ||
    flags["safe-bottom"] !== undefined ||
    flags["safe-off"] !== undefined;

  if (hasFlagOverrides) {
    const top = parseNumberFlag(flags["safe-top"], 0);
    const left = parseNumberFlag(flags["safe-left"], 0);
    const right = parseNumberFlag(flags["safe-right"], 0);
    const bottom = parseNumberFlag(flags["safe-bottom"], 0);
    const hasOverrides =
      flags["safe-top"] !== undefined ||
      flags["safe-left"] !== undefined ||
      flags["safe-right"] !== undefined ||
      flags["safe-bottom"] !== undefined;
    const enabled = Boolean(!flags["safe-off"] && hasOverrides);

    if (!enabled) {
      return { enabled: false, top: 0, left: 0, right: 0, bottom: 0 };
    }

    return { enabled, top, left, right, bottom };
  }

  const configSafe = config?.macosSafeArea;
  if (!configSafe) {
    return { enabled: false, top: 0, left: 0, right: 0, bottom: 0 };
  }

  const top = toNumber(configSafe.top, 0);
  const left = toNumber(configSafe.left, 0);
  const right = toNumber(configSafe.right, 0);
  const bottom = toNumber(configSafe.bottom, 0);
  const hasOverrides = [top, left, right, bottom].some((value) => value !== 0);
  const enabled = typeof configSafe.enabled === "boolean" ? configSafe.enabled : hasOverrides;

  if (!enabled) {
    return { enabled: false, top: 0, left: 0, right: 0, bottom: 0 };
  }

  return { enabled, top, left, right, bottom };
}

export function deriveWindow(flags: Flags, config?: PackConfigFile): WindowConfig {
  const width = parseNumberFlag(flags.width, toNumber(config?.window?.width, 1200));
  const height = parseNumberFlag(flags.height, toNumber(config?.window?.height, 780));
  const minWidth = parseNumberFlag(flags["min-width"], toNumber(config?.window?.minWidth, 960));
  const minHeight = parseNumberFlag(flags["min-height"], toNumber(config?.window?.minHeight, 640));
  const hideTitleBar = flags["show-title-bar"]
    ? false
    : flags["hide-title-bar"] !== undefined
      ? Boolean(flags["hide-title-bar"])
      : typeof config?.window?.hideTitleBar === "boolean"
        ? config.window.hideTitleBar
        : false;
  const fullscreen =
    flags.fullscreen !== undefined
      ? Boolean(flags.fullscreen)
      : Boolean(config?.window?.fullscreen);
  const maximized =
    flags.maximized !== undefined ? Boolean(flags.maximized) : Boolean(config?.window?.maximized);

  const alwaysOnTop =
    flags["always-on-top"] !== undefined
      ? Boolean(flags["always-on-top"])
      : Boolean(config?.window?.alwaysOnTop);
  const title = typeof flags.title === "string" ? (flags.title as string) : config?.window?.title;

  return {
    width,
    height,
    minWidth,
    minHeight,
    hideTitleBar,
    fullscreen,
    maximized,
    alwaysOnTop,
    title,
  };
}

export function deriveTray(
  flags: Flags,
  config?: PackConfigFile,
  configDir: string = process.cwd(),
): TrayConfig {
  const enabled =
    flags["show-system-tray"] !== undefined
      ? Boolean(flags["show-system-tray"])
      : Boolean(config?.tray?.enabled);
  const iconInput =
    typeof flags["system-tray-icon"] === "string"
      ? (flags["system-tray-icon"] as string)
      : config?.tray?.icon;
  const hideOnClose =
    flags["hide-on-close"] !== undefined
      ? Boolean(flags["hide-on-close"])
      : typeof config?.tray?.hideOnClose === "boolean"
        ? config.tray.hideOnClose
        : process.platform === "darwin";

  return { enabled, icon: resolveAssetPath(iconInput, configDir), hideOnClose };
}

export function deriveNetwork(flags: Flags, config?: PackConfigFile): NetworkConfig {
  const userAgent =
    typeof flags["user-agent"] === "string"
      ? (flags["user-agent"] as string)
      : config?.network?.userAgent;
  const proxyUrl =
    typeof flags["proxy-url"] === "string"
      ? (flags["proxy-url"] as string)
      : config?.network?.proxyUrl;

  return { userAgent, proxyUrl };
}

export function deriveNavigation(flags: Flags, config?: PackConfigFile): NavigationConfig {
  const forceInternalNavigation =
    flags["force-internal-navigation"] !== undefined
      ? Boolean(flags["force-internal-navigation"])
      : Boolean(config?.navigation?.forceInternalNavigation);
  const internalUrlRegex =
    typeof flags["internal-url-regex"] === "string"
      ? (flags["internal-url-regex"] as string)
      : config?.navigation?.internalUrlRegex;
  const disabledWebShortcuts =
    flags["disabled-web-shortcuts"] !== undefined
      ? Boolean(flags["disabled-web-shortcuts"])
      : Boolean(config?.navigation?.disabledWebShortcuts);
  const newWindow =
    flags["new-window"] !== undefined
      ? Boolean(flags["new-window"])
      : Boolean(config?.navigation?.newWindow);

  return { forceInternalNavigation, internalUrlRegex, disabledWebShortcuts, newWindow };
}

export function deriveInstance(flags: Flags, config?: PackConfigFile): InstanceConfig {
  const multiInstance =
    flags["multi-instance"] !== undefined
      ? Boolean(flags["multi-instance"])
      : Boolean(config?.instance?.multiInstance);
  const activationShortcut =
    typeof flags["activation-shortcut"] === "string"
      ? (flags["activation-shortcut"] as string)
      : config?.instance?.activationShortcut;

  return { multiInstance, activationShortcut };
}

export function deriveRuntime(flags: Flags, config?: PackConfigFile): RuntimeConfig {
  const boolFlag = (flagName: string, configValue?: boolean) =>
    flags[flagName] !== undefined ? Boolean(flags[flagName]) : Boolean(configValue);

  return {
    darkMode: boolFlag("dark-mode", config?.runtime?.darkMode),
    startToTray: boolFlag("start-to-tray", config?.runtime?.startToTray),
    debug: boolFlag("debug", config?.runtime?.debug),
    incognito: boolFlag("incognito", config?.runtime?.incognito),
    enableDragDrop: boolFlag("enable-drag-drop", config?.runtime?.enableDragDrop),
    pastePlainText: boolFlag("paste-plain-text", config?.runtime?.pastePlainText),
    ignoreCertificateErrors: boolFlag(
      "ignore-certificate-errors",
      config?.runtime?.ignoreCertificateErrors,
    ),
    wasm: boolFlag("wasm", config?.runtime?.wasm),
    camera: boolFlag("camera", config?.runtime?.camera),
    microphone: boolFlag("microphone", config?.runtime?.microphone),
    multiWindow: boolFlag("multi-window", config?.runtime?.multiWindow),
  };
}

export function deriveBuild(flags: Flags, config?: PackConfigFile): BuildConfig {
  const appVersion =
    typeof flags["app-version"] === "string"
      ? (flags["app-version"] as string)
      : config?.build?.appVersion;
  const install =
    flags.install !== undefined ? Boolean(flags.install) : Boolean(config?.build?.install);
  const iterativeBuild =
    flags["iterative-build"] !== undefined
      ? Boolean(flags["iterative-build"])
      : Boolean(config?.build?.iterativeBuild);

  return { appVersion, install, iterativeBuild };
}

function deriveZoom(flags: Flags, config?: PackConfigFile): number | undefined {
  const raw = flags.zoom;
  if (raw !== undefined) {
    const parsed = parseNumberFlag(raw, -1);
    if (parsed > 10) {
      return parsed / 100;
    }
    return parsed > 0 ? parsed : undefined;
  }
  if (typeof config?.zoom === "number") {
    const val = config.zoom;
    if (val > 10) {
      return val / 100;
    }
    return val > 0 ? val : undefined;
  }
  return undefined;
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeAllowlist(entries: string[] | undefined) {
  if (!Array.isArray(entries)) {
    return [];
  }

  const allowlist: string[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (typeof entry !== "string") {
      continue;
    }

    const trimmed = entry.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    allowlist.push(trimmed);
  }

  return allowlist;
}
