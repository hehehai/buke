import { describe, expect, test } from "bun:test";
import { listPresetNames, resolvePreset } from "../presets";

describe("resolvePreset", () => {
  test("resolves deepseek", () => {
    const preset = resolvePreset("deepseek");
    expect(preset).not.toBeNull();
    expect(preset?.url).toBe("https://chat.deepseek.com/");
    expect(preset?.name).toBe("DeepSeek");
  });

  test("resolves chatgpt", () => {
    const preset = resolvePreset("chatgpt");
    expect(preset).not.toBeNull();
    expect(preset?.url).toBe("https://chatgpt.com/");
  });

  test("resolves twitter with allowlist", () => {
    const preset = resolvePreset("twitter");
    expect(preset).not.toBeNull();
    expect(preset?.url).toBe("https://x.com/");
    expect(preset?.config).toBeDefined();
    const allowlist = preset?.config?.allowlist as string[] | undefined;
    expect(allowlist).toContain("abs.twimg.com");
  });

  test("resolves youtube", () => {
    const preset = resolvePreset("youtube");
    expect(preset).not.toBeNull();
    expect(preset?.url).toBe("https://www.youtube.com/");
  });

  test("case insensitive", () => {
    const preset = resolvePreset("DeepSeek");
    expect(preset).not.toBeNull();
    expect(preset?.name).toBe("DeepSeek");
  });

  test("returns null for unknown preset", () => {
    const preset = resolvePreset("unknown-app-xyz");
    expect(preset).toBeNull();
  });

  test("trims whitespace", () => {
    const preset = resolvePreset("  github  ");
    expect(preset).not.toBeNull();
    expect(preset?.url).toBe("https://github.com/");
  });
});

describe("listPresetNames", () => {
  test("returns sorted list", () => {
    const names = listPresetNames();
    expect(names.length).toBeGreaterThan(10);
    expect(names).toContain("deepseek");
    expect(names).toContain("chatgpt");
    expect(names).toContain("github");
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });
});
