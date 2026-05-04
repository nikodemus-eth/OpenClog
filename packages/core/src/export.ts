import type { JournalDay, JournalEntry } from "./types.js";
import { browserVisibleEntryText, displayProductCopy } from "./display.js";

export function exportDayAsMarkdown(day: JournalDay): string {
  const lines = [`# ${displayProductCopy(day.title)}`, "", day.dateLabel, "", displayProductCopy(day.summary ?? ""), "", "## Timeline"];
  for (const entry of exportEntries(day.entries)) {
    lines.push("", `- ${entry.timestamp} - ${displayProductCopy(entry.title)}${entry.status ? ` (${entry.status})` : ""}`);
    const body = browserVisibleEntryText(entry, { expanded: false }).body;
    if (body) lines.push(`  ${displayProductCopy(body)}`);
  }
  return `${lines.join("\n")}\n`;
}

export function exportDayAsHtml(day: JournalDay): string {
  const entries = exportEntries(day.entries).map(renderEntry).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(displayProductCopy(day.title))}</title></head><body><article><h1>${escapeHtml(displayProductCopy(day.title))}</h1><p>${escapeHtml(day.dateLabel)}</p><p>${escapeHtml(displayProductCopy(day.summary ?? ""))}</p><ol>${entries}</ol></article></body></html>`;
}

function renderEntry(entry: JournalEntry): string {
  return `<li><time>${escapeHtml(entry.timestamp)}</time><strong>${escapeHtml(displayProductCopy(entry.title))}</strong><p>${escapeHtml(displayProductCopy(browserVisibleEntryText(entry, { expanded: false }).body))}</p></li>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function exportEntries(entries: JournalEntry[]): JournalEntry[] {
  const result: JournalEntry[] = [];
  let index = 0;
  while (index < entries.length) {
    const entry = entries[index];
    if (!isStructuredEmptyAssistantEntry(entry)) {
      result.push(entry);
      index += 1;
      continue;
    }

    const run = [entry];
    let nextIndex = index + 1;
    while (nextIndex < entries.length && isStructuredEmptyAssistantEntry(entries[nextIndex])) {
      run.push(entries[nextIndex]);
      nextIndex += 1;
    }

    result.push({
      ...entry,
      id: `export-collapsed-${entry.id}`,
      body:
        run.length === 1
          ? "Structured OpenClaw response omitted from export because it carried no browser-visible text body."
          : `${run.length} structured OpenClaw responses omitted from export because they carried no browser-visible text body.`
    });
    index = nextIndex;
  }
  return result;
}

function isStructuredEmptyAssistantEntry(entry: JournalEntry): boolean {
  return entry.kind === "assistant_message" && entry.source === "openclaw" && (!entry.body || entry.body.trim() === "");
}
