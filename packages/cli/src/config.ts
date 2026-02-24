import type { Flags } from "./args";
import { normalizeUrl, parseNumberFlag, slugify } from "./helpers";

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
  icon?: string;
};

export function deriveProjectInfo(urlInput: string, flags: Flags): ProjectInfo {
  const normalizedUrl = normalizeUrl(urlInput);
  const url = new URL(normalizedUrl);
  const defaultName = url.hostname.replace(/^www\./, "");
  const appName = (flags.name as string) ?? defaultName;
  const slug = slugify(appName);
  const appId = (flags.id as string) ?? `com.buke.${slug}`;
  const partition = (flags.partition as string) ?? "persist:default";

  return {
    normalizedUrl,
    appName,
    slug,
    appId,
    partition,
    safeArea: deriveSafeArea(flags),
    window: deriveWindow(flags),
    tray: deriveTray(flags),
    network: deriveNetwork(flags),
    icon: typeof flags.icon === "string" ? flags.icon : undefined
  };
}

export function deriveSafeArea(flags: Flags): SafeAreaConfig {
  const enabled = !flags["safe-off"];
  const top = parseNumberFlag(flags["safe-top"], 28);
  const left = parseNumberFlag(flags["safe-left"], 12);
  const right = parseNumberFlag(flags["safe-right"], 0);
  const bottom = parseNumberFlag(flags["safe-bottom"], 0);

  return { enabled, top, left, right, bottom };
}

export function deriveWindow(flags: Flags): WindowConfig {
  const width = parseNumberFlag(flags.width, 1200);
  const height = parseNumberFlag(flags.height, 800);
  const minWidth = parseNumberFlag(flags["min-width"], 960);
  const minHeight = parseNumberFlag(flags["min-height"], 640);
  const hideTitleBar = flags["show-title-bar"]
    ? false
    : flags["hide-title-bar"] !== undefined
      ? Boolean(flags["hide-title-bar"])
      : true;

  return { width, height, minWidth, minHeight, hideTitleBar };
}

export function deriveTray(flags: Flags): TrayConfig {
  const enabled = Boolean(flags["show-system-tray"]);
  const icon =
    typeof flags["system-tray-icon"] === "string"
      ? (flags["system-tray-icon"] as string)
      : undefined;
  const hideOnClose = Boolean(flags["hide-on-close"]);

  return { enabled, icon, hideOnClose };
}

export function deriveNetwork(flags: Flags): NetworkConfig {
  const userAgent =
    typeof flags["user-agent"] === "string" ? (flags["user-agent"] as string) : undefined;
  const proxyUrl =
    typeof flags["proxy-url"] === "string" ? (flags["proxy-url"] as string) : undefined;

  return { userAgent, proxyUrl };
}
