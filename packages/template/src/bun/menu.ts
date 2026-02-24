import { ApplicationMenu } from "electrobun/bun";

export type MenuHandlers = {
  reload: () => void;
  toggleDevTools: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  windowCompact: () => void;
  windowStandard: () => void;
  windowWide: () => void;
  clearData: () => void;
  closeWindow: () => void;
  quit: () => void;
};

export function buildMenu(appName: string, isMacOS: boolean) {
  ApplicationMenu.setApplicationMenu([
    {
      label: appName,
      submenu: [
        { label: "Reload", action: "reload", accelerator: "r" },
        {
          label: "Toggle DevTools",
          action: "toggle-devtools",
          accelerator: "i"
        },
        { label: "Clear Site Data", action: "clear-data" },
        ...(isMacOS
          ? [
              { type: "separator" as const },
              { label: "Close Window", action: "close-main-window", accelerator: "w" }
            ]
          : []),
        { type: "separator" as const },
        { label: "Quit", action: "quit-app", accelerator: "q" }
      ]
    },
    {
      label: "View",
      submenu: [
        { label: "Zoom In", action: "zoom-in", accelerator: "+" },
        { label: "Zoom Out", action: "zoom-out", accelerator: "-" },
        { label: "Reset Zoom", action: "zoom-reset", accelerator: "0" }
      ]
    },
    {
      label: "Window",
      submenu: [
        ...(isMacOS
          ? [
              { role: "minimize" },
              { role: "zoom" },
              { role: "bringAllToFront" },
              { type: "separator" as const }
            ]
          : []),
        { label: "Compact", action: "window-compact" },
        { label: "Standard", action: "window-standard" },
        { label: "Wide", action: "window-wide" }
      ]
    }
  ]);
}

export function handleMenuAction(action: string, handlers: MenuHandlers) {
  switch (action) {
    case "reload":
      handlers.reload();
      return;
    case "toggle-devtools":
      handlers.toggleDevTools();
      return;
    case "zoom-in":
      handlers.zoomIn();
      return;
    case "zoom-out":
      handlers.zoomOut();
      return;
    case "zoom-reset":
      handlers.zoomReset();
      return;
    case "window-compact":
      handlers.windowCompact();
      return;
    case "window-standard":
      handlers.windowStandard();
      return;
    case "window-wide":
      handlers.windowWide();
      return;
    case "clear-data":
      handlers.clearData();
      return;
    case "close-main-window":
      handlers.closeWindow();
      return;
    case "quit-app":
      handlers.quit();
      return;
    default:
      return;
  }
}
