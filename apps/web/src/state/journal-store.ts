import { createStore } from "zustand/vanilla";
import { getTheme, type ThemeId } from "@openclog/core";

export interface GatewayUiState {
  status: "ready" | "blocked" | "degraded";
  missingScopes: string[];
  stale: boolean;
}

export interface JournalUiState {
  gateway: GatewayUiState;
  themeId: ThemeId;
  visibleSafetySurfaces: string[];
  setGatewayStatus: (gateway: GatewayUiState) => void;
  setTheme: (themeId: ThemeId) => void;
}

export function createJournalStore() {
  return createStore<JournalUiState>((set) => ({
    gateway: { status: "degraded", missingScopes: ["operator.approvals"], stale: true },
    themeId: "openclog-journal",
    visibleSafetySurfaces: [...getTheme("openclog-journal").safety.alwaysShow],
    setGatewayStatus: (gateway) => set({ gateway }),
    setTheme: (themeId) => set({ themeId, visibleSafetySurfaces: [...getTheme(themeId).safety.alwaysShow] })
  }));
}
