export async function runBunScript(cwd: string, script: string) {
  const proc = Bun.spawn(["bun", "run", script], {
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit"
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

export async function runBunInstall(cwd: string) {
  const proc = Bun.spawn(["bun", "install", "--no-cache", "--no-progress"], {
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit"
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}
