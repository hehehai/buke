import packageJson from "../package.json";

export const VERSION = packageJson.version;

export const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".html",
  ".css",
  ".txt",
]);

export const SHORT_FLAGS: Record<string, string> = {
  h: "help",
  v: "version",
  n: "name",
  o: "out",
  i: "id",
  p: "partition",
  s: "safe-top",
  w: "width",
  H: "height",
  I: "icon",
  t: "template",
  c: "cwd",
  e: "env",
  u: "url",
};
