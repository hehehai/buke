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

export type PackConfigFile = {
  name?: string;
  id?: string;
  url?: string;
  partition?: string;
  icon?: string;
  outDir?: string;
  env?: string;
  window?: Partial<WindowConfig>;
  tray?: Partial<TrayConfig>;
  network?: Partial<NetworkConfig>;
  inject?: InjectConfig;
  macosSafeArea?: Partial<SafeAreaConfig>;
  about?: AboutConfig;
  locale?: string;
  i18n?: I18nConfig;
};

export type ProjectInfo = {
  normalizedUrl: string;
  appName: string;
  slug: string;
  appId: string;
  partition: string;
  safeArea: SafeAreaConfig;
  window: WindowConfig;
  tray: TrayConfig;
  network: NetworkConfig;
  about?: AboutConfig;
  locale?: string;
  i18n?: I18nConfig;
  icon?: string;
  inject?: InjectConfig;
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
  const partition = (flags.partition as string) ?? config?.partition ?? "persist:default";
  const iconInput = typeof flags.icon === "string" ? flags.icon : config?.icon;

  return {
    normalizedUrl,
    appName,
    slug,
    appId,
    partition,
    safeArea: deriveSafeArea(flags, config),
    window: deriveWindow(flags, config),
    tray: deriveTray(flags, config, configDir),
    network: deriveNetwork(flags, config),
    icon: resolveAssetPath(iconInput, configDir),
    about: config?.about,
    locale: config?.locale?.trim(),
    i18n: config?.i18n,
    inject: config?.inject,
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
  const hasOverrides = top !== 0 || left !== 0 || right !== 0 || bottom !== 0;
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

  return { width, height, minWidth, minHeight, hideTitleBar, fullscreen, maximized };
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

function toNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
