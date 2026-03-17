import { existsSync } from "node:fs";
import path from "node:path";
import { Tray } from "electrobun/bun";

export type TrayHandlers = {
  show: () => void;
  hide: () => void;
  toggle: () => void;
  quit: () => void;
  newWindow?: () => void;
};

export type TrayConfig = {
  enabled: boolean;
  icon?: string;
  appName: string;
  configDir: string;
  multiWindow?: boolean;
};

export function setupTray(config: TrayConfig, handlers: TrayHandlers) {
  if (!config.enabled) {
    return null;
  }

  const trayIconPath = resolveAssetPath(config.configDir, config.icon);
  if (trayIconPath && !existsSync(trayIconPath)) {
    console.log(`Tray icon not found: ${trayIconPath}`);
  }

  const tray = new Tray({
    image: trayIconPath,
    title: trayIconPath ? "" : config.appName,
    template: true,
  });

  tray.setMenu([
    ...(config.multiWindow
      ? [{ type: "normal" as const, label: "New Window", action: "tray-new-window" }]
      : []),
    { type: "normal" as const, label: "Show", action: "tray-show" },
    { type: "normal" as const, label: "Hide", action: "tray-hide" },
    { type: "separator" as const },
    { type: "normal" as const, label: "Quit", action: "tray-quit" },
  ]);

  tray.on("tray-clicked", (event) => {
    const action = event.data.action;
    if (action === "tray-quit") {
      handlers.quit();
      return;
    }
    if (action === "tray-hide") {
      handlers.hide();
      return;
    }
    if (action === "tray-show") {
      handlers.show();
      return;
    }
    if (action === "tray-new-window") {
      handlers.newWindow?.();
      return;
    }

    handlers.toggle();
  });

  return tray;
}

function resolveAssetPath(configDir: string, value?: string) {
  if (!value) {
    return "";
  }
  return path.isAbsolute(value) ? value : path.join(configDir, value);
}
