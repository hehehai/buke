import { describe, expect, test } from "bun:test";
import {
  deriveBuild,
  deriveInstance,
  deriveNavigation,
  deriveProjectInfo,
  deriveRuntime,
  deriveWindow,
} from "../config";

describe("deriveWindow", () => {
  test("defaults without flags or config", () => {
    const win = deriveWindow({});
    expect(win.width).toBe(1200);
    expect(win.height).toBe(780);
    expect(win.alwaysOnTop).toBe(false);
    expect(win.title).toBeUndefined();
  });

  test("--always-on-top flag", () => {
    const win = deriveWindow({ "always-on-top": true });
    expect(win.alwaysOnTop).toBe(true);
  });

  test("--title flag", () => {
    const win = deriveWindow({ title: "My App" });
    expect(win.title).toBe("My App");
  });

  test("config window.alwaysOnTop", () => {
    const win = deriveWindow({}, { window: { alwaysOnTop: true } });
    expect(win.alwaysOnTop).toBe(true);
  });

  test("flag overrides config for alwaysOnTop", () => {
    const win = deriveWindow({ "always-on-top": true }, { window: { alwaysOnTop: false } });
    expect(win.alwaysOnTop).toBe(true);
  });
});

describe("deriveNavigation", () => {
  test("defaults", () => {
    const nav = deriveNavigation({});
    expect(nav.forceInternalNavigation).toBe(false);
    expect(nav.disabledWebShortcuts).toBe(false);
    expect(nav.newWindow).toBe(false);
    expect(nav.internalUrlRegex).toBeUndefined();
  });

  test("--force-internal-navigation", () => {
    const nav = deriveNavigation({ "force-internal-navigation": true });
    expect(nav.forceInternalNavigation).toBe(true);
  });

  test("--internal-url-regex", () => {
    const nav = deriveNavigation({ "internal-url-regex": ".*\\.example\\.com" });
    expect(nav.internalUrlRegex).toBe(".*\\.example\\.com");
  });
});

describe("deriveInstance", () => {
  test("defaults", () => {
    const inst = deriveInstance({});
    expect(inst.multiInstance).toBe(false);
    expect(inst.activationShortcut).toBeUndefined();
  });

  test("--multi-instance", () => {
    const inst = deriveInstance({ "multi-instance": true });
    expect(inst.multiInstance).toBe(true);
  });

  test("--activation-shortcut", () => {
    const inst = deriveInstance({ "activation-shortcut": "CmdOrControl+Shift+P" });
    expect(inst.activationShortcut).toBe("CmdOrControl+Shift+P");
  });
});

describe("deriveRuntime", () => {
  test("defaults", () => {
    const rt = deriveRuntime({});
    expect(rt.darkMode).toBe(false);
    expect(rt.debug).toBe(false);
    expect(rt.incognito).toBe(false);
    expect(rt.startToTray).toBe(false);
    expect(rt.enableDragDrop).toBe(false);
    expect(rt.pastePlainText).toBe(false);
    expect(rt.wasm).toBe(false);
    expect(rt.camera).toBe(false);
    expect(rt.microphone).toBe(false);
    expect(rt.multiWindow).toBe(false);
  });

  test("--dark-mode flag", () => {
    const rt = deriveRuntime({ "dark-mode": true });
    expect(rt.darkMode).toBe(true);
  });

  test("config overrides", () => {
    const rt = deriveRuntime({}, { runtime: { debug: true, wasm: true } });
    expect(rt.debug).toBe(true);
    expect(rt.wasm).toBe(true);
  });

  test("flag overrides config", () => {
    const rt = deriveRuntime({ debug: true }, { runtime: { debug: false } });
    expect(rt.debug).toBe(true);
  });
});

describe("deriveBuild", () => {
  test("defaults", () => {
    const build = deriveBuild({});
    expect(build.appVersion).toBeUndefined();
    expect(build.install).toBe(false);
    expect(build.iterativeBuild).toBe(false);
  });

  test("--app-version", () => {
    const build = deriveBuild({ "app-version": "2.0.0" });
    expect(build.appVersion).toBe("2.0.0");
  });

  test("--install", () => {
    const build = deriveBuild({ install: true });
    expect(build.install).toBe(true);
  });
});

describe("deriveProjectInfo", () => {
  test("basic URL derivation", () => {
    const info = deriveProjectInfo("https://example.com", {});
    expect(info.normalizedUrl).toBe("https://example.com/");
    expect(info.appName).toBe("example.com");
    expect(info.appId).toBe("com.buke.example-com");
    expect(info.partition).toBe("persist:default");
  });

  test("--incognito removes persist prefix", () => {
    const info = deriveProjectInfo("https://example.com", { incognito: true });
    expect(info.partition).toBe("default");
  });

  test("zoom normalization: 150 → 1.5", () => {
    const info = deriveProjectInfo("https://example.com", { zoom: "150" });
    expect(info.zoom).toBe(1.5);
  });

  test("zoom normalization: 0.8 stays 0.8", () => {
    const info = deriveProjectInfo("https://example.com", { zoom: "0.8" });
    expect(info.zoom).toBe(0.8);
  });

  test("custom name and id", () => {
    const info = deriveProjectInfo("https://example.com", {
      name: "MyApp",
      id: "com.test.myapp",
    });
    expect(info.appName).toBe("MyApp");
    expect(info.appId).toBe("com.test.myapp");
  });
});
