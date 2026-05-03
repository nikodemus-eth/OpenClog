import { themeIds, type AgentActivity, type ApprovalView, type JournalDay, type ThemeId } from "@openclog/core";

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

export async function fetchSettings(): Promise<{ showToolCalls: boolean; theme: string }> {
  const result = await fetchJson<{ settings: { showToolCalls?: boolean; theme?: string } }>("/api/settings");
  return { showToolCalls: result.settings.showToolCalls !== false, theme: result.settings.theme ?? "default" };
}

export async function updateSettings(settings: { showToolCalls?: boolean; theme?: string }): Promise<{ showToolCalls: boolean; theme: string }> {
  const response = await fetch("/api/settings", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(settings)
  });
  if (!response.ok) throw new Error("Settings update failed");
  const result = (await response.json()) as { settings?: { showToolCalls?: boolean; theme?: string } };
  return { showToolCalls: result.settings?.showToolCalls !== false, theme: result.settings?.theme ?? "default" };
}

export async function fetchSessions(dayKey: string): Promise<AgentActivity[]> {
  const result = await fetchJson<{ agents: AgentActivity[] }>(`/api/sessions?dayKey=${encodeURIComponent(dayKey)}`);
  return result.agents;
}

export async function fetchApprovals(): Promise<ApprovalView[]> {
  const result = await fetchJson<{ approvals: ApprovalView[] }>("/api/approvals");
  return result.approvals;
}

export async function resolveApproval(id: string, decision: "allow-once" | "deny"): Promise<void> {
  const response = await fetch(`/api/approvals/${encodeURIComponent(id)}/resolve`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ decision })
  });
  if (!response.ok) throw new Error("Approval resolution failed");
}

export async function sendComposer(text: string): Promise<{ day?: JournalDay | null; mode?: string; body?: string; message?: string; sessionKey?: string }> {
  const response = await fetch("/api/composer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text })
  });
  const json = (await response.json()) as { day?: JournalDay | null; mode?: string; body?: string; message?: string; sessionKey?: string };
  if (!response.ok) throw new Error(json.message ?? "Composer failed");
  return json;
}

export async function exportDay(dayKey: string, format: "markdown" | "html" = "markdown"): Promise<Blob> {
  const response = await fetch(`/api/days/${encodeURIComponent(dayKey)}/export?format=${format}`);
  if (!response.ok) throw new Error("Export failed");
  return response.blob();
}

export const selectableThemeIds: ThemeId[] = [...themeIds];

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${url}`);
  return (await response.json()) as T;
}
