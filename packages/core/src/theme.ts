export type ThemeId = "default" | "captains-log" | "hearty-tale" | "blackbeards-log";

export interface JournalTheme {
  id: ThemeId;
  name: string;
  palette: {
    appBg: string;
    pageBg: string;
    panelBg: string;
    cardBg: string;
    text: string;
    mutedText: string;
    border: string;
    accent: string;
    accent2: string;
    success: string;
    warning: string;
    danger: string;
  };
  labels: {
    appTitle: string;
    archiveTitle: string;
    diagnosticsTitle: string;
    quickControlsTitle: string;
    todayTitle: string;
    newNote: string;
    startSession: string;
    exportDay: string;
    endSession: string;
    composerPrompt: string;
  };
  safety: {
    alwaysShow: string[];
  };
}

const alwaysShowSafety = [
  "errors",
  "pending_approvals",
  "stale_gateway_state",
  "blocked_auth",
  "degraded_connectivity"
];

export const themeIds = ["default", "captains-log", "hearty-tale", "blackbeards-log"] as const;

const themes: Record<ThemeId, JournalTheme> = {
  default: {
    id: "default",
    name: "OpenClaw Journal",
    palette: {
      appBg: "#f4f0e8",
      pageBg: "#fffaf0",
      panelBg: "#ede7da",
      cardBg: "#ffffff",
      text: "#1d2520",
      mutedText: "#657068",
      border: "#c8d5c5",
      accent: "#2f7d59",
      accent2: "#6f8f7a",
      success: "#257a4a",
      warning: "#a86c16",
      danger: "#b3261e"
    },
    labels: {
      appTitle: "OpenClaw Journal",
      archiveTitle: "Day Archive",
      diagnosticsTitle: "Diagnostics & Controls",
      quickControlsTitle: "Quick Controls",
      todayTitle: "OpenClaw Journal",
      newNote: "New Note",
      startSession: "Start Session",
      exportDay: "Export Day",
      endSession: "End Session",
      composerPrompt: "What should we write about?"
    },
    safety: { alwaysShow: alwaysShowSafety }
  },
  "captains-log": {
    id: "captains-log",
    name: "Captain's Log",
    palette: {
      appBg: "#05070a",
      pageBg: "#0b0d12",
      panelBg: "#080a0f",
      cardBg: "#10131b",
      text: "#f2e8dc",
      mutedText: "#a9a0b5",
      border: "#c26a2e",
      accent: "#f28a3a",
      accent2: "#a37acc",
      success: "#9bd66f",
      warning: "#f4c542",
      danger: "#ff5b5b"
    },
    labels: {
      appTitle: "OpenClaw",
      archiveTitle: "Captain's Log Archive",
      diagnosticsTitle: "Bridge Diagnostics",
      quickControlsTitle: "Command Controls",
      todayTitle: "Captain's Log",
      newNote: "New Entry",
      startSession: "Start Session",
      exportDay: "Export Stardate",
      endSession: "Stand Down",
      composerPrompt: "Enter command or query."
    },
    safety: { alwaysShow: alwaysShowSafety }
  },
  "hearty-tale": {
    id: "hearty-tale",
    name: "A Hearty Tale",
    palette: {
      appBg: "#2d2117",
      pageBg: "#f2e4c6",
      panelBg: "#513827",
      cardBg: "#fff4d7",
      text: "#2b2118",
      mutedText: "#705f4a",
      border: "#9a6a2f",
      accent: "#5d7d47",
      accent2: "#8e3f2a",
      success: "#547d35",
      warning: "#a66a1d",
      danger: "#a5352b"
    },
    labels: {
      appTitle: "A Hearty Tale",
      archiveTitle: "Chapters",
      diagnosticsTitle: "Keeper's Tools",
      quickControlsTitle: "Chapter Controls",
      todayTitle: "Chronicle",
      newNote: "Add Marginalia",
      startSession: "Begin Quest",
      exportDay: "Export Chapter",
      endSession: "Close Chapter",
      composerPrompt: "What shall be written in today's tale?"
    },
    safety: { alwaysShow: alwaysShowSafety }
  },
  "blackbeards-log": {
    id: "blackbeards-log",
    name: "Blackbeard's Log",
    palette: {
      appBg: "#17120d",
      pageBg: "#e8d6b1",
      panelBg: "#2a1b13",
      cardBg: "#f7e7c3",
      text: "#20170f",
      mutedText: "#69543a",
      border: "#9b6b36",
      accent: "#be7b2d",
      accent2: "#2f6f78",
      success: "#476f3a",
      warning: "#b9781d",
      danger: "#9d2f24"
    },
    labels: {
      appTitle: "Blackbeard's Log",
      archiveTitle: "Ship's Log Archive",
      diagnosticsTitle: "Navigation & Ship Status",
      quickControlsTitle: "Tools Chest",
      todayTitle: "Blackbeard's Log",
      newNote: "New Entry",
      startSession: "Set Sail",
      exportDay: "Export Log",
      endSession: "Drop Anchor",
      composerPrompt: "What shall we write in the log today, Captain?"
    },
    safety: { alwaysShow: alwaysShowSafety }
  }
};

export function getTheme(id: ThemeId): JournalTheme {
  return themes[id];
}

export function getThemes(): JournalTheme[] {
  return themeIds.map((id) => themes[id]);
}

