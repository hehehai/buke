import { describe, expect, test } from "bun:test";
import { normalizeUrl, parseNumberFlag, slugify } from "../helpers";

describe("normalizeUrl", () => {
  test("adds https:// if missing", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com/");
  });

  test("preserves http://", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com/");
  });

  test("preserves https://", () => {
    expect(normalizeUrl("https://example.com")).toBe("https://example.com/");
  });

  test("trims whitespace", () => {
    expect(normalizeUrl("  example.com  ")).toBe("https://example.com/");
  });
});

describe("slugify", () => {
  test("basic slugification", () => {
    expect(slugify("My App")).toBe("my-app");
  });

  test("removes special characters", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
  });

  test("trims leading/trailing hyphens", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  test("empty input returns 'app'", () => {
    expect(slugify("")).toBe("app");
  });

  test("truncates to 64 chars", () => {
    const long = "a".repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(64);
  });
});

describe("parseNumberFlag", () => {
  test("parses string number", () => {
    expect(parseNumberFlag("42", 0)).toBe(42);
  });

  test("returns fallback for undefined", () => {
    expect(parseNumberFlag(undefined, 99)).toBe(99);
  });

  test("returns fallback for invalid string", () => {
    expect(parseNumberFlag("abc", 99)).toBe(99);
  });

  test("handles boolean value", () => {
    expect(parseNumberFlag(true, 99)).toBe(99);
  });
});
