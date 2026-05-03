import type { JournalDay, ThemeId } from "@openclog/core";

export interface HealthResponse {
  ok: boolean;
  gateway: {
    status: "ready" | "blocked" | "degraded";
    role: string;
    scopes: string[];
    missingScopes: string[];
    stale: boolean;
  };
}

export async function fetchHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>("/api/health");
}

export async function fetchDays(): Promise<Array<Omit<JournalDay, "entries">>> {
  const result = await fetchJson<{ days: Array<Omit<JournalDay, "entries">> }>("/api/days");
  return result.days;
}

export async function fetchDay(dayKey: string): Promise<JournalDay> {
  const result = await fetchJson<{ day: JournalDay }>(`/api/days/${encodeURIComponent(dayKey)}`);
  return result.day;
}

export async function sendComposer(text: string): Promise<{ mode?: string; body?: string; message?: string }> {
  const response = await fetch("/api/composer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text })
  });
  const json = (await response.json()) as { mode?: string; body?: string; message?: string };
  if (!response.ok) throw new Error(json.message ?? "Composer failed");
  return json;
}

export async function exportDay(dayKey: string, format: "markdown" | "html" = "markdown"): Promise<Blob> {
  const response = await fetch(`/api/days/${encodeURIComponent(dayKey)}/export?format=${format}`);
  if (!response.ok) throw new Error("Export failed");
  return response.blob();
}

export const selectableThemeIds: ThemeId[] = ["default", "captains-log", "hearty-tale", "blackbeards-log"];

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${url}`);
  return (await response.json()) as T;
}

