import { describe, expect, test, vi } from "vitest";
import { createSqliteRepository } from "../src/repository.js";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(() => {
    throw new Error("git unavailable");
  })
}));

describe("app utility helpers", async () => {
  const { buildIncidentSnapshot, buildVersionInfo } = await import("../src/app.js");

  test("falls back to unknown commit sha when git metadata is unavailable", () => {
    const info = buildVersionInfo();

    expect(info.version).toBeTypeOf("string");
    expect(info.commitSha).toBe("unknown");
    expect(info.buildTimestamp).toBeTypeOf("string");
  });

  test("builds incident snapshots from fallback day data and stored suggestions", () => {
    const repo = createSqliteRepository(":memory:");
    repo.saveIncident({
      id: "incident-1",
      title: "Stored incident",
      summary: "Stored summary",
      dayKeys: ["2026-05-02"],
      entryIds: ["entry-1"],
      createdAt: "2026-05-04T12:00:00.000Z",
      runbookSuggestions: [{ id: "stored-suggestion", title: "Stored", summary: "Stored summary", reason: "Stored reason" }]
    });

    const snapshot = buildIncidentSnapshot(repo, "missing-day", [], undefined);

    expect(snapshot).toMatchObject({
      id: "incident-missing-day-snapshot",
      title: "Incident snapshot for Saturday, May 2, 2026",
      entryIds: [],
      runbookSuggestions: [expect.objectContaining({ id: "stored-suggestion" })]
    });
    repo.close();
  });
});
