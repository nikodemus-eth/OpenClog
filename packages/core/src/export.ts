import type { JournalDay, JournalEntry } from "./types.js";

export function exportDayAsMarkdown(day: JournalDay): string {
  const lines = [`# ${day.title}`, "", day.dateLabel, "", day.summary ?? "", "", "## Timeline"];
  for (const entry of day.entries) {
    lines.push("", `- ${entry.timestamp} - ${entry.title}${entry.status ? ` (${entry.status})` : ""}`);
    if (entry.body) lines.push(`  ${entry.body}`);
  }
  return `${lines.join("\n")}\n`;
}

export function exportDayAsHtml(day: JournalDay): string {
  const entries = day.entries.map(renderEntry).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(day.title)}</title></head><body><article><h1>${escapeHtml(day.title)}</h1><p>${escapeHtml(day.dateLabel)}</p><p>${escapeHtml(day.summary ?? "")}</p><ol>${entries}</ol></article></body></html>`;
}

function renderEntry(entry: JournalEntry): string {
  return `<li><time>${escapeHtml(entry.timestamp)}</time><strong>${escapeHtml(entry.title)}</strong><p>${escapeHtml(entry.body ?? "")}</p></li>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

