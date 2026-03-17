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
  console.log(`
Buke CLI v${VERSION}

Usage:
  buke init <url> [--name <AppName>] [--out <dir>] [--id <bundleId>]
  buke pack <url> [options]
  buke pack --config <file> [--env dev|canary|stable] [--force]
  buke dev [--cwd <dir>]
  buke build [--cwd <dir>] [--env dev|canary|stable]
  buke doctor [--fix]

Options:
  -n, --name           App display name
  -o, --out            Output directory
  -i, --id             Bundle identifier (e.g. com.example.app)
  -p, --partition      Webview session partition
  -w, --width          Initial window width
  -H, --height         Initial window height
  --min-width          Minimum window width
  --min-height         Minimum window height
  --show-title-bar     Show window title bar
  --hide-title-bar     Hide window title bar
  --fullscreen         Launch app in fullscreen
  --maximized          Launch app maximized
  --always-on-top      Keep window above all others
  --title <string>     Override window title
  --dark-mode          Force dark color scheme in webview
  --start-to-tray      Start hidden (requires --show-system-tray)
  --debug              Enable verbose logging and auto-open DevTools
  --zoom <number>      Zoom level (0.5-2.0 or 50-200)
  -I, --icon           App icon path or URL
  --show-system-tray   Enable system tray
  --system-tray-icon   Tray icon path or URL
  --hide-on-close      Close button minimizes to tray
  --user-agent         Override user agent (JS)
  --proxy-url          Proxy URL (HTTP/HTTPS)
  -s, --safe-top       macOS safe-area top padding
  --safe-left          macOS safe-area left padding
  --safe-right         macOS safe-area right padding
  --safe-bottom        macOS safe-area bottom padding
  --safe-off           Disable macOS safe-area padding

Navigation & Instance:
  --force-internal-navigation  Redirect all navigations into main webview
  --internal-url-regex <pat>   Regex for URLs to keep in-app
  --disabled-web-shortcuts     Block Ctrl/Cmd shortcuts on web page
  --incognito                  Use non-persisting session
  --activation-shortcut <key>  Global shortcut to toggle visibility
  --new-window                 Allow popup windows for auth flows
  --multi-instance             Allow multiple app instances

Build & Distribution:
  --app-version <ver>  Application version string
  --install            Install app after build (macOS: /Applications)
  --iterative-build    Skip DMG/installer, app bundle only
  --config             Use pack config JSON
  --refresh-builder    Recreate cached builder workspace
  --offline            Require warm builder cache
  --fix                Remove invalid cache entries during doctor
  -t, --template       Template directory override
  -c, --cwd            Run command in target directory
  -e, --env            Build env for release channel
  --force              Overwrite existing output directory

Runtime:
  --enable-drag-drop   Enable file drag and drop support
  --paste-plain-text   Force paste as plain text
  --ignore-certificate-errors  Ignore TLS certificate errors
  --wasm               Enable WebAssembly CORS isolation
  --camera             Request camera permission (macOS)
  --microphone         Request microphone permission (macOS)
  --multi-window       Enable multi-window support via menu

CLI:
  --use-local-file     Package a local HTML file
  -h, --help           Show help
  -v, --version        Show version
`);
}
