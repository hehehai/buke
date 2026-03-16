type ElectrobunEventData = {
  allowed?: boolean;
  action?: string;
  url?: string;
  [key: string]: unknown;
};

type ElectrobunEvent = {
  data: ElectrobunEventData;
};

declare module "electrobun/bun" {
  export type ApplicationMenuItemConfig = {
    label?: string;
    action?: string;
    accelerator?: string;
    role?: string;
    type?: "normal" | "separator" | "divider";
    submenu?: ApplicationMenuItemConfig[];
  };

  export const ApplicationMenu: {
    setApplicationMenu: (menu: ApplicationMenuItemConfig[]) => void;
  };

  export class BrowserView {
    id: number;
    hostWebviewId?: number;
    webview: { id: number };
    static getAll(): BrowserView[];
    setNavigationRules(rules: string[]): void;
    on(event: string, handler: (event: ElectrobunEvent) => void): void;
    executeJavascript(script: string): void;
    toggleDevTools(): void;
  }

  export class BrowserWindow {
    constructor(options: {
      title: string;
      url: string | null;
      frame: { x?: number; y?: number; width: number; height: number };
      titleBarStyle?: "hidden" | "hiddenInset" | "default";
      transparent?: boolean;
    });
    id: number;
    webview: BrowserView;
    static getById(id: number): BrowserWindow | undefined;
    setSize(width: number, height: number): void;
    focus(): void;
    close(): void;
    minimize(): void;
    unminimize(): void;
    isMinimized(): boolean;
    getSize(): { width: number; height: number };
    on(event: string, handler: (event: ElectrobunEvent) => void): void;
  }

  export class Session {
    static fromPartition(partition: string): Session;
    cookies: { clear(): Promise<void> };
    clearStorageData(): Promise<void>;
  }

  export class Tray {
    constructor(options?: {
      title?: string;
      image?: string;
      template?: boolean;
      width?: number;
      height?: number;
    });
    setMenu(
      menu: Array<{ type?: "normal" | "separator" | "divider"; label?: string; action?: string }>,
    ): void;
    on(event: "tray-clicked", handler: (event: ElectrobunEvent) => void): void;
  }

  export const Utils: { quit: () => void; paths: { userData: string } };

  const Electrobun: {
    events: { on: (event: string, handler: (event: ElectrobunEvent) => void) => void };
  };
  export default Electrobun;
}

declare module "electrobun" {
  export type ElectrobunConfig = {
    app?: { name?: string; identifier?: string; version?: string };
    build?: Record<string, unknown>;
    scripts?: {
      preBuild?: string;
      postBuild?: string;
      postWrap?: string;
      postPackage?: string;
    };
    runtime?: Record<string, unknown>;
  };
}
