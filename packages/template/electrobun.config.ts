import type { ElectrobunConfig } from "electrobun";

const macIcon = "__ICON_MAC__";
const winIcon = "__ICON_WIN__";
const linuxIcon = "__ICON_LINUX__";

export default {
  app: {
    name: "__APP_NAME__",
    identifier: "__APP_ID__",
    version: "0.1.0"
  },
  build: {
    bun: {
      entrypoint: "src/bun/index.ts"
    },
    ...(macIcon ? { mac: { icons: macIcon } } : {}),
    ...(winIcon ? { win: { icon: winIcon } } : {}),
    ...(linuxIcon ? { linux: { icon: linuxIcon } } : {}),
    copy: {
      "src/views/index.html": "views/main/index.html",
      "src/views/styles.css": "views/main/styles.css",
      "src/bun/libMacWindowEffects.dylib": "bun/libMacWindowEffects.dylib",
      "buke.config.json": "buke.config.json",
      "inject/custom.css": "inject/custom.css",
      "inject/custom.js": "inject/custom.js",
      assets: "assets"
    }
  },
  runtime: {
    exitOnLastWindowClosed: false
  }
} satisfies ElectrobunConfig;
