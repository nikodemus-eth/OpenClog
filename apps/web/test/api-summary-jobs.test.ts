import { afterEach, describe, expect, test, vi } from "vitest";
import type { SummaryJob } from "@openclog/core";
import { acknowledgeAttentionItem, isSummaryJobSettled, pollSummaryJobUntilSettled, snoozeAttentionItem, verifyIntegrationTarget } from "../src/api.js";

describe("web API summary job helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("polls summary jobs until a settled completion is returned", async () => {
    const queued = buildSummaryJob("queued");
    const running = buildSummaryJob("running");
    const completed = buildSummaryJob("completed", {
      completedAt: "2026-05-04T12:00:02.000Z",
      generatedSummary: {
        summary: "Fresh operator summary.",
        createdAt: "2026-05-04T12:00:02.000Z",
        source: "rules",
        freshnessState: "fresh"
      }
    });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ job: running }))
      .mockResolvedValueOnce(jsonResponse({ job: completed }));
    const updates: string[] = [];

    const settled = await pollSummaryJobUntilSettled(queued, {
      intervalMs: 0,
      sleep: async () => undefined,
      onUpdate: (job) => updates.push(job.status)
    });

    expect(settled).toEqual(completed);
    expect(updates).toEqual(["queued", "running", "completed"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/summary-jobs/job-1");
  });

  test("fails closed when summary jobs never settle", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ job: buildSummaryJob("running") }));

    await expect(
      pollSummaryJobUntilSettled(buildSummaryJob("queued"), {
        intervalMs: 0,
        maxAttempts: 2,
        sleep: async () => undefined
      })
    ).rejects.toThrow("Summary job polling timed out");
  });

  test("posts local dry-run verification requests for supported delivery targets", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        receipt: {
          id: "receipt-slack-verify",
          target: "slack",
          dayKey: "2026-05-04",
          title: "OpenClog Journal handoff",
          status: "failed",
          requestedAt: "2026-05-04T12:00:00.000Z",
          completedAt: "2026-05-04T12:00:01.000Z",
          correlationId: "corr-slack",
          retryCount: 0,
          dryRun: true,
          deliveryReference: "dry-run",
          deadLetterReason: "delivery target is not configured"
        }
      })
    );

    const receipt = await verifyIntegrationTarget("slack", { dayKey: "2026-05-04" });

    expect(receipt).toMatchObject({ target: "slack", dryRun: true, deliveryReference: "dry-run" });
    expect(fetchMock).toHaveBeenCalledWith("/api/integrations/slack/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dayKey: "2026-05-04" })
    });
  });

  test("recognizes only completed and failed summary jobs as settled", () => {
    expect(isSummaryJobSettled("queued")).toBe(false);
    expect(isSummaryJobSettled("running")).toBe(false);
    expect(isSummaryJobSettled("completed")).toBe(true);
    expect(isSummaryJobSettled("failed")).toBe(true);
  });

  test("posts attention item acknowledgement and snooze requests", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse({
          state: {
            attentionItemId: "stale_summary",
            acknowledgedAt: "2026-06-02T16:30:00.000Z",
            acknowledgedBy: "local-operator"
          }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          state: {
            attentionItemId: "stale_summary",
            snoozeUntil: "2026-06-02T17:30:00.000Z",
            acknowledgedBy: "local-operator"
          }
        })
      );

    const acknowledged = await acknowledgeAttentionItem("stale_summary", { acknowledgedBy: "local-operator" });
    const snoozed = await snoozeAttentionItem("stale_summary", "2026-06-02T17:30:00.000Z", { acknowledgedBy: "local-operator" });

    expect(acknowledged).toMatchObject({ attentionItemId: "stale_summary", acknowledgedBy: "local-operator" });
    expect(snoozed).toMatchObject({ attentionItemId: "stale_summary", snoozeUntil: "2026-06-02T17:30:00.000Z" });
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/operations/attention/stale_summary/ack", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ acknowledgedBy: "local-operator" })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/operations/attention/stale_summary/snooze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ snoozeUntil: "2026-06-02T17:30:00.000Z", acknowledgedBy: "local-operator" })
    });
  });
});

function buildSummaryJob(status: SummaryJob["status"], overrides: Partial<SummaryJob> = {}): SummaryJob {
  return {
    id: "job-1",
    dayKey: "2026-05-04",
    status,
    createdAt: "2026-05-04T12:00:00.000Z",
    progressLabel: `Summary job ${status}.`,
    ...overrides
  };
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body
  } as Response;
}
