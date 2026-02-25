import { lstat, readdir, rm } from "node:fs/promises";
import path from "node:path";

const buildDir = process.env.ELECTROBUN_BUILD_DIR;
if (!buildDir) {
  console.log("ELECTROBUN_BUILD_DIR not set; skipping size optimization.");
  process.exit(0);
}

const removeDirs = new Set([".dSYM"]);
const removeFiles = new Set([".map", ".pdb"]);

async function walk(entry: string) {
  const stats = await lstat(entry);
  if (stats.isDirectory()) {
    const name = path.basename(entry);
    if (removeDirs.has(name)) {
      await rm(entry, { recursive: true, force: true });
      return;
    }
    const entries = await readdir(entry);
    await Promise.all(entries.map((child) => walk(path.join(entry, child))));
    return;
  }

  const ext = path.extname(entry);
  if (removeFiles.has(ext) || entry.endsWith(".DS_Store")) {
    await rm(entry, { force: true });
  }
}

console.log(`Optimizing package size in ${buildDir}...`);
await walk(buildDir);
console.log("Package optimization complete.");
