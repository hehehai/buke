import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Utils } from "electrobun/bun";

export async function ensureSettingsPath() {
  await mkdir(Utils.paths.userData, { recursive: true });
  return path.join(Utils.paths.userData, "settings.json");
}

export async function saveSettings<T extends object>(settingsPath: string, next: T) {
  const current = (await readJson<T>(settingsPath)) ?? ({} as T);
  const updated = { ...current, ...next };
  await writeFile(settingsPath, JSON.stringify(updated, null, 2), "utf8");
}

export async function readJson<T>(filePath: string) {
  if (!existsSync(filePath)) {
    return null;
  }
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}
