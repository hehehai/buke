export type AppPreset = {
  url: string;
  name: string;
  config?: Record<string, unknown>;
};

const PRESETS: Record<string, AppPreset> = {
  deepseek: {
    url: "https://chat.deepseek.com/",
    name: "DeepSeek",
  },
  chatgpt: {
    url: "https://chatgpt.com/",
    name: "ChatGPT",
  },
  claude: {
    url: "https://claude.ai/",
    name: "Claude",
  },
  twitter: {
    url: "https://x.com/",
    name: "Twitter",
    config: {
      allowlist: ["abs.twimg.com", "pbs.twimg.com", "video.twimg.com"],
    },
  },
  x: {
    url: "https://x.com/",
    name: "X",
    config: {
      allowlist: ["abs.twimg.com", "pbs.twimg.com", "video.twimg.com"],
    },
  },
  youtube: {
    url: "https://www.youtube.com/",
    name: "YouTube",
    config: {
      allowlist: ["accounts.google.com"],
    },
  },
  github: {
    url: "https://github.com/",
    name: "GitHub",
    config: {
      allowlist: ["github.githubassets.com", "*.githubusercontent.com"],
    },
  },
  notion: {
    url: "https://www.notion.so/",
    name: "Notion",
    config: {
      allowlist: ["accounts.google.com"],
    },
  },
  whatsapp: {
    url: "https://web.whatsapp.com/",
    name: "WhatsApp",
  },
  discord: {
    url: "https://discord.com/app",
    name: "Discord",
  },
  spotify: {
    url: "https://open.spotify.com/",
    name: "Spotify",
  },
  reddit: {
    url: "https://www.reddit.com/",
    name: "Reddit",
    config: {
      allowlist: ["accounts.google.com"],
    },
  },
  "google-maps": {
    url: "https://maps.google.com/",
    name: "Google Maps",
    config: {
      allowlist: ["accounts.google.com"],
    },
  },
  "google-translate": {
    url: "https://translate.google.com/",
    name: "Google Translate",
    config: {
      allowlist: ["accounts.google.com"],
    },
  },
  figma: {
    url: "https://www.figma.com/",
    name: "Figma",
    config: {
      allowlist: ["accounts.google.com"],
    },
  },
  poe: {
    url: "https://poe.com/",
    name: "Poe",
    config: {
      allowlist: ["accounts.google.com"],
    },
  },
  kimi: {
    url: "https://kimi.moonshot.cn/",
    name: "Kimi",
  },
  excalidraw: {
    url: "https://excalidraw.com/",
    name: "Excalidraw",
  },
  "hacker-news": {
    url: "https://news.ycombinator.com/",
    name: "Hacker News",
  },
};

export function resolvePreset(input: string): AppPreset | null {
  const key = input.toLowerCase().trim();
  return PRESETS[key] ?? null;
}

export function listPresetNames(): string[] {
  return Object.keys(PRESETS).sort();
}
