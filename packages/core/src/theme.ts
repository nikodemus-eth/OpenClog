export const themeIds = [
  "openclog-journal",
  "captains-log",
  "accessibility",
  "a-hearty-tale",
  "blackbeards-log",
  "clog-news",
  "the-clog-street-journal",
  "cloggit",
  "clogdos",
  "clogos",
  "clogbuntu",
  "cloginal",
  "accessibility-dark",
  "low-stimulus",
  "large-print",
  "clog-news-network",
  "clog-net",
  "clogdot",
  "clogspace",
  "clogbook",
  "instaclog",
  "x-clog",
  "clogsky",
  "clogeads",
  "cloggyos",
  "dyslexia-friendly",
  "keyboard-first"
] as const;

export type ThemeId = (typeof themeIds)[number];
export type ThemeAlias = "default" | "hearty-tale" | "accessibility-light";
export type ThemeInputId = ThemeId | ThemeAlias | string;
export type ThemeFamily = "core" | "news-media" | "social-community" | "os-desktop" | "accessibility";
export type ThemeDensity = "comfortable" | "compact" | "accessible";
export type CardStyle = "plain" | "console" | "publication" | "feed" | "desktop" | "terminal" | "parchment" | "map" | "accessible";
export type DiagnosticsStyle = "plain" | "broadcast" | "market" | "community" | "desktop" | "terminal" | "accessible";
export type TimelineStyle = "journal" | "console" | "ticker" | "ledger" | "thread" | "feed" | "desktop" | "terminal" | "map" | "chapter" | "accessible";
export type AccessibilityProfile =
  | "standard"
  | "high-contrast-light"
  | "high-contrast-dark"
  | "low-stimulus"
  | "large-print"
  | "dyslexia-friendly"
  | "keyboard-first";
export type MotionProfile = "standard" | "reduced" | "minimal";
export type IconToken =
  | "accessibility"
  | "approval"
  | "book"
  | "chart"
  | "compass"
  | "desktop"
  | "feed"
  | "file"
  | "keyboard"
  | "message"
  | "newspaper"
  | "quill"
  | "radio"
  | "shield"
  | "starship"
  | "terminal"
  | "tool";

export type ThemeBackgroundAssetId = keyof typeof themeAssetRegistry;

export interface OpenClogTheme {
  id: ThemeId;
  label: string;
  displayName: string;
  family: ThemeFamily;
  density: ThemeDensity;
  cardStyle: CardStyle;
  diagnosticsStyle: DiagnosticsStyle;
  timelineStyle: TimelineStyle;
  accessibilityProfile: AccessibilityProfile;
  motionProfile: MotionProfile;
  labels: {
    productTitle: string;
    productSubtitle?: string;
    archiveTitle: string;
    diagnosticsTitle: string;
    mainTitle: string;
    composerPrompt: string;
    themeLabel: string;
    exportDay: string;
    send: string;
    selectedDayStatus: string;
    statusFooter?: string;
  };
  palette: {
    appBg: string;
    pageBg: string;
    panelBg: string;
    cardBg: string;
    text: string;
    mutedText: string;
    inverseText: string;
    border: string;
    borderStrong: string;
    accent: string;
    accent2: string;
    surfaceScrim: string;
    shadowColor: string;
  };
  typography: {
    body: string;
    display: string;
    mono?: string;
    labelTransform?: "none" | "uppercase";
  };
  spacing: {
    shellGap: string;
    panelPadding: string;
    cardPadding: string;
    controlMinHeight: string;
  };
  layout: {
    density: ThemeDensity;
    cardMinHeight?: string;
  };
  radius: {
    panel: string;
    card: string;
    control: string;
    pill: string;
  };
  shadows: {
    panel: string;
    card: string;
  };
  borders: {
    panel: string;
    card: string;
    active: string;
  };
  focus: {
    ring: string;
    width: string;
    offset: string;
  };
  status: {
    success: string;
    info: string;
    warning: string;
    danger: string;
  };
  icons: {
    brand: IconToken;
    gateway: IconToken;
    activity: IconToken;
    tools: IconToken;
    approvals: IconToken;
    timeline: IconToken;
  };
  background: {
    kind: "none" | "css" | "svg";
    asset?: ThemeBackgroundAssetId;
    overlay?: string;
    opacity?: number;
    panelScrim?: string;
  };
  panel: {
    surface: "paper" | "console" | "high-contrast" | "parchment" | "map" | "publication" | "feed" | "desktop" | "terminal";
    textureOpacity: number;
  };
  motifs: {
    frame: "plain" | "console" | "book" | "nautical" | "publication" | "feed" | "desktop" | "terminal";
    divider: "line" | "console" | "flourish" | "map" | "ticker" | "thread" | "window" | "terminal";
    selectedCard: "plain" | "console" | "chapter" | "ship-log" | "headline" | "thread" | "window" | "terminal";
  };
  accessibility: {
    disableDecorativeBackgrounds: boolean;
    reducedMotion: boolean;
    iconsWithText: boolean;
    highContrast: boolean;
  };
  safety: {
    alwaysShow: string[];
  };
}

export type Theme = OpenClogTheme;

type ThemeFoundation = Omit<OpenClogTheme, "id" | "label" | "displayName" | "family" | "labels"> & {
  labels: Omit<OpenClogTheme["labels"], "archiveTitle" | "diagnosticsTitle" | "mainTitle" | "composerPrompt" | "themeLabel">;
};

type ThemeOverlay = Partial<Omit<OpenClogTheme, "id" | "label" | "displayName" | "family" | "labels">> & {
  labels?: Partial<OpenClogTheme["labels"]>;
};

type ThemeSeedLabels = Pick<OpenClogTheme["labels"], "archiveTitle" | "diagnosticsTitle" | "mainTitle" | "composerPrompt"> &
  Partial<OpenClogTheme["labels"]>;

type ThemeSeed = {
  id: ThemeId;
  label: string;
  family: ThemeFamily;
  accessibilityOverlay?: keyof typeof accessibilityOverlays;
  labels: ThemeSeedLabels;
} & Omit<ThemeOverlay, "labels">;

const alwaysShowSafety = [
  "errors",
  "pending_approvals",
  "stale_gateway_state",
  "blocked_auth",
  "degraded_connectivity",
  "security_warnings"
];

export const themeAliases = {
  default: "openclog-journal",
  "hearty-tale": "a-hearty-tale",
  "accessibility-light": "accessibility"
} as const satisfies Record<ThemeAlias, ThemeId>;

export const themeAssetRegistry = {
  "journal-paper": {
    href: "../assets/backgrounds/journal-paper.svg",
    description: "paper texture style background"
  },
  "command-console": {
    href: "../assets/backgrounds/command-console.svg",
    description: "retro command console style background"
  },
  "manuscript-surface": {
    href: "../assets/backgrounds/manuscript-surface.svg",
    description: "manuscript surface texture background"
  },
  "map-table": {
    href: "../assets/backgrounds/map-table.svg",
    description: "map table texture background"
  },
  "news-media": {
    href: "../assets/backgrounds/news-media.svg",
    description: "broadcast control style background"
  },
  "publication-sheet": {
    href: "../assets/backgrounds/publication-sheet.svg",
    description: "financial publication surface background"
  },
  "social-feed": {
    href: "../assets/backgrounds/social-feed.svg",
    description: "social feed pattern background"
  },
  "desktop-shell": {
    href: "../assets/backgrounds/desktop-shell.svg",
    description: "desktop shell panel background"
  },
  "terminal-grid": {
    href: "../assets/backgrounds/terminal-grid.svg",
    description: "terminal grid pattern background"
  },
  "accessibility-calm": {
    href: "../assets/backgrounds/accessibility-calm.svg",
    description: "accessibility calm surface background"
  }
} as const;

const coreTypography = {
  body: "Inter, ui-sans-serif, system-ui, sans-serif",
  display: "Georgia, ui-serif, serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  labelTransform: "none"
} as const;

const foundation: ThemeFoundation = {
  density: "comfortable",
  cardStyle: "plain",
  diagnosticsStyle: "plain",
  timelineStyle: "journal",
  accessibilityProfile: "standard",
  motionProfile: "standard",
  labels: {
    productTitle: "OpenClog",
    exportDay: "Export day",
    send: "Send",
    selectedDayStatus: "Selected day"
  },
  palette: {
    appBg: "#ece5d6",
    pageBg: "#fbf6ea",
    panelBg: "#e8deca",
    cardBg: "#fffdf7",
    text: "#1e2520",
    mutedText: "#667167",
    inverseText: "#ffffff",
    border: "#c6d1bf",
    borderStrong: "#2f7d59",
    accent: "#2f7d59",
    accent2: "#836f42",
    surfaceScrim: "rgba(255, 253, 247, 0.94)",
    shadowColor: "rgba(39, 52, 42, 0.16)"
  },
  typography: coreTypography,
  spacing: { shellGap: "1px", panelPadding: "22px", cardPadding: "16px", controlMinHeight: "42px" },
  layout: { density: "comfortable", cardMinHeight: "78px" },
  radius: { panel: "8px", card: "8px", control: "8px", pill: "999px" },
  shadows: { panel: "0 16px 40px var(--shadow-color)", card: "0 8px 22px var(--shadow-color)" },
  borders: { panel: "1px solid var(--border)", card: "1px solid var(--border)", active: "2px solid var(--accent)" },
  focus: { ring: "#1f6feb", width: "3px", offset: "3px" },
  status: { success: "#257a4a", info: "#2f5e8f", warning: "#8d5c0f", danger: "#b3261e" },
  icons: { brand: "book", gateway: "shield", activity: "radio", tools: "tool", approvals: "approval", timeline: "file" },
  background: { kind: "svg", asset: "journal-paper", overlay: "rgba(251, 246, 234, 0.72)", opacity: 0.45, panelScrim: "rgba(255, 253, 247, 0.92)" },
  panel: { surface: "paper", textureOpacity: 0.2 },
  motifs: { frame: "plain", divider: "line", selectedCard: "plain" },
  accessibility: { disableDecorativeBackgrounds: false, reducedMotion: false, iconsWithText: true, highContrast: false },
  safety: { alwaysShow: alwaysShowSafety }
};

export const familyPresets = {
  core: foundation,
  "news-media": mergeFoundation(foundation, {
    cardStyle: "publication",
    diagnosticsStyle: "broadcast",
    timelineStyle: "ticker",
    palette: {
      appBg: "#111827",
      pageBg: "#f8fafc",
      panelBg: "#0b1220",
      cardBg: "#ffffff",
      text: "#101828",
      mutedText: "#475467",
      inverseText: "#ffffff",
      border: "#cbd5e1",
      borderStrong: "#be123c",
      accent: "#be123c",
      accent2: "#0f3a63",
      surfaceScrim: "rgba(255, 255, 255, 0.95)",
      shadowColor: "rgba(15, 23, 42, 0.22)"
    },
    typography: { ...coreTypography, display: "Georgia, ui-serif, serif", labelTransform: "uppercase" },
    icons: { brand: "newspaper", gateway: "shield", activity: "radio", tools: "tool", approvals: "approval", timeline: "newspaper" },
    background: { kind: "svg", asset: "news-media", overlay: "rgba(15, 23, 42, 0.32)", opacity: 0.46, panelScrim: "rgba(11, 18, 32, 0.92)" },
    panel: { surface: "publication", textureOpacity: 0.2 },
    motifs: { frame: "publication", divider: "ticker", selectedCard: "headline" },
    status: { success: "#16794c", info: "#155e75", warning: "#9a5b00", danger: "#b42318" }
  }),
  "social-community": mergeFoundation(foundation, {
    cardStyle: "feed",
    diagnosticsStyle: "community",
    timelineStyle: "thread",
    palette: {
      appBg: "#ecf3ff",
      pageBg: "#ffffff",
      panelBg: "#f1f6ff",
      cardBg: "#ffffff",
      text: "#172033",
      mutedText: "#526070",
      inverseText: "#ffffff",
      border: "#c9d6e8",
      borderStrong: "#2f6fed",
      accent: "#2f6fed",
      accent2: "#ff7a1a",
      surfaceScrim: "rgba(255, 255, 255, 0.96)",
      shadowColor: "rgba(33, 48, 72, 0.15)"
    },
    typography: { ...coreTypography, display: "Inter, ui-sans-serif, system-ui, sans-serif" },
    icons: { brand: "message", gateway: "shield", activity: "feed", tools: "tool", approvals: "approval", timeline: "message" },
    background: { kind: "svg", asset: "social-feed", overlay: "rgba(236, 243, 255, 0.68)", opacity: 0.42, panelScrim: "rgba(241, 246, 255, 0.95)" },
    panel: { surface: "feed", textureOpacity: 0.18 },
    motifs: { frame: "feed", divider: "thread", selectedCard: "thread" },
    status: { success: "#16834c", info: "#2167c8", warning: "#956100", danger: "#b3261e" }
  }),
  "os-desktop": mergeFoundation(foundation, {
    cardStyle: "desktop",
    diagnosticsStyle: "desktop",
    timelineStyle: "desktop",
    palette: {
      appBg: "#d7e2f2",
      pageBg: "#f7f9fc",
      panelBg: "#e7edf6",
      cardBg: "#ffffff",
      text: "#172033",
      mutedText: "#4d5b6e",
      inverseText: "#ffffff",
      border: "#9fb1c8",
      borderStrong: "#3566b8",
      accent: "#3566b8",
      accent2: "#c65f21",
      surfaceScrim: "rgba(247, 249, 252, 0.96)",
      shadowColor: "rgba(23, 32, 51, 0.2)"
    },
    typography: { ...coreTypography, display: "Inter, ui-sans-serif, system-ui, sans-serif" },
    icons: { brand: "desktop", gateway: "shield", activity: "radio", tools: "tool", approvals: "approval", timeline: "file" },
    background: { kind: "svg", asset: "desktop-shell", overlay: "rgba(215, 226, 242, 0.58)", opacity: 0.48, panelScrim: "rgba(231, 237, 246, 0.94)" },
    panel: { surface: "desktop", textureOpacity: 0.16 },
    motifs: { frame: "desktop", divider: "window", selectedCard: "window" },
    status: { success: "#197a4f", info: "#285ea8", warning: "#8b5a00", danger: "#b42318" }
  }),
  accessibility: mergeFoundation(foundation, {
    density: "accessible",
    cardStyle: "accessible",
    diagnosticsStyle: "accessible",
    timelineStyle: "accessible",
    accessibilityProfile: "high-contrast-light",
    motionProfile: "reduced",
    palette: {
      appBg: "#06111f",
      pageBg: "#ffffff",
      panelBg: "#f5f8ff",
      cardBg: "#ffffff",
      text: "#06111f",
      mutedText: "#263f5f",
      inverseText: "#ffffff",
      border: "#334e73",
      borderStrong: "#003b73",
      accent: "#004f9e",
      accent2: "#5c2e91",
      surfaceScrim: "rgba(255, 255, 255, 1)",
      shadowColor: "rgba(0, 0, 0, 0.18)"
    },
    typography: {
      body: "Atkinson Hyperlegible, Inter, ui-sans-serif, system-ui, sans-serif",
      display: "Atkinson Hyperlegible, Inter, ui-sans-serif, system-ui, sans-serif",
      mono: coreTypography.mono,
      labelTransform: "none"
    },
    spacing: { shellGap: "3px", panelPadding: "28px", cardPadding: "20px", controlMinHeight: "48px" },
    layout: { density: "accessible", cardMinHeight: "104px" },
    radius: { panel: "6px", card: "6px", control: "6px", pill: "6px" },
    shadows: { panel: "none", card: "none" },
    borders: { panel: "2px solid var(--border)", card: "2px solid var(--border)", active: "3px solid var(--accent)" },
    focus: { ring: "#ffbf00", width: "4px", offset: "4px" },
    status: { success: "#0b6b2b", info: "#004f9e", warning: "#8a5200", danger: "#b00020" },
    icons: { brand: "accessibility", gateway: "shield", activity: "radio", tools: "tool", approvals: "approval", timeline: "file" },
    background: { kind: "none", overlay: "transparent", opacity: 0, panelScrim: "rgba(255, 255, 255, 1)" },
    panel: { surface: "high-contrast", textureOpacity: 0 },
    motifs: { frame: "plain", divider: "line", selectedCard: "plain" },
    accessibility: { disableDecorativeBackgrounds: true, reducedMotion: true, iconsWithText: true, highContrast: true }
  })
} as const satisfies Record<ThemeFamily, ThemeFoundation>;

export const accessibilityOverlays = {
  "high-contrast-dark": {
    accessibilityProfile: "high-contrast-dark",
    motionProfile: "reduced",
    palette: {
      appBg: "#000000",
      pageBg: "#05070a",
      panelBg: "#0b1220",
      cardBg: "#111827",
      text: "#ffffff",
      mutedText: "#d1e3ff",
      inverseText: "#000000",
      border: "#f8fafc",
      borderStrong: "#ffdf70",
      accent: "#ffdf70",
      accent2: "#7dd3fc",
      surfaceScrim: "rgba(5, 7, 10, 1)",
      shadowColor: "rgba(0, 0, 0, 0.72)"
    },
    status: { success: "#86efac", info: "#93c5fd", warning: "#facc15", danger: "#fca5a5" },
    focus: { ring: "#ffffff", width: "4px", offset: "4px" },
    background: { kind: "none", overlay: "transparent", opacity: 0, panelScrim: "rgba(11, 18, 32, 1)" },
    accessibility: { disableDecorativeBackgrounds: true, reducedMotion: true, iconsWithText: true, highContrast: true }
  },
  "low-stimulus": {
    accessibilityProfile: "low-stimulus",
    motionProfile: "minimal",
    palette: {
      appBg: "#eef2f1",
      pageBg: "#fbfdfc",
      panelBg: "#edf3f1",
      cardBg: "#ffffff",
      text: "#10201d",
      mutedText: "#405651",
      inverseText: "#ffffff",
      border: "#b8cac4",
      borderStrong: "#47645d",
      accent: "#47645d",
      accent2: "#5f6f8f",
      surfaceScrim: "rgba(251, 253, 252, 1)",
      shadowColor: "rgba(16, 32, 29, 0.08)"
    },
    shadows: { panel: "none", card: "none" },
    background: { kind: "none", overlay: "transparent", opacity: 0, panelScrim: "rgba(237, 243, 241, 1)" },
    accessibility: { disableDecorativeBackgrounds: true, reducedMotion: true, iconsWithText: true, highContrast: true }
  },
  "large-print": {
    accessibilityProfile: "large-print",
    motionProfile: "reduced",
    spacing: { shellGap: "4px", panelPadding: "32px", cardPadding: "24px", controlMinHeight: "54px" },
    layout: { density: "accessible", cardMinHeight: "116px" },
    typography: {
      body: "Atkinson Hyperlegible, Inter, ui-sans-serif, system-ui, sans-serif",
      display: "Atkinson Hyperlegible, Inter, ui-sans-serif, system-ui, sans-serif",
      mono: coreTypography.mono,
      labelTransform: "none"
    },
    focus: { ring: "#ffbf00", width: "5px", offset: "4px" },
    background: { kind: "none", overlay: "transparent", opacity: 0, panelScrim: "rgba(255, 255, 255, 1)" },
    accessibility: { disableDecorativeBackgrounds: true, reducedMotion: true, iconsWithText: true, highContrast: true }
  },
  "dyslexia-friendly": {
    accessibilityProfile: "dyslexia-friendly",
    motionProfile: "reduced",
    typography: {
      body: "Atkinson Hyperlegible, Verdana, Tahoma, ui-sans-serif, system-ui, sans-serif",
      display: "Atkinson Hyperlegible, Verdana, Tahoma, ui-sans-serif, system-ui, sans-serif",
      mono: coreTypography.mono,
      labelTransform: "none"
    },
    spacing: { shellGap: "3px", panelPadding: "30px", cardPadding: "22px", controlMinHeight: "50px" },
    background: { kind: "none", overlay: "transparent", opacity: 0, panelScrim: "rgba(255, 255, 255, 1)" },
    accessibility: { disableDecorativeBackgrounds: true, reducedMotion: true, iconsWithText: true, highContrast: true }
  },
  "keyboard-first": {
    accessibilityProfile: "keyboard-first",
    motionProfile: "minimal",
    focus: { ring: "#ffbf00", width: "5px", offset: "5px" },
    borders: { panel: "2px solid var(--border)", card: "2px solid var(--border)", active: "4px solid var(--accent)" },
    background: { kind: "none", overlay: "transparent", opacity: 0, panelScrim: "rgba(255, 255, 255, 1)" },
    accessibility: { disableDecorativeBackgrounds: true, reducedMotion: true, iconsWithText: true, highContrast: true }
  }
} as const satisfies Record<string, ThemeOverlay>;

const emptyOverlay: ThemeOverlay = {};

const themeSeeds = [
  defineTheme({
    id: "openclog-journal",
    label: "OpenClog Journal",
    family: "core",
    labels: {
      archiveTitle: "Day Archive",
      diagnosticsTitle: "Diagnostics & Controls",
      mainTitle: "OpenClog Journal",
      composerPrompt: "What should we write about?"
    }
  }),
  defineTheme({
    id: "captains-log",
    label: "Captain's Log",
    family: "core",
    density: "comfortable",
    cardStyle: "console",
    diagnosticsStyle: "plain",
    timelineStyle: "console",
    labels: {
      archiveTitle: "Captain's Log Archive",
      diagnosticsTitle: "Bridge Diagnostics",
      mainTitle: "Captain's Log",
      composerPrompt: "Enter command or query.",
      selectedDayStatus: "Active log day",
      statusFooter: "Log systems nominal"
    },
    palette: {
      appBg: "#04070d",
      pageBg: "#0b1020",
      panelBg: "#080b14",
      cardBg: "#121827",
      text: "#fff2df",
      mutedText: "#c4b8d8",
      inverseText: "#111018",
      border: "#9f6438",
      borderStrong: "#ff9f45",
      accent: "#f28a3a",
      accent2: "#a37acc",
      surfaceScrim: "rgba(18, 24, 39, 0.9)",
      shadowColor: "rgba(0, 0, 0, 0.48)"
    },
    typography: { ...coreTypography, display: "Inter, ui-sans-serif, system-ui, sans-serif", labelTransform: "uppercase" },
    spacing: { shellGap: "2px", panelPadding: "24px", cardPadding: "18px", controlMinHeight: "44px" },
    layout: { density: "comfortable", cardMinHeight: "88px" },
    shadows: { panel: "0 22px 54px var(--shadow-color)", card: "0 14px 32px var(--shadow-color)" },
    focus: { ring: "#ffd166", width: "3px", offset: "3px" },
    status: { success: "#9bd66f", info: "#9fc5ff", warning: "#f4c542", danger: "#ff6b6b" },
    icons: { brand: "starship", gateway: "shield", activity: "radio", tools: "tool", approvals: "approval", timeline: "file" },
    background: { kind: "svg", asset: "command-console", overlay: "rgba(4, 7, 13, 0.68)", opacity: 0.62, panelScrim: "rgba(8, 11, 20, 0.88)" },
    panel: { surface: "console", textureOpacity: 0.35 },
    motifs: { frame: "console", divider: "console", selectedCard: "console" }
  }),
  defineTheme({
    id: "accessibility",
    label: "Accessibility Light",
    family: "accessibility",
    labels: {
      productSubtitle: "Accessible Mode",
      archiveTitle: "Day Archive",
      diagnosticsTitle: "Accessible Diagnostics",
      mainTitle: "OpenClog Journal",
      composerPrompt: "What should we write about?"
    }
  }),
  defineTheme({
    id: "a-hearty-tale",
    label: "A Hearty Tale",
    family: "core",
    cardStyle: "parchment",
    diagnosticsStyle: "plain",
    timelineStyle: "chapter",
    labels: {
      archiveTitle: "Chapters",
      diagnosticsTitle: "Keeper's Tools",
      mainTitle: "Chronicle",
      composerPrompt: "What shall be written in today's tale?",
      selectedDayStatus: "Current chapter"
    },
    palette: {
      appBg: "#2c1f15",
      pageBg: "#f3e1bc",
      panelBg: "#4b321f",
      cardBg: "#fff1cf",
      text: "#2a1c12",
      mutedText: "#624b33",
      inverseText: "#fff8e8",
      border: "#8a5d2c",
      borderStrong: "#5d7d47",
      accent: "#5d7d47",
      accent2: "#9a3f2b",
      surfaceScrim: "rgba(255, 241, 207, 0.92)",
      shadowColor: "rgba(42, 28, 18, 0.28)"
    },
    spacing: { shellGap: "2px", panelPadding: "24px", cardPadding: "18px", controlMinHeight: "44px" },
    layout: { density: "comfortable", cardMinHeight: "92px" },
    icons: { brand: "quill", gateway: "shield", activity: "radio", tools: "tool", approvals: "approval", timeline: "quill" },
    background: { kind: "svg", asset: "manuscript-surface", overlay: "rgba(44, 31, 21, 0.34)", opacity: 0.5, panelScrim: "rgba(75, 50, 31, 0.9)" },
    panel: { surface: "parchment", textureOpacity: 0.34 },
    motifs: { frame: "book", divider: "flourish", selectedCard: "chapter" },
    status: { success: "#547d35", info: "#315f8a", warning: "#935800", danger: "#a5352b" }
  }),
  defineTheme({
    id: "blackbeards-log",
    label: "Blackbeard's Log",
    family: "core",
    cardStyle: "map",
    diagnosticsStyle: "plain",
    timelineStyle: "map",
    labels: {
      archiveTitle: "Ship's Log Archive",
      diagnosticsTitle: "Navigation & Ship Status",
      mainTitle: "Blackbeard's Log",
      composerPrompt: "What shall we write in the log today, Captain?",
      selectedDayStatus: "Current ship's log"
    },
    palette: {
      appBg: "#17110c",
      pageBg: "#e8d3aa",
      panelBg: "#26170f",
      cardBg: "#f7e2b9",
      text: "#21160d",
      mutedText: "#5f4931",
      inverseText: "#fff1d3",
      border: "#8a6335",
      borderStrong: "#be7b2d",
      accent: "#be7b2d",
      accent2: "#246c75",
      surfaceScrim: "rgba(247, 226, 185, 0.92)",
      shadowColor: "rgba(23, 17, 12, 0.34)"
    },
    spacing: { shellGap: "2px", panelPadding: "24px", cardPadding: "18px", controlMinHeight: "44px" },
    layout: { density: "comfortable", cardMinHeight: "92px" },
    radius: { panel: "8px", card: "6px", control: "8px", pill: "999px" },
    icons: { brand: "compass", gateway: "shield", activity: "radio", tools: "tool", approvals: "approval", timeline: "compass" },
    background: { kind: "svg", asset: "map-table", overlay: "rgba(23, 17, 12, 0.28)", opacity: 0.56, panelScrim: "rgba(38, 23, 15, 0.9)" },
    panel: { surface: "map", textureOpacity: 0.36 },
    motifs: { frame: "nautical", divider: "map", selectedCard: "ship-log" },
    status: { success: "#476f3a", info: "#246c75", warning: "#915c00", danger: "#9d2f24" }
  }),
  defineTheme({
    id: "clog-news",
    label: "Clog News",
    family: "news-media",
    labels: {
      archiveTitle: "News Archive",
      diagnosticsTitle: "Newsroom Diagnostics",
      mainTitle: "Clog News",
      composerPrompt: "What should go on the wire?",
      selectedDayStatus: "Lead story"
    }
  }),
  defineTheme({
    id: "the-clog-street-journal",
    label: "The Clog Street Journal",
    family: "news-media",
    diagnosticsStyle: "market",
    timelineStyle: "ledger",
    labels: {
      archiveTitle: "Market Archive",
      diagnosticsTitle: "Market Diagnostics",
      mainTitle: "The Clog Street Journal",
      composerPrompt: "What should enter the ledger?",
      selectedDayStatus: "Current edition"
    },
    palette: {
      appBg: "#e8e1d2",
      pageBg: "#fbf8f0",
      panelBg: "#ece3d1",
      cardBg: "#fffdf7",
      text: "#161616",
      mutedText: "#4f4f46",
      inverseText: "#ffffff",
      border: "#b7aa92",
      borderStrong: "#24523b",
      accent: "#24523b",
      accent2: "#8a5a18",
      surfaceScrim: "rgba(251, 248, 240, 0.96)",
      shadowColor: "rgba(22, 22, 22, 0.13)"
    },
    typography: { ...coreTypography, display: "Georgia, ui-serif, serif", labelTransform: "none" },
    background: { kind: "svg", asset: "publication-sheet", overlay: "rgba(251, 248, 240, 0.64)", opacity: 0.44, panelScrim: "rgba(236, 227, 209, 0.94)" },
    status: { success: "#24523b", info: "#285c7a", warning: "#7a4f00", danger: "#9a2e20" }
  }),
  defineTheme({
    id: "cloggit",
    label: "Cloggit",
    family: "social-community",
    labels: {
      archiveTitle: "Thread Archive",
      diagnosticsTitle: "Community Diagnostics",
      mainTitle: "Cloggit",
      composerPrompt: "What should we post to the thread?",
      selectedDayStatus: "Active thread"
    },
    palette: {
      appBg: "#fff3e8",
      pageBg: "#fffaf4",
      panelBg: "#fff0df",
      cardBg: "#ffffff",
      text: "#221a14",
      mutedText: "#655449",
      inverseText: "#ffffff",
      border: "#e5c7ae",
      borderStrong: "#e05f1f",
      accent: "#e05f1f",
      accent2: "#2760a8",
      surfaceScrim: "rgba(255, 250, 244, 0.96)",
      shadowColor: "rgba(56, 35, 20, 0.14)"
    }
  }),
  defineTheme({
    id: "clogdos",
    label: "Clogdos",
    family: "os-desktop",
    labels: {
      archiveTitle: "Workspace Archive",
      diagnosticsTitle: "System Diagnostics",
      mainTitle: "Clogdos",
      composerPrompt: "What should we file or run?",
      selectedDayStatus: "Open workspace"
    }
  }),
  defineTheme({
    id: "clogos",
    label: "Clogos",
    family: "os-desktop",
    labels: {
      archiveTitle: "Desktop Archive",
      diagnosticsTitle: "App Diagnostics",
      mainTitle: "Clogos",
      composerPrompt: "What should OpenClog capture?",
      selectedDayStatus: "Active desktop"
    },
    palette: {
      appBg: "#edf2f7",
      pageBg: "#ffffff",
      panelBg: "#f5f7fb",
      cardBg: "#ffffff",
      text: "#111827",
      mutedText: "#566174",
      inverseText: "#ffffff",
      border: "#ccd5e1",
      borderStrong: "#0f62fe",
      accent: "#0f62fe",
      accent2: "#8b5cf6",
      surfaceScrim: "rgba(255, 255, 255, 0.96)",
      shadowColor: "rgba(17, 24, 39, 0.16)"
    }
  }),
  defineTheme({
    id: "clogbuntu",
    label: "Clogbuntu",
    family: "os-desktop",
    labels: {
      archiveTitle: "Workspace Archive",
      diagnosticsTitle: "Package Diagnostics",
      mainTitle: "Clogbuntu",
      composerPrompt: "What should we log from the workspace?",
      selectedDayStatus: "Current workspace"
    },
    palette: {
      appBg: "#2c1230",
      pageBg: "#fff7ef",
      panelBg: "#3a1742",
      cardBg: "#fffaf5",
      text: "#24111f",
      mutedText: "#6b5965",
      inverseText: "#fff7ef",
      border: "#d7b9cf",
      borderStrong: "#dd5f25",
      accent: "#dd5f25",
      accent2: "#5c8d36",
      surfaceScrim: "rgba(255, 247, 239, 0.96)",
      shadowColor: "rgba(44, 18, 48, 0.24)"
    }
  }),
  defineTheme({
    id: "cloginal",
    label: "Cloginal",
    family: "os-desktop",
    density: "compact",
    cardStyle: "terminal",
    diagnosticsStyle: "terminal",
    timelineStyle: "terminal",
    labels: {
      archiveTitle: "Terminal Archive",
      diagnosticsTitle: "TTY Diagnostics",
      mainTitle: "Cloginal",
      composerPrompt: "Enter log input.",
      selectedDayStatus: "Current buffer"
    },
    palette: {
      appBg: "#020403",
      pageBg: "#07110b",
      panelBg: "#030806",
      cardBg: "#0b1a12",
      text: "#d8ffe4",
      mutedText: "#98d9aa",
      inverseText: "#020403",
      border: "#2f6b42",
      borderStrong: "#7dff9a",
      accent: "#7dff9a",
      accent2: "#7dd3fc",
      surfaceScrim: "rgba(7, 17, 11, 0.96)",
      shadowColor: "rgba(0, 0, 0, 0.48)"
    },
    typography: { body: coreTypography.mono, display: coreTypography.mono, mono: coreTypography.mono, labelTransform: "uppercase" },
    spacing: { shellGap: "1px", panelPadding: "18px", cardPadding: "14px", controlMinHeight: "40px" },
    layout: { density: "compact", cardMinHeight: "74px" },
    radius: { panel: "0px", card: "0px", control: "0px", pill: "0px" },
    shadows: { panel: "none", card: "none" },
    borders: { panel: "1px solid var(--border)", card: "1px solid var(--border)", active: "2px solid var(--accent)" },
    background: { kind: "svg", asset: "terminal-grid", overlay: "rgba(2, 4, 3, 0.72)", opacity: 0.62, panelScrim: "rgba(3, 8, 6, 0.94)" },
    panel: { surface: "terminal", textureOpacity: 0.25 },
    motifs: { frame: "terminal", divider: "terminal", selectedCard: "terminal" },
    icons: { brand: "terminal", gateway: "shield", activity: "radio", tools: "tool", approvals: "approval", timeline: "terminal" }
  }),
  defineTheme({
    id: "accessibility-dark",
    label: "Accessibility Dark",
    family: "accessibility",
    accessibilityOverlay: "high-contrast-dark",
    labels: {
      productSubtitle: "Accessible Dark Mode",
      archiveTitle: "Day Archive",
      diagnosticsTitle: "Accessible Diagnostics",
      mainTitle: "OpenClog Journal",
      composerPrompt: "What should we write about?"
    }
  }),
  defineTheme({
    id: "low-stimulus",
    label: "Low Stimulus",
    family: "accessibility",
    accessibilityOverlay: "low-stimulus",
    labels: {
      productSubtitle: "Low Stimulus Mode",
      archiveTitle: "Day Archive",
      diagnosticsTitle: "Calm Diagnostics",
      mainTitle: "OpenClog Journal",
      composerPrompt: "What should we write about?"
    }
  }),
  defineTheme({
    id: "large-print",
    label: "Large Print",
    family: "accessibility",
    accessibilityOverlay: "large-print",
    labels: {
      productSubtitle: "Large Print Mode",
      archiveTitle: "Day Archive",
      diagnosticsTitle: "Large Print Diagnostics",
      mainTitle: "OpenClog Journal",
      composerPrompt: "What should we write about?"
    }
  }),
  defineTheme({
    id: "clog-news-network",
    label: "Clog News Network",
    family: "news-media",
    labels: {
      archiveTitle: "Control Room Archive",
      diagnosticsTitle: "Broadcast Diagnostics",
      mainTitle: "Clog News Network",
      composerPrompt: "What should the desk track?",
      selectedDayStatus: "Live desk"
    },
    palette: {
      appBg: "#050817",
      pageBg: "#0d1428",
      panelBg: "#091021",
      cardBg: "#f8fafc",
      text: "#101828",
      mutedText: "#475467",
      inverseText: "#ffffff",
      border: "#31446b",
      borderStrong: "#ef4444",
      accent: "#ef4444",
      accent2: "#38bdf8",
      surfaceScrim: "rgba(248, 250, 252, 0.94)",
      shadowColor: "rgba(0, 0, 0, 0.42)"
    }
  }),
  defineTheme({
    id: "clog-net",
    label: "Clog-Net",
    family: "news-media",
    labels: {
      archiveTitle: "Review Archive",
      diagnosticsTitle: "Tech Desk Diagnostics",
      mainTitle: "Clog-Net",
      composerPrompt: "What should we review or track?",
      selectedDayStatus: "Featured review"
    },
    palette: {
      appBg: "#081d2b",
      pageBg: "#f2fbff",
      panelBg: "#dff5ff",
      cardBg: "#ffffff",
      text: "#0d2533",
      mutedText: "#426070",
      inverseText: "#ffffff",
      border: "#a8d4e8",
      borderStrong: "#0077a8",
      accent: "#0077a8",
      accent2: "#7c3aed",
      surfaceScrim: "rgba(242, 251, 255, 0.96)",
      shadowColor: "rgba(8, 29, 43, 0.18)"
    }
  }),
  defineTheme({
    id: "clogdot",
    label: "ClogDot",
    family: "news-media",
    density: "compact",
    labels: {
      archiveTitle: "Node Archive",
      diagnosticsTitle: "Wire Diagnostics",
      mainTitle: "ClogDot",
      composerPrompt: "What should hit the feed?",
      selectedDayStatus: "Active node"
    },
    typography: { ...coreTypography, display: coreTypography.mono, mono: coreTypography.mono, labelTransform: "none" },
    spacing: { shellGap: "1px", panelPadding: "18px", cardPadding: "13px", controlMinHeight: "40px" },
    layout: { density: "compact", cardMinHeight: "74px" }
  }),
  defineTheme({
    id: "clogspace",
    label: "Clogspace",
    family: "social-community",
    labels: {
      archiveTitle: "Profile Archive",
      diagnosticsTitle: "Community Status",
      mainTitle: "Clogspace",
      composerPrompt: "What's new on your page?",
      selectedDayStatus: "Profile day"
    },
    palette: {
      appBg: "#1a2458",
      pageBg: "#fff9f0",
      panelBg: "#24306f",
      cardBg: "#ffffff",
      text: "#1e2138",
      mutedText: "#5d647a",
      inverseText: "#fff9f0",
      border: "#d8c1e8",
      borderStrong: "#7c3aed",
      accent: "#7c3aed",
      accent2: "#f59e0b",
      surfaceScrim: "rgba(255, 249, 240, 0.96)",
      shadowColor: "rgba(26, 36, 88, 0.22)"
    }
  }),
  defineTheme({
    id: "clogbook",
    label: "Clogbook",
    family: "social-community",
    labels: {
      archiveTitle: "Day Feed",
      diagnosticsTitle: "Feed Diagnostics",
      mainTitle: "Clogbook",
      composerPrompt: "What's on the OpenClog feed?",
      selectedDayStatus: "Current feed day"
    }
  }),
  defineTheme({
    id: "instaclog",
    label: "InstaClog",
    family: "social-community",
    labels: {
      archiveTitle: "Story Archive",
      diagnosticsTitle: "Feed Diagnostics",
      mainTitle: "InstaClog",
      composerPrompt: "What should we frame today?",
      selectedDayStatus: "Current story"
    },
    palette: {
      appBg: "#2d1b31",
      pageBg: "#fff7fb",
      panelBg: "#ffeaf4",
      cardBg: "#ffffff",
      text: "#271527",
      mutedText: "#6f596d",
      inverseText: "#ffffff",
      border: "#efc5dc",
      borderStrong: "#d94683",
      accent: "#d94683",
      accent2: "#f59e0b",
      surfaceScrim: "rgba(255, 247, 251, 0.96)",
      shadowColor: "rgba(45, 27, 49, 0.18)"
    }
  }),
  defineTheme({
    id: "x-clog",
    label: "X-Clog",
    family: "social-community",
    density: "compact",
    labels: {
      archiveTitle: "Post Archive",
      diagnosticsTitle: "Timeline Diagnostics",
      mainTitle: "X-Clog",
      composerPrompt: "What should go on the timeline?",
      selectedDayStatus: "Current timeline"
    },
    palette: {
      appBg: "#000000",
      pageBg: "#080808",
      panelBg: "#0f0f0f",
      cardBg: "#151515",
      text: "#f5f5f5",
      mutedText: "#c7c7c7",
      inverseText: "#000000",
      border: "#3f3f46",
      borderStrong: "#f5f5f5",
      accent: "#f5f5f5",
      accent2: "#60a5fa",
      surfaceScrim: "rgba(8, 8, 8, 0.96)",
      shadowColor: "rgba(0, 0, 0, 0.5)"
    },
    spacing: { shellGap: "1px", panelPadding: "18px", cardPadding: "14px", controlMinHeight: "40px" },
    layout: { density: "compact", cardMinHeight: "74px" }
  }),
  defineTheme({
    id: "clogsky",
    label: "ClogSky",
    family: "social-community",
    labels: {
      archiveTitle: "Sky Archive",
      diagnosticsTitle: "Network Diagnostics",
      mainTitle: "ClogSky",
      composerPrompt: "What should drift into view?",
      selectedDayStatus: "Current sky"
    },
    palette: {
      appBg: "#e8f5ff",
      pageBg: "#ffffff",
      panelBg: "#eff8ff",
      cardBg: "#ffffff",
      text: "#123047",
      mutedText: "#4f687a",
      inverseText: "#ffffff",
      border: "#b9d8ef",
      borderStrong: "#2485c7",
      accent: "#2485c7",
      accent2: "#5c7cfa",
      surfaceScrim: "rgba(255, 255, 255, 0.96)",
      shadowColor: "rgba(36, 133, 199, 0.14)"
    }
  }),
  defineTheme({
    id: "clogeads",
    label: "Clogeads",
    family: "social-community",
    labels: {
      archiveTitle: "Thread Archive",
      diagnosticsTitle: "Thread Diagnostics",
      mainTitle: "Clogeads",
      composerPrompt: "What should start a thread?",
      selectedDayStatus: "Active thread"
    },
    palette: {
      appBg: "#f5f3ff",
      pageBg: "#ffffff",
      panelBg: "#f1efff",
      cardBg: "#ffffff",
      text: "#231942",
      mutedText: "#5d547a",
      inverseText: "#ffffff",
      border: "#d8d1f0",
      borderStrong: "#6d5bd0",
      accent: "#6d5bd0",
      accent2: "#0f766e",
      surfaceScrim: "rgba(255, 255, 255, 0.96)",
      shadowColor: "rgba(35, 25, 66, 0.14)"
    }
  }),
  defineTheme({
    id: "cloggyos",
    label: "CloggyOS",
    family: "os-desktop",
    labels: {
      archiveTitle: "Retro Archive",
      diagnosticsTitle: "Desktop Status",
      mainTitle: "CloggyOS",
      composerPrompt: "What should the desktop remember?",
      selectedDayStatus: "Current window"
    },
    palette: {
      appBg: "#284b63",
      pageBg: "#f7ede2",
      panelBg: "#f5cac3",
      cardBg: "#ffffff",
      text: "#1b2730",
      mutedText: "#5d6b75",
      inverseText: "#ffffff",
      border: "#84a59d",
      borderStrong: "#f28482",
      accent: "#f28482",
      accent2: "#2a9d8f",
      surfaceScrim: "rgba(247, 237, 226, 0.96)",
      shadowColor: "rgba(40, 75, 99, 0.2)"
    }
  }),
  defineTheme({
    id: "dyslexia-friendly",
    label: "Dyslexia Friendly",
    family: "accessibility",
    accessibilityOverlay: "dyslexia-friendly",
    labels: {
      productSubtitle: "Dyslexia Friendly Mode",
      archiveTitle: "Day Archive",
      diagnosticsTitle: "Readable Diagnostics",
      mainTitle: "OpenClog Journal",
      composerPrompt: "What should we write about?"
    }
  }),
  defineTheme({
    id: "keyboard-first",
    label: "Keyboard First",
    family: "accessibility",
    accessibilityOverlay: "keyboard-first",
    labels: {
      productSubtitle: "Keyboard First Mode",
      archiveTitle: "Day Archive",
      diagnosticsTitle: "Keyboard Diagnostics",
      mainTitle: "OpenClog Journal",
      composerPrompt: "What should we write about?"
    }
  })
] as const satisfies readonly OpenClogTheme[];

const themes = Object.fromEntries(themeSeeds.map((theme) => [theme.id, theme])) as Record<ThemeId, OpenClogTheme>;

export const themeGroups = [
  { label: "Core", family: "core", themeIds: ["openclog-journal", "captains-log", "a-hearty-tale", "blackbeards-log"] },
  { label: "News / Media", family: "news-media", themeIds: ["clog-news", "clog-news-network", "the-clog-street-journal", "clog-net", "clogdot"] },
  { label: "Social / Community", family: "social-community", themeIds: ["cloggit", "clogspace", "clogbook", "instaclog", "x-clog", "clogsky", "clogeads"] },
  { label: "OS / Desktop", family: "os-desktop", themeIds: ["clogdos", "clogos", "clogbuntu", "cloggyos", "cloginal"] },
  { label: "Accessibility", family: "accessibility", themeIds: ["accessibility", "accessibility-dark", "low-stimulus", "large-print", "dyslexia-friendly", "keyboard-first"] }
] as const satisfies readonly { family: ThemeFamily; label: string; themeIds: readonly ThemeId[] }[];

export function resolveThemeId(id: ThemeInputId): ThemeId {
  if (isThemeId(id)) return id;
  if (isThemeAlias(id)) return themeAliases[id];
  return "openclog-journal";
}

export function getTheme(id: ThemeInputId): OpenClogTheme {
  return themes[resolveThemeId(id)];
}

export function getThemes(): OpenClogTheme[] {
  return themeIds.map((id) => themes[id]);
}

export function defineTheme(seed: ThemeSeed): OpenClogTheme {
  const preset = familyPresets[seed.family];
  const overlay: ThemeOverlay = seed.accessibilityOverlay ? accessibilityOverlays[seed.accessibilityOverlay] : emptyOverlay;
  const density = seed.density ?? overlay.density ?? preset.density;
  const label = seed.label;
  const labels: OpenClogTheme["labels"] = {
    ...preset.labels,
    ...overlay.labels,
    ...seed.labels,
    productTitle: "OpenClog",
    themeLabel: label,
    exportDay: "Export day",
    send: "Send"
  };
  return {
    ...preset,
    ...overlay,
    ...seed,
    id: seed.id,
    label,
    displayName: label,
    family: seed.family,
    density,
    labels,
    palette: { ...preset.palette, ...overlay.palette, ...seed.palette },
    typography: { ...preset.typography, ...overlay.typography, ...seed.typography },
    spacing: { ...preset.spacing, ...overlay.spacing, ...seed.spacing },
    layout: { ...preset.layout, ...overlay.layout, ...seed.layout, density },
    radius: { ...preset.radius, ...overlay.radius, ...seed.radius },
    shadows: { ...preset.shadows, ...overlay.shadows, ...seed.shadows },
    borders: { ...preset.borders, ...overlay.borders, ...seed.borders },
    focus: { ...preset.focus, ...overlay.focus, ...seed.focus },
    status: { ...preset.status, ...overlay.status, ...seed.status },
    icons: { ...preset.icons, ...overlay.icons, ...seed.icons },
    background: { ...preset.background, ...overlay.background, ...seed.background },
    panel: { ...preset.panel, ...overlay.panel, ...seed.panel },
    motifs: { ...preset.motifs, ...overlay.motifs, ...seed.motifs },
    accessibility: { ...preset.accessibility, ...overlay.accessibility, ...seed.accessibility },
    safety: { ...preset.safety, ...overlay.safety, ...seed.safety }
  };
}

function mergeFoundation(base: ThemeFoundation, overlay: ThemeOverlay): ThemeFoundation {
  const density = overlay.density ?? base.density;
  return {
    ...base,
    ...overlay,
    density,
    labels: { ...base.labels, ...overlay.labels },
    palette: { ...base.palette, ...overlay.palette },
    typography: { ...base.typography, ...overlay.typography },
    spacing: { ...base.spacing, ...overlay.spacing },
    layout: { ...base.layout, ...overlay.layout, density },
    radius: { ...base.radius, ...overlay.radius },
    shadows: { ...base.shadows, ...overlay.shadows },
    borders: { ...base.borders, ...overlay.borders },
    focus: { ...base.focus, ...overlay.focus },
    status: { ...base.status, ...overlay.status },
    icons: { ...base.icons, ...overlay.icons },
    background: { ...base.background, ...overlay.background },
    panel: { ...base.panel, ...overlay.panel },
    motifs: { ...base.motifs, ...overlay.motifs },
    accessibility: { ...base.accessibility, ...overlay.accessibility },
    safety: { ...base.safety, ...overlay.safety }
  };
}

function isThemeId(id: string): id is ThemeId {
  return (themeIds as readonly string[]).includes(id);
}

function isThemeAlias(id: string): id is ThemeAlias {
  return Object.hasOwn(themeAliases, id);
}
