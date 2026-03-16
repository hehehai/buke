import path from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { Utils } from "electrobun/bun";

export type BukeConfig = {
  name?: string;
  id?: string;
  url?: string;
  partition?: string;
  zoom?: number;
  allowlist?: string[];
  window?: {
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
    hideTitleBar?: boolean;
    fullscreen?: boolean;
    maximized?: boolean;
  };
  tray?: {
    enabled?: boolean;
    icon?: string;
    hideOnClose?: boolean;
  };
  network?: {
    userAgent?: string;
    proxyUrl?: string;
  };
  macosSafeArea?: {
    enabled?: boolean;
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
  };
  inject?: {
    css?: string[];
    js?: string[];
  };
};

export type InjectionAssets = {
  css: string[];
  js: string[];
};

export type Settings = {
  zoomLevel?: number;
};

export const DEFAULT_CONFIG: Required<Pick<BukeConfig, "partition" | "zoom" | "allowlist">> & {
  inject: Required<NonNullable<BukeConfig["inject"]>>;
  macosSafeArea: Required<NonNullable<BukeConfig["macosSafeArea"]>>;
  window: Required<NonNullable<BukeConfig["window"]>>;
  tray: Required<NonNullable<BukeConfig["tray"]>>;
  network: Required<NonNullable<BukeConfig["network"]>>;
} = {
  partition: "persist:default",
  zoom: 1,
  allowlist: [],
  inject: { css: [], js: [] },
  window: {
    width: 1200,
    height: 780,
    minWidth: 960,
    minHeight: 640,
    hideTitleBar: false,
    fullscreen: false,
    maximized: false
  },
  tray: {
    enabled: false,
    icon: "",
    hideOnClose: process.platform === "darwin"
  },
  network: {
    userAgent: "",
    proxyUrl: ""
  },
  macosSafeArea: {
    enabled: false,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  }
};

export function normalizePartition(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_CONFIG.partition;
  }
  return trimmed.includes(":") ? trimmed : `persist:${trimmed}`;
}

export async function loadConfig() {
  const packagedResourcesDir = path.resolve(path.dirname(process.execPath), "..", "Resources");
  const candidates = [
    path.resolve(process.cwd(), "buke.config.json"),
    path.join(Utils.paths.userData, "buke.config.json"),
    path.join(packagedResourcesDir, "app.asar.unpacked", "buke.config.json"),
    path.join(packagedResourcesDir, "app", "buke.config.json")
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) {
      continue;
    }

    const raw = await readFile(candidate, "utf8");
    const parsed = JSON.parse(raw) as BukeConfig;
    return {
      config: normalizeConfig(parsed),
      configDir: path.dirname(candidate)
    };
  }

  return { config: normalizeConfig({}), configDir: process.cwd() };
}

export function normalizeConfig(config: BukeConfig): BukeConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    window: {
      ...DEFAULT_CONFIG.window,
      ...(config.window ?? {})
    },
    tray: {
      ...DEFAULT_CONFIG.tray,
      ...(config.tray ?? {})
    },
    network: {
      ...DEFAULT_CONFIG.network,
      ...(config.network ?? {})
    },
    macosSafeArea: {
      ...DEFAULT_CONFIG.macosSafeArea,
      ...(config.macosSafeArea ?? {})
    },
    inject: {
      ...DEFAULT_CONFIG.inject,
      ...(config.inject ?? {})
    }
  };
}

export async function loadInjectionAssets(inject: BukeConfig["inject"], dir: string) {
  const css = await loadInjectionList(inject?.css ?? [], dir);
  const js = await loadInjectionList(inject?.js ?? [], dir);
  return { css, js } satisfies InjectionAssets;
}

async function loadInjectionList(entries: string[], dir: string) {
  const results: string[] = [];
  for (const entry of entries) {
    if (!entry) {
      continue;
    }

    if (entry.startsWith("inline:")) {
      results.push(entry.slice("inline:".length));
      continue;
    }

    const resolved = path.isAbsolute(entry) ? entry : path.join(dir, entry);
    if (!existsSync(resolved)) {
      console.log(`Injection file not found: ${resolved}`);
      continue;
    }
    results.push(await readFile(resolved, "utf8"));
  }
  return results;
}

export function safeParseUrl(value: string) {
  try {
    return new URL(value);
  } catch (error) {
    console.log(`Invalid URL: ${value}`);
    return null;
  }
}
