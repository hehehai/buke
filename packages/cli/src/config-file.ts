import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PackConfigFile } from "./config";

export type LoadedPackConfig = {
  config: PackConfigFile;
  configPath: string;
  configDir: string;
};

export async function loadPackConfig(filePath: string): Promise<LoadedPackConfig> {
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

  if (!existsSync(resolved)) {
    console.error(`Config file not found: ${resolved}`);
    process.exit(1);
  }

  try {
    const raw = await readFile(resolved, "utf8");
    const parsed = JSON.parse(raw) as PackConfigFile;
    return {
      config: parsed,
      configPath: resolved,
      configDir: path.dirname(resolved),
    };
  } catch (error) {
    console.error(`Failed to read config file: ${resolved}`);
    console.error(error);
    process.exit(1);
  }
}
