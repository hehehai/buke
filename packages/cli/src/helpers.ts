import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Flags } from "./args";

export function resolveTemplateDir(flags: Flags) {
  return flags.template
    ? path.resolve(process.cwd(), flags.template as string)
    : fileURLToPath(new URL("../../template", import.meta.url));
}

export function resolveCwd(flags: Flags, positionals: string[]) {
  const raw = (flags.cwd as string) ?? positionals[0];
  return raw ? path.resolve(process.cwd(), raw) : process.cwd();
}

export function normalizeUrl(input: string) {
  const trimmed = input.trim();
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return new URL(withScheme).toString();
}

export function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
      .slice(0, 64) || "app"
  );
}

export function parseNumberFlag(value: string | boolean | undefined, fallback: number) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function resolveAssetPath(value: string | undefined, baseDir: string) {
  if (!value) {
    return undefined;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return path.isAbsolute(value) ? value : path.resolve(baseDir, value);
}
