import type { ApplicationRepository } from "./contracts.js";
import { getSettings, updateSettings } from "./settings.js";

export function buildSettingsModule(repo: ApplicationRepository) {
  return {
    getSettings() {
      return getSettings(repo);
    },
    updateSettings(input: Parameters<typeof updateSettings>[1]) {
      return updateSettings(repo, input);
    }
  };
}
