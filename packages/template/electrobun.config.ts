import type { ElectrobunConfig } from "electrobun";

const macIcon = "__ICON_MAC__";
const winIcon = "__ICON_WIN__";
const linuxIcon = "__ICON_LINUX__";

export default {
  app: {
    name: "__APP_NAME__",
    identifier: "__APP_ID__",
    version: "0.2.3",
  },
  build: {
    bun: {
      entrypoint: "src/bun/index.ts",
      minify: true,
      sourcemap: "none",
    },
    useAsar: true,
    asarUnpack: [
      "*.node",
      "*.dll",
      "*.dylib",
      "*.so",
      "buke.config.json",
      "inject/*.css",
      "inject/*.js",
    ],
    macos: {
      bundleCEF: false,
    },
    win: {
      bundleCEF: false,
      ...(winIcon ? { icon: winIcon } : {}),
    },
    linux: {
      bundleCEF: false,
      ...(linuxIcon ? { icon: linuxIcon } : {}),
    },
    ...(macIcon ? { mac: { icons: macIcon } } : {}),
    copy: {
      "src/views/index.html": "views/main/index.html",
      "src/views/styles.css": "views/main/styles.css",
      "src/views/inject-preload.js": "views/main/inject-preload.js",
      "buke.config.json": "buke.config.json",
      "inject/custom.css": "inject/custom.css",
      "inject/custom.js": "inject/custom.js",
      assets: "assets",
    },
  },
  scripts: {
    postPackage: "scripts/optimize-package.ts",
  },
  runtime: {
    exitOnLastWindowClosed: false,
  },
} satisfies ElectrobunConfig;
