#!/usr/bin/env bun

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_HOMEBREW_TAP_DIR,
  getArchivePath,
  getCliPackageMetadata,
  getReleaseDownloadUrl,
  parseFlag,
  releaseAssetExists,
  sha256File,
  sha256Remote,
} from "./release-lib";

async function main() {
  const args = process.argv.slice(2);
  const metadata = await getCliPackageMetadata();
  const version = parseFlag(args, "--version") ?? metadata.version;
  const tapDir = parseFlag(args, "--tap-dir") ?? DEFAULT_HOMEBREW_TAP_DIR;
  const formulaPath = path.join(tapDir, "Formula", "buke.rb");
  const target = "darwin-arm64" as const;
  const url = getReleaseDownloadUrl(version, target);
  const sha256 = releaseAssetExists(version, target)
    ? await sha256File(getArchivePath(version, target))
    : await sha256Remote(url);

  const formula = `class Buke < Formula
  desc ${JSON.stringify(metadata.description)}
  homepage ${JSON.stringify(metadata.homepage)}
  url ${JSON.stringify(url)}
  sha256 ${JSON.stringify(sha256)}
  license "Apache-2.0"
  version ${JSON.stringify(version)}

  depends_on arch: :arm64

  def install
    bin.install "buke"
  end

  test do
    system "#{bin}/buke", "--version"
  end
end
`;

  await mkdir(path.dirname(formulaPath), { recursive: true });
  await writeFile(formulaPath, formula, "utf8");
  console.log(`Wrote ${formulaPath}`);
}

void main();
