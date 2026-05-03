import { describe, expect, test } from "vitest";
import {
  getTheme,
  getThemes,
  resolveThemeId,
  themeAssetRegistry,
  themeGroups,
  themeIds,
  type ThemeId
} from "../src/index.js";

const requiredSafetySurfaces = [
  "errors",
  "pending_approvals",
  "stale_gateway_state",
  "blocked_auth",
  "degraded_connectivity",
  "security_warnings"
];

const expectedThemeIds = [
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
] as const satisfies readonly ThemeId[];

const coreLifecycleThemes = new Set<ThemeId>(["openclog-journal", "captains-log", "accessibility", "accessibility-dark", "low-stimulus", "large-print", "keyboard-first"]);
const stableLifecycleThemes = new Set<ThemeId>(["a-hearty-tale", "blackbeards-log", "clog-news", "the-clog-street-journal", "cloginal"]);
const summaryDiagnosticsThemes = new Set<ThemeId>(["accessibility", "accessibility-dark", "low-stimulus", "large-print", "dyslexia-friendly", "keyboard-first", "cloginal"]);

const expectedUseCases: Record<ThemeId, string> = {
  "openclog-journal": "daily-journal",
  "captains-log": "operations",
  accessibility: "accessibility",
  "a-hearty-tale": "daily-journal",
  "blackbeards-log": "daily-journal",
  "clog-news": "news-monitoring",
  "the-clog-street-journal": "market-analysis",
  cloggit: "social-feed",
  clogdos: "desktop-shell",
  clogos: "desktop-shell",
  clogbuntu: "desktop-shell",
  cloginal: "terminal",
  "accessibility-dark": "accessibility",
  "low-stimulus": "accessibility",
  "large-print": "accessibility",
  "clog-news-network": "news-monitoring",
  "clog-net": "news-monitoring",
  clogdot: "news-monitoring",
  clogspace: "social-feed",
  clogbook: "social-feed",
  instaclog: "social-feed",
  "x-clog": "social-feed",
  clogsky: "social-feed",
  clogeads: "social-feed",
  cloggyos: "desktop-shell",
  "dyslexia-friendly": "accessibility",
  "keyboard-first": "accessibility"
};

const expectedTimelineModes: Record<ThemeId, string> = {
  "openclog-journal": "cards",
  "captains-log": "cards",
  accessibility: "cards",
  "a-hearty-tale": "cards",
  "blackbeards-log": "cards",
  "clog-news": "headline",
  "the-clog-street-journal": "ledger",
  cloggit: "threaded",
  clogdos: "cards",
  clogos: "cards",
  clogbuntu: "cards",
  cloginal: "terminal",
  "accessibility-dark": "cards",
  "low-stimulus": "cards",
  "large-print": "large-print",
  "clog-news-network": "headline",
  "clog-net": "cards",
  clogdot: "compact-feed",
  clogspace: "cards",
  clogbook: "compact-feed",
  instaclog: "cards",
  "x-clog": "compact-feed",
  clogsky: "threaded",
  clogeads: "threaded",
  cloggyos: "cards",
  "dyslexia-friendly": "cards",
  "keyboard-first": "cards"
};

const requiredLabels: Record<ThemeId, { archiveTitle: string; diagnosticsTitle: string; mainTitle: string; name: string; prompt: string; subtitle?: string }> = {
  "openclog-journal": {
    name: "OpenClog Journal",
    archiveTitle: "Day Archive",
    diagnosticsTitle: "Diagnostics & Controls",
    mainTitle: "OpenClog Journal",
    prompt: "What should we write about?"
  },
  "captains-log": {
    name: "Captain's Log",
    archiveTitle: "Captain's Log Archive",
    diagnosticsTitle: "Bridge Diagnostics",
    mainTitle: "Captain's Log",
    prompt: "Enter command or query."
  },
  accessibility: {
    name: "Accessibility Light",
    archiveTitle: "Day Archive",
    diagnosticsTitle: "Accessible Diagnostics",
    mainTitle: "OpenClog Journal",
    prompt: "What should we write about?",
    subtitle: "Accessible Mode"
  },
  "a-hearty-tale": {
    name: "A Hearty Tale",
    archiveTitle: "Chapters",
    diagnosticsTitle: "Keeper's Tools",
    mainTitle: "Chronicle",
    prompt: "What shall be written in today's tale?"
  },
  "blackbeards-log": {
    name: "Blackbeard's Log",
    archiveTitle: "Ship's Log Archive",
    diagnosticsTitle: "Navigation & Ship Status",
    mainTitle: "Blackbeard's Log",
    prompt: "What shall we write in the log today, Captain?"
  },
  "clog-news": { name: "Clog News", archiveTitle: "News Archive", diagnosticsTitle: "Newsroom Diagnostics", mainTitle: "Clog News", prompt: "What should go on the wire?" },
  "clog-news-network": { name: "Clog News Network", archiveTitle: "Control Room Archive", diagnosticsTitle: "Broadcast Diagnostics", mainTitle: "Clog News Network", prompt: "What should the desk track?" },
  "the-clog-street-journal": { name: "The Clog Street Journal", archiveTitle: "Market Archive", diagnosticsTitle: "Market Diagnostics", mainTitle: "The Clog Street Journal", prompt: "What should enter the ledger?" },
  "clog-net": { name: "Clog-Net", archiveTitle: "Review Archive", diagnosticsTitle: "Tech Desk Diagnostics", mainTitle: "Clog-Net", prompt: "What should we review or track?" },
  clogdot: { name: "ClogDot", archiveTitle: "Node Archive", diagnosticsTitle: "Wire Diagnostics", mainTitle: "ClogDot", prompt: "What should hit the feed?" },
  cloggit: { name: "Cloggit", archiveTitle: "Thread Archive", diagnosticsTitle: "Community Diagnostics", mainTitle: "Cloggit", prompt: "What should we post to the thread?" },
  clogspace: { name: "Clogspace", archiveTitle: "Profile Archive", diagnosticsTitle: "Community Status", mainTitle: "Clogspace", prompt: "What's new on your page?" },
  clogbook: { name: "Clogbook", archiveTitle: "Day Feed", diagnosticsTitle: "Feed Diagnostics", mainTitle: "Clogbook", prompt: "What's on the OpenClog feed?" },
  instaclog: { name: "InstaClog", archiveTitle: "Story Archive", diagnosticsTitle: "Feed Diagnostics", mainTitle: "InstaClog", prompt: "What should we frame today?" },
  "x-clog": { name: "X-Clog", archiveTitle: "Post Archive", diagnosticsTitle: "Timeline Diagnostics", mainTitle: "X-Clog", prompt: "What should go on the timeline?" },
  clogsky: { name: "ClogSky", archiveTitle: "Sky Archive", diagnosticsTitle: "Network Diagnostics", mainTitle: "ClogSky", prompt: "What should drift into view?" },
  clogeads: { name: "Clogeads", archiveTitle: "Thread Archive", diagnosticsTitle: "Thread Diagnostics", mainTitle: "Clogeads", prompt: "What should start a thread?" },
  clogdos: { name: "Clogdos", archiveTitle: "Workspace Archive", diagnosticsTitle: "System Diagnostics", mainTitle: "Clogdos", prompt: "What should we file or run?" },
  clogos: { name: "Clogos", archiveTitle: "Desktop Archive", diagnosticsTitle: "App Diagnostics", mainTitle: "Clogos", prompt: "What should OpenClog capture?" },
  clogbuntu: { name: "Clogbuntu", archiveTitle: "Workspace Archive", diagnosticsTitle: "Package Diagnostics", mainTitle: "Clogbuntu", prompt: "What should we log from the workspace?" },
  cloggyos: { name: "CloggyOS", archiveTitle: "Retro Archive", diagnosticsTitle: "Desktop Status", mainTitle: "CloggyOS", prompt: "What should the desktop remember?" },
  cloginal: { name: "Cloginal", archiveTitle: "Terminal Archive", diagnosticsTitle: "TTY Diagnostics", mainTitle: "Cloginal", prompt: "Enter log input." },
  "accessibility-dark": { name: "Accessibility Dark", archiveTitle: "Day Archive", diagnosticsTitle: "Accessible Diagnostics", mainTitle: "OpenClog Journal", prompt: "What should we write about?", subtitle: "Accessible Dark Mode" },
  "low-stimulus": { name: "Low Stimulus", archiveTitle: "Day Archive", diagnosticsTitle: "Calm Diagnostics", mainTitle: "OpenClog Journal", prompt: "What should we write about?", subtitle: "Low Stimulus Mode" },
  "large-print": { name: "Large Print", archiveTitle: "Day Archive", diagnosticsTitle: "Large Print Diagnostics", mainTitle: "OpenClog Journal", prompt: "What should we write about?", subtitle: "Large Print Mode" },
  "dyslexia-friendly": { name: "Dyslexia Friendly", archiveTitle: "Day Archive", diagnosticsTitle: "Readable Diagnostics", mainTitle: "OpenClog Journal", prompt: "What should we write about?", subtitle: "Dyslexia Friendly Mode" },
  "keyboard-first": { name: "Keyboard First", archiveTitle: "Day Archive", diagnosticsTitle: "Keyboard Diagnostics", mainTitle: "OpenClog Journal", prompt: "What should we write about?", subtitle: "Keyboard First Mode" }
};

describe("OpenClog theme contract", () => {
  test("exposes canonical theme ids, family groups, and centralized aliases", () => {
    expect(themeIds).toEqual(expectedThemeIds);
    expect(resolveThemeId("default")).toBe("openclog-journal");
    expect(resolveThemeId("hearty-tale")).toBe("a-hearty-tale");
    expect(resolveThemeId("accessibility-light")).toBe("accessibility");
    expect(resolveThemeId("captains-log")).toBe("captains-log");
    expect(resolveThemeId("unknown-theme")).toBe("openclog-journal");
    expect(getThemes()).toHaveLength(27);
    expect(themeGroups.map((group) => group.label)).toEqual(["Core", "News / Media", "Social / Community", "OS / Desktop", "Accessibility"]);
  });

  test("every theme has required metadata, labels, status tokens, motifs, and safety surfaces", () => {
    for (const themeId of themeIds) {
      const theme = getTheme(themeId);
      const labels = requiredLabels[themeId];
      expect(theme.label).toBe(labels.name);
      expect(theme.displayName).toBe(labels.name);
      expect(theme.labels.productTitle).toBe("OpenClog");
      expect(theme.labels.productSubtitle).toBe(labels.subtitle);
      expect(theme.labels.archiveTitle).toBe(labels.archiveTitle);
      expect(theme.labels.diagnosticsTitle).toBe(labels.diagnosticsTitle);
      expect(theme.labels.mainTitle).toBe(labels.mainTitle);
      expect(theme.labels.composerPrompt).toBe(labels.prompt);
      expect(theme.labels.themeLabel).toBe(theme.displayName);
      expect(theme.labels.exportDay).toBe("Export day");
      expect(theme.labels.send).toBe("Send");
      expect(theme.labels.selectedDayStatus.length).toBeGreaterThan(0);
      expect(theme.safety.alwaysShow).toEqual(requiredSafetySurfaces);
      expect(Object.keys(theme.status).sort()).toEqual(["danger", "info", "success", "warning"]);
      expect(theme.focus.ring).toMatch(/^#/);
      expect(theme.focus.width).toMatch(/px$/);
      expect(theme.palette.text).toMatch(/^#/);
      expect(theme.background.kind).toMatch(/^(none|css|svg)$/);
      expect(theme.family).toMatch(/^(core|news-media|social-community|os-desktop|accessibility)$/);
      expect(theme.density).toMatch(/^(comfortable|compact|accessible)$/);
      expect(theme.cardStyle).toMatch(/^(plain|console|publication|feed|desktop|terminal|parchment|map|accessible)$/);
      expect(theme.diagnosticsStyle).toMatch(/^(plain|broadcast|market|community|desktop|terminal|accessible)$/);
      expect(theme.timelineStyle).toMatch(/^(journal|console|ticker|ledger|thread|feed|desktop|terminal|map|chapter|accessible)$/);
      expect(theme.accessibilityProfile).toMatch(/^(standard|high-contrast-light|high-contrast-dark|low-stimulus|large-print|dyslexia-friendly|keyboard-first)$/);
      expect(theme.motionProfile).toMatch(/^(standard|reduced|minimal)$/);
      expect(theme.lifecycle).toMatch(/^(core|stable|experimental|deprecated)$/);
      expect(theme.useCase).toBe(expectedUseCases[themeId]);
      expect(theme.timelineLayoutMode).toBe(expectedTimelineModes[themeId]);
      expect(theme.diagnosticsDensity).toBe(themeId === "clog-news-network" ? "expanded" : summaryDiagnosticsThemes.has(themeId) ? "summary" : "standard");
      expect(theme.lifecycle).toBe(coreLifecycleThemes.has(themeId) ? "core" : stableLifecycleThemes.has(themeId) ? "stable" : "experimental");
      expect(theme.motifs.frame).toMatch(/^(plain|console|book|nautical|publication|feed|desktop|terminal)$/);
      if (theme.background.asset) expect(themeAssetRegistry[theme.background.asset]).toBeDefined();
    }
  });

  test.each(["accessibility", "accessibility-dark", "low-stimulus", "large-print", "dyslexia-friendly", "keyboard-first"] as const)(
    "%s preserves accessibility guarantees and contrast sanity",
    (themeId) => {
      const theme = getTheme(themeId);

      expect(theme.accessibility.disableDecorativeBackgrounds).toBe(true);
      expect(theme.accessibility.reducedMotion).toBe(true);
      expect(theme.accessibility.iconsWithText).toBe(true);
      expect(theme.layout.density).toBe("accessible");
      expect(Number.parseInt(theme.spacing.controlMinHeight, 10)).toBeGreaterThanOrEqual(44);
      expect(contrastRatio(theme.palette.text, theme.palette.pageBg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(theme.palette.text, theme.palette.cardBg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(theme.status.warning, theme.palette.cardBg)).toBeGreaterThanOrEqual(3);
    }
  );

  test("theme asset registry stays local and generic", () => {
    for (const [assetId, asset] of Object.entries(themeAssetRegistry)) {
      expect(assetId).toMatch(/^[a-z0-9-]+$/);
      expect(asset.href).toMatch(/^..\/assets\/backgrounds\/[a-z0-9-]+\.svg$/);
      expect(asset.href).not.toMatch(/https?:|data:|brand|logo|trademark/i);
      expect(asset.description).toMatch(/style|texture|surface|background|pattern|shell|publication|feed|terminal|accessibility/i);
      expect(asset.description).not.toMatch(/cnn|wall street|reddit|facebook|instagram|twitter|x\.com|bluesky|threads|windows|macos|ubuntu|apple|microsoft|canonical/i);
    }
  });
});

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex: string): number {
  const [red, green, blue] = hexToRgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16)) as [number, number, number];
}
