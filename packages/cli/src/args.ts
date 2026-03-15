import { SHORT_FLAGS, VERSION } from "./constants";

export type Flags = Record<string, string | boolean>;

export function parseArgs(args: string[]) {
  const flags: Flags = {};
  const positionals: string[] = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--") {
      positionals.push(...args.slice(i + 1));
      break;
    }
    if (arg.startsWith("--")) {
      const [rawKey, rawValue] = arg.slice(2).split("=");
      if (rawValue !== undefined) {
        flags[rawKey] = rawValue;
      } else {
        const next = args[i + 1];
        if (next && !next.startsWith("-")) {
          flags[rawKey] = next;
          i += 1;
        } else {
          flags[rawKey] = true;
        }
      }
      continue;
    }
    if (arg.startsWith("-") && arg.length === 2) {
      const key = SHORT_FLAGS[arg[1]] ?? arg[1];
      const next = args[i + 1];
      if (next && !next.startsWith("-") && key !== "help" && key !== "version") {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
      continue;
    }
    positionals.push(arg);
  }

  return { flags, positionals };
}

export function printHelp() {
  console.log(`\nBuke CLI v${VERSION}\n\nUsage:\n  buke init <url> [--name <AppName>] [--out <dir>] [--id <bundleId>]\n  buke pack <url> [--name <AppName>] [--out <dir>] [--id <bundleId>] [--env dev|canary|stable] [--force]\n  buke pack --config <file> [--env dev|canary|stable] [--force]\n  buke dev [--cwd <dir>]\n  buke build [--cwd <dir>] [--env dev|canary|stable]\n  buke doctor [--fix]\n\nOptions:\n  -n, --name           App display name\n  -o, --out            Output directory\n  -i, --id             Bundle identifier (e.g. com.example.app)\n  -p, --partition      Webview session partition\n  -w, --width          Initial window width\n  -H, --height         Initial window height\n  --min-width          Minimum window width\n  --min-height         Minimum window height\n  --show-title-bar     Show window title bar\n  --hide-title-bar     Hide window title bar\n  --fullscreen         Launch app in fullscreen\n  --maximized          Launch app maximized\n  -I, --icon           App icon path or URL\n  --show-system-tray   Enable system tray\n  --system-tray-icon   Tray icon path or URL\n  --hide-on-close      Close button minimizes to tray\n  --user-agent         Override user agent (JS)\n  --proxy-url          Proxy URL (HTTP/HTTPS)\n  -s, --safe-top       macOS safe-area top padding\n  --safe-left          macOS safe-area left padding\n  --safe-right         macOS safe-area right padding\n  --safe-bottom        macOS safe-area bottom padding\n  --safe-off           Disable macOS safe-area padding\n  --config             Use pack config JSON\n  --refresh-builder    Recreate the cached builder workspace before packaging\n  --offline            Require a warm builder cache and skip cache hydration\n  --fix                Remove invalid cache entries during doctor\n  -t, --template       Template directory override\n  -c, --cwd            Run command in target directory\n  -e, --env            Build env for release channel\n  --force              Overwrite existing output directory\n  -h, --help           Show help\n  -v, --version        Show version\n`);
}
