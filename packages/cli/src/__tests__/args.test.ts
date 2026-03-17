import { describe, expect, test } from "bun:test";
import { parseArgs } from "../args";

describe("parseArgs", () => {
  test("parses long flags with values", () => {
    const { flags } = parseArgs(["--name", "MyApp", "--width", "800"]);
    expect(flags.name).toBe("MyApp");
    expect(flags.width).toBe("800");
  });

  test("parses boolean flags", () => {
    const { flags } = parseArgs(["--always-on-top", "--dark-mode", "--debug"]);
    expect(flags["always-on-top"]).toBe(true);
    expect(flags["dark-mode"]).toBe(true);
    expect(flags.debug).toBe(true);
  });

  test("parses = syntax", () => {
    const { flags } = parseArgs(["--name=MyApp"]);
    expect(flags.name).toBe("MyApp");
  });

  test("parses short flags", () => {
    const { flags } = parseArgs(["-n", "MyApp", "-w", "800"]);
    expect(flags.name).toBe("MyApp");
    expect(flags.width).toBe("800");
  });

  test("parses positionals", () => {
    const { positionals } = parseArgs(["pack", "https://example.com"]);
    expect(positionals).toEqual(["pack", "https://example.com"]);
  });

  test("-- stops flag parsing", () => {
    const { flags, positionals } = parseArgs(["--name", "test", "--", "--not-a-flag"]);
    expect(flags.name).toBe("test");
    expect(positionals).toEqual(["--not-a-flag"]);
  });

  test("navigation flags", () => {
    const { flags } = parseArgs([
      "--force-internal-navigation",
      "--internal-url-regex",
      ".*\\.example\\.com",
      "--disabled-web-shortcuts",
    ]);
    expect(flags["force-internal-navigation"]).toBe(true);
    expect(flags["internal-url-regex"]).toBe(".*\\.example\\.com");
    expect(flags["disabled-web-shortcuts"]).toBe(true);
  });

  test("build flags", () => {
    const { flags } = parseArgs(["--app-version", "2.0.0", "--install", "--iterative-build"]);
    expect(flags["app-version"]).toBe("2.0.0");
    expect(flags.install).toBe(true);
    expect(flags["iterative-build"]).toBe(true);
  });

  test("runtime flags", () => {
    const { flags } = parseArgs([
      "--incognito",
      "--enable-drag-drop",
      "--paste-plain-text",
      "--wasm",
      "--camera",
      "--microphone",
      "--multi-window",
    ]);
    expect(flags.incognito).toBe(true);
    expect(flags["enable-drag-drop"]).toBe(true);
    expect(flags["paste-plain-text"]).toBe(true);
    expect(flags.wasm).toBe(true);
    expect(flags.camera).toBe(true);
    expect(flags.microphone).toBe(true);
    expect(flags["multi-window"]).toBe(true);
  });
});
