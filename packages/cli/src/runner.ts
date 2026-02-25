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

export async function runBunInstall(
  cwd: string,
  options: { production?: boolean } = {}
) {
  const args = ["bun", "install", "--no-cache", "--no-progress"];
  if (options.production) {
    args.push("--production");
  }

  const proc = Bun.spawn(args, {
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
