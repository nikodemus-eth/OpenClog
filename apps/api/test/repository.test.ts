import { afterEach, describe, expect, test } from "vitest";
import { createSqliteRepository } from "../src/repository.js";
import { journalTableNames } from "../src/schema.js";
import { sampleJournalDay, toPersistableRedactedEvent, type JournalDay } from "@openclog/core";

describe("SQLite repository", () => {
  const repos: Array<{ close: () => void }> = [];

  afterEach(() => {
    while (repos.length > 0) repos.pop()?.close();
  });

  test("creates required tables and idempotently stores redacted events", () => {
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);
    const event = toPersistableRedactedEvent({ event: "session.message", payload: { text: "token=abc" } });

    repo.upsertDay(sampleJournalDay);
    repo.storeRedactedEvent("entry-1", event);
    repo.storeRedactedEvent("entry-1", event);

    expect(repo.getDay(sampleJournalDay.dayKey)?.entries.length).toBe(sampleJournalDay.entries.length);
    expect(repo.countRedactedEvents()).toBe(1);
    expect(repo.listTables()).toEqual([...journalTableNames]);
  });

  test("lists day summaries, returns null for missing days, and creates notes on the requested date", () => {
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);

    const entry = repo.addNote("follow up on approvals", new Date("2026-05-03T08:15:00.000Z"));
    const days = repo.listDays();

    expect(entry.dayKey).toBe("2026-05-03");
    expect(repo.getDay("does-not-exist")).toBeNull();
    expect(repo.getDay("2026-05-03")).toMatchObject({
      dayKey: "2026-05-03",
      entries: [expect.objectContaining({ body: "follow up on approvals", kind: "note" })]
    });
    expect(days.map((day) => day.dayKey)).toEqual(["2026-05-03", sampleJournalDay.dayKey]);
  });

  test("persists sparse day and entry fields without inventing raw data", () => {
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);
    const sparseDay: JournalDay = {
      dayKey: "2026-05-04",
      title: "Sparse journal day",
      dateLabel: "Monday, May 4, 2026",
      entries: [
        {
          id: "sparse-entry",
          dayKey: "2026-05-04",
          source: "system",
          kind: "summary",
          title: "No payload fields",
          timestamp: "2026-05-04T12:00:00.000Z",
          redacted: false
        }
      ],
      metrics: { sessionCount: 0, messageCount: 0, toolCallCount: 0, approvalCount: 0, errorCount: 0 }
    };

    repo.addAudit("journal.checked", {});
    repo.upsertDay(sparseDay);

    expect(repo.getDay("2026-05-04")).toMatchObject({
      summary: undefined,
      entries: [expect.objectContaining({ id: "sparse-entry", redacted: false })]
    });
    expect(repo.listDays().find((day) => day.dayKey === "2026-05-04")).toMatchObject({ summary: undefined });
  });
});
