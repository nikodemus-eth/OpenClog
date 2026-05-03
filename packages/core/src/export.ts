import type { JournalDay, JournalEntry } from "./types.js";
import { displayProductCopy } from "./display.js";

export function exportDayAsMarkdown(day: JournalDay): string {
  const lines = [`# ${displayProductCopy(day.title)}`, "", day.dateLabel, "", displayProductCopy(day.summary ?? ""), "", "## Timeline"];
  for (const entry of day.entries) {
    lines.push("", `- ${entry.timestamp} - ${displayProductCopy(entry.title)}${entry.status ? ` (${entry.status})` : ""}`);
    if (entry.body) lines.push(`  ${displayProductCopy(entry.body)}`);
  }
  return `${lines.join("\n")}\n`;
}

export function exportDayAsHtml(day: JournalDay): string {
  const entries = day.entries.map(renderEntry).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(displayProductCopy(day.title))}</title></head><body><article><h1>${escapeHtml(displayProductCopy(day.title))}</h1><p>${escapeHtml(day.dateLabel)}</p><p>${escapeHtml(displayProductCopy(day.summary ?? ""))}</p><ol>${entries}</ol></article></body></html>`;
}

function renderEntry(entry: JournalEntry): string {
  return `<li><time>${escapeHtml(entry.timestamp)}</time><strong>${escapeHtml(displayProductCopy(entry.title))}</strong><p>${escapeHtml(displayProductCopy(entry.body ?? ""))}</p></li>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
