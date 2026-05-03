import { browserVisibleEntryText, type JournalEntry } from "@openclog/core";

export function timelineDisplayText(entry: JournalEntry, expanded: boolean) {
  return browserVisibleEntryText(entry, { expanded });
}
