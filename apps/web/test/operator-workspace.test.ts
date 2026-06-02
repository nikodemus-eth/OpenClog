import { describe, expect, test } from "vitest";
import type { CapabilityView, DeliveryReceipt, GeneratedSummary, JournalEntry, MonitoringImportResult, OperationsBacklogReport } from "@openclog/core";
import { describeReportFreshness } from "../src/hooks/useOperationsReport.js";
import {
  addSearchPreset,
  buildActiveIncidentBadgeText,
  buildNamedOperatorViews,
  buildReconnectTrendText,
  buildShellShortcutHints,
  formatAttentionNowItem,
  classifyGatewayErrorCategory,
  classifyGatewayUrl,
  capabilityGateAllows,
  applyOperatorViewTimelinePreference,
  buildDryRunFailureJumpNotice,
  buildGatewayScopeButtonLabel,
  buildMorningBriefCopyText,
  buildReportSnapshotSummary,
  buildVerificationGateFocusSelector,
  buildRetryReceiptConfirmation,
  buildRetryWithNewKeyReceiptConfirmation,
  buildVerificationTrustSummary,
  describeActiveOperatorView,
  describeAlertFindingState,
  describeComposerConnectivity,
  describeChangesSinceSummary,
  describeIncidentActionRecordingStatus,
  describeOperatorViewSource,
  describeRecoveredEvidenceDrift,
  describeSummaryJobState,
  describeStaleSummaryInterval,
  describeStaleSummaryWarning,
  DEFAULT_SEARCH_PRESETS,
  dedupeLiveActionNotice,
  diagnosticsCollapsedStorageKey,
  describeGeneratedSummaryFreshness,
  formatCorrelationBadge,
  formatCorrelationEdge,
  formatCorrelationNode,
  formatIntegrationVerificationReceipt,
  formatBundleManifestPreview,
  formatCloseoutPlan,
  formatCapabilitySummary,
  formatCloseoutReadiness,
  formatDeliveryTargetHealthSummary,
  formatExportableOperatorView,
  formatMonitoringImportSummary,
  formatRecoveredEvidenceBadge,
  formatRecoveredEvidenceSummary,
  formatMissionReplayStep,
  formatReceiptDetails,
  formatWhyBlocked,
  formatSummaryJobDurations,
  formatTimelineEventSummary,
  formatVerificationReceiptAge,
  formatVerificationReceiptComparison,
  formatVerificationReceiptStatus,
  getLastSuccessfulSummaryJobCompletionAt,
  formatReplayBundleDiff,
  formatRetentionPreview,
  formatRetentionSnapshotImpact,
  hasRetentionImpact,
  isSummaryJobActive,
  isEntryMatchingFilter,
  isGeneratedSummaryStale,
  mergeOperatorViewsForDay,
  mergeSearchPresets,
  remainingPinnedSummaryCharacters,
  searchEmptyState,
  summarizeAlertFindings,
  thirtyMinuteSnoozeUntil,
  validateInvestigationNote,
  validatePinnedSummary
} from "../src/state/operator-workspace.js";

describe("operator workspace helpers", () => {
  test("validates pinned summaries for empty and oversized values", () => {
    expect(validatePinnedSummary("   ")).toBe("Pinned summary cannot be empty.");
    expect(validatePinnedSummary("a".repeat(281))).toBe("Pinned summary must be 280 characters or fewer.");
    expect(validatePinnedSummary("Operational summary")).toBeNull();
    expect(remainingPinnedSummaryCharacters("abc")).toBe(277);
  });

  test("describes report freshness with explicit threshold and stale delta context", () => {
    expect(
      describeReportFreshness({
        reportFreshness: {
          status: "older_than_latest_receipt",
          summary: "Older than latest receipt.",
          reportGeneratedAt: "2026-05-08T12:00:00.000Z",
          freshnessThresholdMs: 300000,
          staleByMs: 420000,
          thresholdBreached: true
        }
      } as OperationsBacklogReport)
    ).toContain("beyond threshold");
  });

  test("detects when generated summaries are stale", () => {
    const generatedSummary: GeneratedSummary = {
      summary: "Summary text",
      createdAt: "2026-05-04T09:00:00.000Z",
      source: "rules"
    };
    const entries: JournalEntry[] = [buildEntry("2026-05-04T08:59:00.000Z"), buildEntry("2026-05-04T09:01:00.000Z")];

    expect(isGeneratedSummaryStale(generatedSummary, entries)).toBe(true);
    expect(isGeneratedSummaryStale(generatedSummary, [buildEntry("2026-05-04T08:58:00.000Z")])).toBe(false);
    expect(isGeneratedSummaryStale({ ...generatedSummary, createdAt: "not-a-date" }, entries)).toBe(false);
    expect(isGeneratedSummaryStale(undefined, entries)).toBe(false);
  });

  test("classifies Gateway URL safety for loopback, lan, remote, and invalid values", () => {
    expect(classifyGatewayUrl("ws://127.0.0.1:18789")).toMatchObject({ kind: "loopback", label: "Loopback-safe" });
    expect(classifyGatewayUrl("ws://10.0.0.5:18789")).toMatchObject({ kind: "lan", label: "LAN-local" });
    expect(classifyGatewayUrl("ws://192.168.1.4:18789")).toMatchObject({ kind: "lan", label: "LAN-local" });
    expect(classifyGatewayUrl("ws://172.16.0.5:18789")).toMatchObject({ kind: "lan", label: "LAN-local" });
    expect(classifyGatewayUrl("ws://172.32.0.5:18789")).toMatchObject({ kind: "remote", label: "Remote target" });
    expect(classifyGatewayUrl("wss://gateway.example.com")).toMatchObject({ kind: "remote", label: "Remote target" });
    expect(classifyGatewayUrl("::bad-url::")).toMatchObject({ kind: "invalid", label: "Invalid Gateway URL" });
    expect(classifyGatewayUrl(undefined)).toMatchObject({ kind: "unset", label: "Gateway URL unavailable" });
  });

  test("builds verification trust summaries for missing report data and unavailable verifies", () => {
    expect(buildVerificationTrustSummary(null)).toBe("Last successful local verify bundle: unavailable");
    expect(
      buildVerificationTrustSummary({
        verificationCenter: {
          criticalIssueCount: 0,
          failingGateCount: 0,
          firstBlockedGateId: undefined,
          gates: [],
          lastSuccessfulDesktopVerifyAt: "2026-05-04T10:00:00.000Z",
          lastSuccessfulDocsCheckAt: "2026-05-04T11:00:00.000Z",
          lastSuccessfulGatewayVerifyAt: "2026-05-04T09:00:00.000Z",
          lastSuccessfulVerifyAgeLabel: undefined,
          lastSuccessfulVerifyAt: "2026-05-04T12:00:00.000Z",
          lastSuccessfulVerifyFreshness: undefined,
          summary: "Verify stale."
        }
      } as OperationsBacklogReport)
    ).toContain("verify 2026-05-04T12:00:00.000Z (unknown, age unavailable)");
    expect(
      buildVerificationTrustSummary({
        verificationCenter: {
          criticalIssueCount: 0,
          failingGateCount: 0,
          firstBlockedGateId: undefined,
          gates: [],
          lastSuccessfulDesktopVerifyAt: undefined,
          lastSuccessfulDocsCheckAt: undefined,
          lastSuccessfulGatewayVerifyAt: undefined,
          lastSuccessfulVerifyAgeLabel: undefined,
          lastSuccessfulVerifyAt: undefined,
          lastSuccessfulVerifyFreshness: undefined,
          summary: "All clear."
        }
      } as OperationsBacklogReport)
    ).toBe("Last successful local verify bundle: verify unavailable gateway unavailable desktop unavailable docs unavailable");
    expect(
      buildVerificationTrustSummary({
        verificationCenter: {
          criticalIssueCount: 0,
          failingGateCount: 0,
          firstBlockedGateId: undefined,
          gates: [],
          lastSuccessfulDesktopVerifyAt: "2026-05-04T10:00:00.000Z",
          lastSuccessfulDocsCheckAt: "2026-05-04T11:00:00.000Z",
          lastSuccessfulGatewayVerifyAt: "2026-05-04T09:00:00.000Z",
          lastSuccessfulVerifyAgeLabel: "5m old",
          lastSuccessfulVerifyAt: "2026-05-04T12:00:00.000Z",
          lastSuccessfulVerifyFreshness: "fresh",
          summary: "All clear."
        },
        reportFreshness: {
          status: "newer_than_latest_receipt",
          summary: "Fresh report.",
          reportGeneratedAt: "2026-05-04T12:05:00.000Z",
          latestSuccessfulVerifyPredatesHead: true
        }
      } as OperationsBacklogReport)
    ).toContain("predates current HEAD");
  });

  test("formats recovered OpenClaw evidence summaries for report and header surfaces", () => {
    expect(formatRecoveredEvidenceSummary(undefined)).toBeNull();
    expect(formatRecoveredEvidenceSummary({ sourceLabel: "Backfilled from OpenClaw", entryCount: 0, dayCount: 0, dayKeys: [] })).toBeNull();
    expect(
      formatRecoveredEvidenceSummary({
        sourceLabel: "Backfilled from OpenClaw",
        entryCount: 69,
        dayCount: 1,
        dayKeys: ["2026-05-20"],
        latestImportedAt: "2026-05-20T22:30:01.601Z"
      })
    ).toBe("Recovered evidence: 69 entries across 1 day, latest import 2026-05-20T22:30:01.601Z");
    expect(
      formatRecoveredEvidenceSummary(
        {
          sourceLabel: "Backfilled from OpenClaw",
          entryCount: 236,
          dayCount: 7,
          dayKeys: ["2026-05-16", "2026-05-17", "2026-05-18", "2026-05-19", "2026-05-20", "2026-05-22", "2026-05-23"],
          latestImportedAt: "2026-05-23T13:49:44.593Z"
        },
        { latestSeparator: ";" }
      )
    ).toBe("Recovered evidence: 236 entries across 7 days; latest import 2026-05-23T13:49:44.593Z");
    expect(
      formatRecoveredEvidenceSummary(
        {
          sourceLabel: "Backfilled from OpenClaw",
          entryCount: 1,
          dayCount: 1,
          dayKeys: ["2026-05-20"]
        },
        { latestSeparator: ";" }
      )
    ).toBe("Recovered evidence: 1 entry across 1 day");
  });

  test("formats recovered-evidence badges for archive and search surfaces", () => {
    expect(formatRecoveredEvidenceBadge(undefined)).toBeNull();
    expect(
      formatRecoveredEvidenceBadge({
        label: "Backfilled from OpenClaw",
        latestImportedAt: "2026-05-20T22:30:01.601Z"
      })
    ).toBe("Backfilled from OpenClaw · imported 2026-05-20T22:30:01.601Z");
    expect(
      formatRecoveredEvidenceBadge({
        label: "Backfilled from OpenClaw",
        entryCount: 69
      })
    ).toBe("Backfilled from OpenClaw · 69 entries");
    expect(
      formatRecoveredEvidenceBadge({
        label: "Backfilled from OpenClaw",
        entryCount: 1
      })
    ).toBe("Backfilled from OpenClaw · 1 entry");
  });

  test("builds report snapshot summaries for header provenance copy", () => {
    expect(buildReportSnapshotSummary(null)).toBeNull();
    expect(
      buildReportSnapshotSummary({
        reportProvenance: {
          currentSnapshotId: "report-snapshot-current",
          previousSnapshotId: "report-snapshot-previous",
          sourceVerificationReceiptIds: [],
          sourceSummaryJobIds: [],
          sourceDeliveryReceiptIds: [],
          lineageSummary: "Lineage ready."
        }
      } as OperationsBacklogReport)
    ).toBe("Report snapshots: current report-snapshot-current · previous report-snapshot-previous");
    expect(
      buildReportSnapshotSummary({
        reportProvenance: {
          currentSnapshotId: "report-snapshot-current",
          sourceVerificationReceiptIds: [],
          sourceSummaryJobIds: [],
          sourceDeliveryReceiptIds: [],
          lineageSummary: "Lineage ready."
        }
      } as OperationsBacklogReport)
    ).toBe("Report snapshots: current report-snapshot-current · previous none");
  });

  test("builds morning brief copy text with bullets and citations", () => {
    expect(
      buildMorningBriefCopyText({
        headline: "Morning brief: local operations still need operator attention.",
        bullets: ["Refresh stale summaries.", "Review failed receipts."],
        citations: ["stale_summary", "receipt-slack-failed"]
      })
    ).toContain("Citations: stale_summary, receipt-slack-failed");
    expect(
      buildMorningBriefCopyText({
        headline: "Morning brief: clear.",
        bullets: ["Nothing new."],
        citations: []
      })
    ).toBe("Morning brief: clear.\n- Nothing new.");
  });

  test("builds a selector for the first blocked verification gate with fallback", () => {
    expect(buildVerificationGateFocusSelector("summary_freshness")).toBe('[data-verification-gate-id="summary_freshness"]');
    expect(buildVerificationGateFocusSelector(undefined)).toBe('[data-verification-gate-status="blocked"]');
  });

  test("formats reconnect, retention, and empty-search guidance", () => {
    expect(buildReconnectTrendText(0)).toContain("stable");
    expect(buildReconnectTrendText(1)).toContain("one reconnect");
    expect(buildReconnectTrendText(2)).toContain("elevated");
    expect(buildReconnectTrendText(4)).toContain("noisy");
    expect(
      formatRetentionPreview({
        keepDays: 1,
        removedDayKeys: ["2026-05-01"],
        removedEntryCount: 2,
        removedSummaryCount: 1,
        removedAuditCount: 1
      })
    ).toContain("2 entries");
    expect(formatRetentionPreview(null)).toBeNull();
    expect(searchEmptyState("timeout", 0)).toContain("No journal matches");
    expect(searchEmptyState("timeout", 1)).toBeNull();
    expect(searchEmptyState("", 0)).toBeNull();
  });

  test("formats retention snapshot impact and detects removable state", () => {
    const preview = {
      keepDays: 1,
      removedDayKeys: ["2026-05-01"],
      removedEntryCount: 2,
      removedSummaryCount: 1,
      removedAuditCount: 1,
      removedIncidentCount: 1,
      removedAlertCount: 1,
      removedBundleCount: 1
    };

    expect(hasRetentionImpact(preview)).toBe(true);
    expect(hasRetentionImpact(null)).toBe(false);
    expect(hasRetentionImpact({ ...preview, removedDayKeys: [], removedEntryCount: 0, removedSummaryCount: 0, removedAuditCount: 0, removedIncidentCount: 0, removedAlertCount: 0, removedBundleCount: 0 })).toBe(false);
    expect(hasRetentionImpact({ keepDays: 1, removedDayKeys: [], removedEntryCount: 0, removedSummaryCount: 0, removedAuditCount: 0 })).toBe(false);
    expect(formatRetentionSnapshotImpact({ id: "retention-1", createdAt: "2026-05-04T12:00:00.000Z", preview })).toBe(
      "Applied retention snapshot retention-1 at 2026-05-04T12:00:00.000Z: removed 1 day(s), 2 entries, 1 summaries, 1 audit rows, 1 incidents, 1 alerts, and 1 bundles."
    );
    expect(
      formatRetentionSnapshotImpact({
        id: "retention-2",
        createdAt: "2026-05-04T12:01:00.000Z",
        preview: { keepDays: 1, removedDayKeys: [], removedEntryCount: 0, removedSummaryCount: 0, removedAuditCount: 0 }
      })
    ).toContain("0 incidents, 0 alerts, and 0 bundles");
    expect(formatRetentionSnapshotImpact(null)).toBeNull();
  });

  test("describes alert active, acknowledged, and snoozed state", () => {
    const now = new Date("2026-05-04T12:00:00.000Z");
    const futureSnooze = {
      ruleId: "reconnect-storm",
      title: "Reconnect storm",
      triggered: true,
      detail: "Reconnect storm triggered.",
      snoozedUntil: "2026-05-04T12:30:00.000Z"
    };
    const expiredSnooze = { ...futureSnooze, snoozedUntil: "2026-05-04T11:59:00.000Z", acknowledgedAt: "2026-05-04T11:50:00.000Z" };

    expect(describeAlertFindingState(futureSnooze, now)).toMatchObject({
      status: "snoozed",
      label: "Snoozed until 2026-05-04T12:30:00.000Z",
      active: false,
      snoozed: true
    });
    expect(describeAlertFindingState(expiredSnooze, now)).toMatchObject({
      status: "active_acknowledged",
      label: "Active, acknowledged at 2026-05-04T11:50:00.000Z",
      active: true,
      snoozed: false
    });
    expect(describeAlertFindingState({ ...futureSnooze, snoozedUntil: "not-a-date" }, now)).toMatchObject({
      status: "active",
      label: "Active",
      active: true,
      snoozed: false
    });
    expect(describeAlertFindingState({ ...futureSnooze, triggered: false, snoozedUntil: undefined }, now)).toMatchObject({
      status: "inactive",
      label: "Inactive"
    });
    expect(summarizeAlertFindings([futureSnooze, expiredSnooze], now)).toEqual({ activeCount: 1, acknowledgedCount: 1, snoozedCount: 1 });
    expect(thirtyMinuteSnoozeUntil(now)).toBe("2026-05-04T12:30:00.000Z");
  });

  test("formats mission replay and correlation details with safe copy", () => {
    expect(
      formatMissionReplayStep(
        {
          id: "step-1",
          kind: "entry",
          entryIds: ["entry-1"],
          timestamp: "2026-05-04T12:00:00.000Z",
          label: "Authorization: Bearer live-secret",
          derived: false,
          sourceIds: ["entry-1"]
        },
        0
      )
    ).toBe("Step 1: entry at 2026-05-04T12:00:00.000Z - [REDACTED_SECRET] - entries entry-1 - sources entry-1.");
    expect(formatCorrelationNode({ id: "node-1", type: "bundle_export", label: "/Users/m4/OpenClog/.env" })).toBe("node-1: [LOCAL_PATH] (bundle export)");
    expect(formatCorrelationEdge({ id: "edge-1", from: "incident-1", to: "entry-1", relationship: "triggered_by" })).toBe("edge-1: incident-1 triggered by entry-1");
    expect(formatCorrelationEdge({ id: "edge-2", from: "bundle-1", to: "receipt-1", relationship: "exported_to" })).toBe("edge-2: bundle-1 exported to receipt-1");
    expect(formatCorrelationEdge({ id: "edge-3", from: "entry-1", to: "incident-1", relationship: "references" })).toBe("edge-3: entry-1 references incident-1");
    expect(formatCorrelationEdge({ id: "edge-4", from: "entry-1", to: "session-1", relationship: "belongs_to" })).toBe("edge-4: entry-1 belongs to session-1");
    expect(
      formatMissionReplayStep(
        {
          id: "step-2",
          kind: "derived",
          entryIds: [],
          timestamp: "2026-05-04T12:01:00.000Z",
          label: "Derived checkpoint",
          derived: true,
          sourceIds: []
        },
        1
      )
    ).toContain("entries none - sources none");
  });

  test("ships named operator views and deduplicates live action notices", () => {
    expect(buildNamedOperatorViews("2026-05-04", "agent:hugin:main")).toEqual([
      expect.objectContaining({ id: "reconnect-triage", builtIn: true, drilldown: { sessionKey: "agent:hugin:main", tab: "timeline", scrollTop: 0 } }),
      expect.objectContaining({ id: "pending-approvals", builtIn: true, drilldown: { sessionKey: "agent:hugin:main", tab: "actions", scrollTop: 0 } }),
      expect.objectContaining({ id: "delivery-failures", builtIn: true, drilldown: { sessionKey: "agent:hugin:main", tab: "deliveries", scrollTop: 0 } }),
      expect.objectContaining({ id: "stale-summaries", builtIn: true, searchQuery: "summary stale" }),
      expect.objectContaining({ id: "stale-summaries-failed-deliveries", builtIn: true, searchQuery: "summary stale delivery receipt failed" }),
      expect.objectContaining({ id: "failed-receipts", builtIn: true, searchQuery: "delivery receipt failed" }),
      expect.objectContaining({ id: "stale-backend-fingerprint", builtIn: true, searchQuery: "stale backend fingerprint" }),
      expect.objectContaining({ id: "needs-operator-action-now", builtIn: true, hypothesis: "Needs operator action now highlights blocked, stale, and failed work that should be handled before handoff." }),
      expect.objectContaining({ id: "only-unresolved-incidents", builtIn: true, hypothesis: "Unresolved incidents combine open alerts, failed actions, and stale summaries." }),
      expect.objectContaining({ id: "scope-missing", builtIn: true, searchQuery: "scope missing" }),
      expect.objectContaining({ id: "backfilled-openclaw", builtIn: true, searchQuery: "\"Backfilled from OpenClaw\"" })
    ]);
    expect(dedupeLiveActionNotice([], "  ")).toEqual([]);
    expect(dedupeLiveActionNotice(["saved"], "saved")).toEqual(["saved"]);
    expect(dedupeLiveActionNotice(["alpha", "beta", "gamma"], "delta")).toEqual(["delta", "alpha", "beta"]);
  });

  test("formats exportable views with fallback newer-evidence copy", () => {
    expect(
      formatExportableOperatorView({
        id: "saved-view",
        label: "Saved view",
        searchQuery: "delivery receipt",
        grouped: false,
        activeFilters: ["errors"],
        newerEvidenceExists: true,
        staleSummaryCount: 2
      } as ExportableOperatorView)
    ).toContain("newer evidence exists");
  });

  test("formats exportable views with lint findings and selected gate context", () => {
    expect(
      formatExportableOperatorView({
        id: "saved-view",
        label: "Saved view",
        searchQuery: "delivery receipt",
        grouped: false,
        activeFilters: ["errors"],
        evidenceCount: 3,
        unresolvedEvidenceCount: 1,
        redactedJson: "{\"label\":\"Saved view\"}",
        lintFindings: [
          {
            id: "duplicate-view",
            severity: "warning",
            message: "Overlaps with stale summaries."
          }
        ],
        selectedGateId: "release-readiness"
      } as ExportableOperatorView)
    ).toContain("Lint: Overlaps with stale summaries.. Selected gate release-readiness.");
  });

  test("merges current built-in operator views with older persisted saved views", () => {
    const merged = mergeOperatorViewsForDay("2026-05-08", "agent:hugin:main", [
      {
        id: "reconnect-triage",
        label: "Reconnect triage",
        searchQuery: "gateway reconnect",
        activeFilters: ["errors"],
        grouped: false,
        builtIn: true
      },
      {
        id: "saved-hypothesis",
        label: "Saved hypothesis",
        searchQuery: "scope missing",
        activeFilters: ["approvals"],
        grouped: false,
        hypothesis: "Gateway scopes are missing.",
        validationSteps: ["Verify scope negotiation."]
      }
    ]);

    expect(merged).toEqual([
      expect.objectContaining({ id: "reconnect-triage", builtIn: true, grouped: false }),
      expect.objectContaining({ id: "pending-approvals", builtIn: true }),
      expect.objectContaining({ id: "delivery-failures", builtIn: true }),
      expect.objectContaining({ id: "stale-summaries", builtIn: true }),
      expect.objectContaining({ id: "stale-summaries-failed-deliveries", builtIn: true }),
      expect.objectContaining({ id: "failed-receipts", builtIn: true }),
      expect.objectContaining({ id: "stale-backend-fingerprint", builtIn: true }),
      expect.objectContaining({ id: "needs-operator-action-now", builtIn: true }),
      expect.objectContaining({ id: "only-unresolved-incidents", builtIn: true }),
      expect.objectContaining({ id: "scope-missing", builtIn: true }),
      expect.objectContaining({ id: "backfilled-openclaw", builtIn: true }),
      expect.objectContaining({ id: "saved-hypothesis", grouped: false, hypothesis: "Gateway scopes are missing." })
    ]);
  });

  test("keeps built-in operator view drilldowns valid without a selected session", () => {
    expect(buildNamedOperatorViews("2026-05-04")).toEqual([
      expect.objectContaining({ id: "reconnect-triage", drilldown: { sessionKey: undefined, tab: "timeline", scrollTop: 0 } }),
      expect.objectContaining({ id: "pending-approvals", drilldown: { sessionKey: undefined, tab: "actions", scrollTop: 0 } }),
      expect.objectContaining({ id: "delivery-failures", drilldown: { sessionKey: undefined, tab: "deliveries", scrollTop: 0 } }),
      expect.objectContaining({ id: "stale-summaries", drilldown: { sessionKey: undefined, tab: "timeline", scrollTop: 0 } }),
      expect.objectContaining({ id: "stale-summaries-failed-deliveries", drilldown: { sessionKey: undefined, tab: "deliveries", scrollTop: 0 } }),
      expect.objectContaining({ id: "failed-receipts", drilldown: { sessionKey: undefined, tab: "deliveries", scrollTop: 0 } }),
      expect.objectContaining({ id: "stale-backend-fingerprint", drilldown: { sessionKey: undefined, tab: "timeline", scrollTop: 0 } }),
      expect.objectContaining({ id: "needs-operator-action-now", drilldown: { sessionKey: undefined, tab: "actions", scrollTop: 0 } }),
      expect.objectContaining({ id: "only-unresolved-incidents", drilldown: { sessionKey: undefined, tab: "actions", scrollTop: 0 } }),
      expect.objectContaining({ id: "scope-missing", drilldown: { sessionKey: undefined, tab: "actions", scrollTop: 0 } }),
      expect.objectContaining({ id: "backfilled-openclaw", drilldown: { sessionKey: undefined, tab: "timeline", scrollTop: 0 } })
    ]);
  });

  test("matches backfilled OpenClaw timeline entries by flag and provenance text", () => {
    expect(
      isEntryMatchingFilter(
        buildEntry("2026-05-08T12:00:00.000Z", {
          backfilled: true
        }),
        "backfilled_openclaw"
      )
    ).toBe(true);
    expect(
      isEntryMatchingFilter(
        buildEntry("2026-05-08T12:01:00.000Z", {
          sourceLabel: "Recovered",
          title: "Backfilled from OpenClaw archive import"
        }),
        "backfilled_openclaw"
      )
    ).toBe(true);
    expect(
      isEntryMatchingFilter(
        buildEntry("2026-05-08T12:01:30.000Z", {
          title: "Recovered evidence packet",
          body: "Backfilled from OpenClaw after local replay."
        }),
        "backfilled_openclaw"
      )
    ).toBe(true);
    expect(
      isEntryMatchingFilter(
        buildEntry("2026-05-08T12:02:00.000Z", {
          sourceLabel: "Live capture",
          title: "Operator note",
          body: "Fresh local evidence only."
        }),
        "backfilled_openclaw"
      )
    ).toBe(false);
  });

  test("formats literal quick-win recovery, timing, scope, retry, correlation, and stale-summary affordances", () => {
    const receipt: DeliveryReceipt = {
      id: "receipt-slack-failed",
      target: "slack",
      dayKey: "2026-05-08",
      incidentId: "incident-1",
      title: "Slack handoff",
      status: "failed",
      requestedAt: "2026-05-08T12:00:00.000Z",
      completedAt: "2026-05-08T12:00:05.000Z",
      correlationId: "corr-slack-1",
      retryCount: 1,
      idempotencyKey: "incident-1:slack",
      requestFingerprint: "fingerprint-1",
      dryRun: true,
      deadLetterReason: "delivery target is not configured"
    };

    expect(
      formatSummaryJobDurations({
        id: "summary-job-1",
        dayKey: "2026-05-08",
        status: "completed",
        createdAt: "2026-05-08T12:00:00.000Z",
        startedAt: "2026-05-08T12:00:02.000Z",
        completedAt: "2026-05-08T12:00:07.000Z",
        progressLabel: "Summary generated.",
        correlationId: "corr-summary-1"
      })
    ).toEqual({
      queuedFor: "2s",
      runningFor: "5s",
      lastCompleted: "2026-05-08T12:00:07.000Z",
      total: "7s"
    });
    expect(buildRetryReceiptConfirmation(receipt)).toBe(
      "Retry failed delivery receipt-slack-failed with the same idempotency key incident-1:slack. Confirm before resending this handoff."
    );
    expect(buildRetryWithNewKeyReceiptConfirmation(receipt)).toBe(
      "Retry failed delivery receipt-slack-failed with a new idempotency key to bypass dedupe on the next handoff attempt."
    );
    expect(buildGatewayScopeButtonLabel("Deliver to Slack", ["operator.approvals", "operator.write"])).toBe(
      "Deliver to Slack blocked: missing operator.approvals, operator.write"
    );
    expect(formatCorrelationBadge("corr-slack-1")).toEqual({ copyText: "corr-slack-1", label: "correlationId corr-slack-1" });
    expect(describeStaleSummaryWarning({ lastEntryIncludedAt: "2026-05-08T12:00:00.000Z", latestEntryObservedAt: "2026-05-08T12:05:00.000Z" })).toBe(
      "Summary may exclude latest entries: latest entry 2026-05-08T12:05:00.000Z is newer than included entry 2026-05-08T12:00:00.000Z."
    );
    expect(describeStaleSummaryInterval({ lastEntryIncludedAt: "2026-05-08T12:00:00.000Z", latestEntryObservedAt: "2026-05-08T12:05:00.000Z" })).toBe(
      "Stale because the summary is missing 5m of journal activity between 2026-05-08T12:00:00.000Z and 2026-05-08T12:05:00.000Z."
    );
    expect(describeStaleSummaryInterval({ lastEntryIncludedAt: "2026-05-08T12:00:00.000Z" })).toBeNull();
    expect(buildDryRunFailureJumpNotice(receipt)).toEqual({
      href: "#delivery-target-slack",
      label: "Open Slack delivery target",
      message: "Dry-run verification failed for Slack; jump to the delivery target card."
    });
    expect(buildDryRunFailureJumpNotice({ ...receipt, target: "generic-webhook" })).toEqual({
      href: "#delivery-target-generic-webhook",
      label: "Open Generic webhook delivery target",
      message: "Dry-run verification failed for Generic webhook; jump to the delivery target card."
    });
    expect(buildDryRunFailureJumpNotice({ ...receipt, target: "github-issue" })).toEqual({
      href: "#delivery-target-github-issue",
      label: "Open GitHub issue delivery target",
      message: "Dry-run verification failed for GitHub issue; jump to the delivery target card."
    });
    expect(
      formatExportableOperatorView({
        id: "saved-scope-review",
        label: "Saved scope review",
        evidenceCount: 3,
        unresolvedEvidenceCount: 1,
        redactedJson: "{\"redacted\":true}",
        handoffSummary: "Saved scope review: 1 unresolved evidence item(s). Source snapshot report-snapshot-1."
      })
    ).toContain("Handoff: Saved scope review: 1 unresolved evidence item(s). Source snapshot report-snapshot-1.");
    expect(
      applyOperatorViewTimelinePreference({
        id: "investigation",
        label: "Investigation",
        searchQuery: "scope missing",
        activeFilters: ["errors"],
        grouped: true,
        hypothesis: "Gateway scopes are missing.",
        validationSteps: ["Verify scope negotiation."]
      }, false)
    ).toMatchObject({ grouped: false, hypothesis: "Gateway scopes are missing.", validationSteps: ["Verify scope negotiation."] });
    expect(
      formatSummaryJobDurations({
        id: "summary-job-2",
        dayKey: "2026-05-08",
        status: "running",
        createdAt: "2026-05-08T12:00:00.000Z",
        progressLabel: "Running."
      })
    ).toEqual({ queuedFor: "0ms", runningFor: "0ms", lastCompleted: null, total: "0ms" });
    expect(
      formatSummaryJobDurations({
        id: "summary-job-3",
        dayKey: "2026-05-08",
        status: "completed",
        createdAt: "2026-05-08T12:00:00.000Z",
        startedAt: "2026-05-08T12:01:00.000Z",
        completedAt: "2026-05-08T12:02:05.000Z",
        progressLabel: "Complete."
      }).total
    ).toBe("2m 5s");
    expect(
      formatSummaryJobDurations({
        id: "summary-job-invalid-start",
        dayKey: "2026-05-08",
        status: "completed",
        createdAt: "not-a-date",
        startedAt: "2026-05-08T12:01:00.000Z",
        completedAt: "2026-05-08T12:02:00.000Z",
        progressLabel: "Complete."
      }).queuedFor
    ).toBe("0ms");
    expect(
      formatSummaryJobDurations({
        id: "summary-job-invalid-end",
        dayKey: "2026-05-08",
        status: "completed",
        createdAt: "2026-05-08T12:00:00.000Z",
        startedAt: "not-a-date",
        completedAt: "2026-05-08T12:02:00.000Z",
        progressLabel: "Complete."
      }).queuedFor
    ).toBe("0ms");
    expect(buildRetryReceiptConfirmation({ ...receipt, idempotencyKey: undefined })).toContain("idempotency key unavailable");
    expect(buildRetryWithNewKeyReceiptConfirmation({ ...receipt, requestFingerprint: undefined })).toContain("bypass dedupe");
    expect(buildGatewayScopeButtonLabel("Deliver to Slack", [])).toBe("Deliver to Slack");
    expect(formatCorrelationBadge(undefined)).toBeNull();
    expect(describeStaleSummaryWarning({ lastEntryIncludedAt: "2026-05-08T12:05:00.000Z", latestEntryObservedAt: "2026-05-08T12:00:00.000Z" })).toBeNull();
    expect(describeStaleSummaryWarning({ latestEntryObservedAt: "2026-05-08T12:00:00.000Z" })).toBeNull();
    expect(describeStaleSummaryInterval({ lastEntryIncludedAt: "2026-05-08T12:05:00.000Z", latestEntryObservedAt: "2026-05-08T12:00:00.000Z" })).toBeNull();
    expect(buildDryRunFailureJumpNotice({ ...receipt, status: "delivered" })).toBeNull();
    expect(buildDryRunFailureJumpNotice({ ...receipt, dryRun: false })).toBeNull();
  });

  test("formats verification receipt age and action-record visibility for the workbench", () => {
    expect(
      formatVerificationReceiptAge({
        id: "verify-1",
        command: "npm run verify",
        status: "passed",
        startedAt: "2026-05-08T12:00:00.000Z",
        completedAt: "2026-05-08T12:05:00.000Z",
        summary: "passed",
        ageLabel: "5m old",
        freshness: "fresh"
      })
    ).toBe("5m old");
    expect(
      formatVerificationReceiptAge({
        id: "verify-2",
        command: "npm run verify:gateway",
        status: "failed",
        startedAt: "2026-05-08T12:00:00.000Z",
        completedAt: "2026-05-08T12:45:00.000Z",
        summary: "failed",
        freshness: "stale"
      })
    ).toBe("age unavailable");
    expect(
      formatVerificationReceiptStatus({
        id: "verify-0",
        command: "npm run verify",
        status: "passed",
        startedAt: "2026-05-08T12:00:00.000Z",
        completedAt: "2026-05-08T12:01:00.000Z",
        summary: "passed",
        freshness: "fresh"
      })
    ).toBe("Fresh evidence");
    expect(
      formatVerificationReceiptStatus({
        id: "verify-3",
        command: "npm run verify:desktop-native",
        status: "passed",
        startedAt: "2026-05-08T12:00:00.000Z",
        completedAt: "2026-05-08T12:10:00.000Z",
        summary: "passed",
        freshness: "aging"
      })
    ).toBe("Aging evidence");
    expect(
      formatVerificationReceiptStatus({
        id: "verify-4",
        command: "npm run docs:check",
        status: "failed",
        startedAt: "2026-05-08T12:00:00.000Z",
        completedAt: "2026-05-08T12:50:00.000Z",
        summary: "failed",
        freshness: "stale"
      })
    ).toBe("Stale evidence");
    expect(
      formatVerificationReceiptStatus({
        id: "verify-5",
        command: "npm run docs:check",
        status: "unknown",
        startedAt: "2026-05-08T12:00:00.000Z",
        summary: "unknown"
      })
    ).toBe("Evidence age unknown");
    expect(
      describeIncidentActionRecordingStatus("deliver_slack", [
        {
          id: "action-1",
          incidentId: "incident-1",
          kind: "deliver_slack",
          title: "Deliver to slack",
          status: "failed",
          summary: "failed",
          createdAt: "2026-05-08T12:03:00.000Z"
        }
      ])
    ).toBe("Recorded at 2026-05-08T12:03:00.000Z.");
    expect(describeIncidentActionRecordingStatus("deliver_email", [])).toBe("Not yet recorded.");
    expect(buildShellShortcutHints()).toEqual(["[: left rail", "Alt+S: search", "Alt+B: blocked action", "Alt+R: recovered evidence", "Alt+M: morning command", "]: diagnostics"]);
  });

  test("describes active operator views, connectivity, summary job state, and per-view storage", () => {
    const views = buildNamedOperatorViews("2026-05-04", "agent:hugin:main");
    const active = describeActiveOperatorView(
      {
        searchQuery: "stale backend fingerprint",
        selectedDayKey: "2026-05-04",
        grouped: true,
        activeFilters: ["errors"]
      },
      views
    );

    expect(active).toMatchObject({ id: "stale-backend-fingerprint", builtIn: true });
    expect(describeOperatorViewSource(active)).toBe("Built-in view: Backend mismatch (stale backend fingerprint)");
    expect(
      describeActiveOperatorView(
        {
          searchQuery: "not saved",
          selectedDayKey: "2026-05-04",
          grouped: true,
          activeFilters: ["errors"]
        },
        views
      )
    ).toBeNull();
    expect(
      describeActiveOperatorView(
        {
          searchQuery: "floating day",
          selectedDayKey: "2026-05-04",
          grouped: false,
          activeFilters: ["approvals", "errors"]
        },
        [
          {
            id: "floating",
            label: "Floating",
            searchQuery: "floating day",
            activeFilters: ["errors", "approvals"],
            grouped: false,
            builtIn: false
          }
        ]
      )
    ).toMatchObject({ id: "floating" });
    expect(describeOperatorViewSource(null)).toBeNull();
    expect(
      describeOperatorViewSource({
        id: "saved-view",
        label: "Saved view",
        searchQuery: "saved query",
        activeFilters: [],
        grouped: false
      })
    ).toBe("Saved view: Saved view (saved query)");
    expect(diagnosticsCollapsedStorageKey(active?.id)).toBe("openclog.diagnostics.collapsed.user.desktop.stale-backend-fingerprint");
    expect(diagnosticsCollapsedStorageKey(active?.id, "mobile", true)).toBe("openclog.diagnostics.collapsed.builtin.mobile.stale-backend-fingerprint");
    expect(diagnosticsCollapsedStorageKey(undefined)).toBe("openclog.diagnostics.collapsed.user.desktop.default");
    expect(describeComposerConnectivity("ws://127.0.0.1:18789", true)).toMatchObject({ label: "Live Gateway" });
    expect(describeComposerConnectivity("ws://127.0.0.1:18789", false)).toMatchObject({ label: "Local only", detail: expect.stringContaining("Loopback-safe") });
    expect(describeComposerConnectivity("::bad-url::", true)).toMatchObject({ label: "Local only", detail: expect.stringContaining("Invalid Gateway URL") });
    expect(describeComposerConnectivity(undefined, false)).toMatchObject({ label: "Local only", detail: expect.stringContaining("Gateway URL unavailable") });
    expect(describeSummaryJobState(null, undefined)).toBe("Summary never generated for this day yet.");
    expect(describeSummaryJobState({ status: "completed" }, undefined)).toBe("Summary job completed.");
    expect(describeSummaryJobState({ status: "queued", progressLabel: "Queued for local evidence review." }, undefined)).toBe("Summary job queued: Queued for local evidence review.");
    expect(describeSummaryJobState({ status: "running", progressLabel: "Generating from local evidence." }, undefined)).toBe("Summary job running: Generating from local evidence.");
    expect(describeSummaryJobState({ status: "failed", progressLabel: "Failed closed.", error: "summary unavailable" }, undefined)).toBe("Summary job failed: Failed closed. Error: summary unavailable.");
    expect(describeSummaryJobState({ status: "failed", progressLabel: "Failed closed", error: "Authorization: Bearer test-secret" }, undefined)).toBe(
      "Summary job failed: Failed closed. Error: [REDACTED_SECRET]."
    );
    expect(describeSummaryJobState(null, { summary: "ready", createdAt: "2026-05-04T00:00:00.000Z", source: "rules" })).toBe(
      "Generated summary available."
    );
    expect(isSummaryJobActive({ status: "queued" })).toBe(true);
    expect(isSummaryJobActive({ status: "running" })).toBe(true);
    expect(isSummaryJobActive({ status: "completed" })).toBe(false);
    expect(getLastSuccessfulSummaryJobCompletionAt({ status: "completed", completedAt: "2026-05-04T12:00:00.000Z" }, undefined)).toBe("2026-05-04T12:00:00.000Z");
    expect(
      getLastSuccessfulSummaryJobCompletionAt(
        { status: "completed", generatedSummary: { summary: "ready", createdAt: "2026-05-04T12:01:00.000Z", source: "rules" } },
        undefined
      )
    ).toBe("2026-05-04T12:01:00.000Z");
    expect(getLastSuccessfulSummaryJobCompletionAt(null, { summary: "ready", createdAt: "2026-05-04T00:00:00.000Z", source: "rules" })).toBe("2026-05-04T00:00:00.000Z");
    const trustReport: OperationsBacklogReport = {
      dayKey: "2026-05-04",
      generatedAt: "2026-05-04T12:10:00.000Z",
      attentionNow: [],
      summaryJobHistory: { jobs: [], days: [], queueDepth: 0 },
      incidentEvidenceChecklist: { incidentId: "unscoped", ready: true, items: [] },
      investigationBundlePreview: { dayKey: "2026-05-04", items: [], redactionWarnings: [] },
      readinessHistory: { windowHours: 24, points: [] },
      readinessAggregates: [],
      deliveryLedger: { items: [] },
      deliveryTargetHealth: [],
      incidentTimeline: { startDayKey: "2026-05-04", endDayKey: "2026-05-04", events: [] },
      routePerformanceBudgets: [],
      routeBudgetRegressions: [],
      chaosScenarios: [],
      recommendationRationales: [],
      verificationCenter: {
        generatedAt: "2026-05-04T12:10:00.000Z",
        gates: [],
        firstBlockedGateId: undefined,
        receipts: [],
        readinessScore: 92,
        readinessLabel: "ready",
        lastSuccessfulVerifyAt: "2026-05-04T12:05:00.000Z",
        lastSuccessfulVerifyAgeLabel: "5m old",
        lastSuccessfulVerifyFreshness: "fresh"
      },
      verificationReceiptDiffs: [],
      governedSdkManifests: [],
      evidenceQualityScores: [],
      closeoutReadiness: { score: 92, label: "ready", blockers: [], requiredEvidenceFresh: true },
      exportableViews: [],
      incidentTemplates: [],
      deliveryContractPreviews: [],
      guidedIncidentCommand: { stages: [] },
      roleAwareSimulations: [],
      causalityGraph: { incidentId: "incident-1", nodes: [], edges: [] },
      operationsLedger: { entries: [] },
      nativeTruthMonitor: { status: "passed", checks: [] },
      policyRecommendationPacks: [],
      escalationPlaybooks: [],
      retentionImpact: { keepDays: 1, removedDayKeys: [], removedEntryCount: 0, removedSummaryCount: 0, removedAuditCount: 0 },
      activeHypotheses: [],
      nativeCutoverPlan: { status: "prep", artifactPath: "docs/openclog-native-cutover.md", summary: "prep", nextSteps: [] },
      releaseReadinessGate: { status: "ready", requiredCommands: [], blockers: [] },
      staleSummaryDayKeys: []
    };
    expect(buildVerificationTrustSummary(trustReport)).toBe(
      "Last successful local verify bundle: verify 2026-05-04T12:05:00.000Z (fresh, 5m old) gateway unavailable desktop unavailable docs unavailable"
    );
    expect(buildVerificationTrustSummary(null)).toBe("Last successful local verify bundle: unavailable");
  });

  test("formats closeout plans, replay diffs, and investigation notes", () => {
    expect(validateInvestigationNote("   ")).toBe("Investigation note cannot be empty.");
    expect(validateInvestigationNote("a".repeat(1001))).toBe("Investigation note must be 1000 characters or fewer.");
    expect(validateInvestigationNote("Operator note")).toBeNull();
    expect(formatReplayBundleDiff(null)).toBeNull();
    expect(
      formatReplayBundleDiff({
        changeClass: "evidence_shape",
        leftDayKey: "2026-05-03",
        rightDayKey: "2026-05-04",
        addedEntryIds: ["entry-b"],
        removedEntryIds: [],
        summaryChanged: true,
        markdownChanged: false,
        entryCountDelta: 1,
        changedManifestFields: ["dayKey"],
        changedMetadataFields: ["status"]
      })
    ).toContain("+1 / -0 entries");
    expect(
      formatReplayBundleDiff({
        changeClass: "narrative_only",
        leftDayKey: "2026-05-03",
        rightDayKey: "2026-05-04",
        addedEntryIds: [],
        removedEntryIds: [],
        summaryChanged: false,
        markdownChanged: true,
        entryCountDelta: 0,
        changedManifestFields: [],
        changedMetadataFields: []
      })
    ).toContain("markdown changed");
    expect(
      formatReplayBundleDiff({
        changeClass: "unchanged",
        leftDayKey: "2026-05-03",
        rightDayKey: "2026-05-04",
        addedEntryIds: [],
        removedEntryIds: [],
        summaryChanged: false,
        markdownChanged: false,
        entryCountDelta: 0,
        changedManifestFields: [],
        changedMetadataFields: []
      })
    ).toContain("summary unchanged");
    expect(formatCloseoutPlan(null)).toBeNull();
    expect(
      formatCloseoutPlan({
        dayKey: "2026-05-04",
        generatedSummaryFresh: true,
        retentionPreview: { keepDays: 1, removedDayKeys: ["2026-05-03"], removedEntryCount: 2, removedSummaryCount: 1, removedAuditCount: 1 },
        incidentCount: 1,
        noteCount: 2,
        exportTargets: ["github-issue"],
        checklist: ["Generated summary is current."]
      })
    ).toContain("summary current");
    expect(
      formatCloseoutPlan({
        dayKey: "2026-05-04",
        generatedSummaryFresh: false,
        retentionPreview: { keepDays: 1, removedDayKeys: [], removedEntryCount: 0, removedSummaryCount: 0, removedAuditCount: 0 },
        incidentCount: 0,
        noteCount: 0,
        exportTargets: [],
        checklist: ["Select export targets before handoff."]
      })
    ).toContain("not selected");
  });

  test("describes summary freshness, bundle manifests, and gateway error categories", () => {
    const generatedSummary: GeneratedSummary = {
      summary: "Summary text",
      createdAt: "2026-05-04T09:00:00.000Z",
      source: "rules"
    };
    const freshness = describeGeneratedSummaryFreshness(generatedSummary, [
      buildEntry("2026-05-04T08:58:00.000Z"),
      buildEntry("2026-05-04T08:59:30.000Z"),
      buildEntry("2026-05-04T09:01:00.000Z")
    ]);

    expect(freshness).toMatchObject({
      isStale: true,
      lastEntryIncludedAt: "2026-05-04T08:59:30.000Z",
      latestEntryObservedAt: "2026-05-04T09:01:00.000Z"
    });
    expect(
      describeGeneratedSummaryFreshness(
        {
          ...generatedSummary,
          lastEntryIncludedAt: "2026-05-04T09:00:00.000Z",
          latestEntryObservedAt: "2026-05-04T09:02:00.000Z",
          freshnessState: "stale"
        },
        []
      )
    ).toEqual({
      isStale: true,
      lastEntryIncludedAt: "2026-05-04T09:00:00.000Z",
      latestEntryObservedAt: "2026-05-04T09:02:00.000Z"
    });
    expect(
      describeGeneratedSummaryFreshness(
        {
          ...generatedSummary,
          freshnessState: "fresh"
        },
        []
      )
    ).toEqual({ isStale: false });
    expect(formatBundleManifestPreview({ manifest: { dayKey: "2026-05-04", exportedAt: "2026-05-04T10:00:00.000Z", version: "0.1.0" }, day: { entries: [{ id: "1" }, { id: "2" }] } })).toContain(
      "2 entries"
    );
    expect(
      formatBundleManifestPreview({
        manifest: { dayKey: "2026-05-04", exportedAt: "2026-05-04T10:00:00.000Z", version: "0.1.0", signature: { algorithm: "sha256", digest: "digest-123" } },
        day: { entries: [{ id: "1" }] }
      })
    ).toContain("Digest digest-123");
    expect(
      formatBundleManifestPreview({
        manifest: { dayKey: "2026-05-04", exportedAt: "2026-05-04T10:00:00.000Z", version: "0.1.0", signature: { algorithm: "sha256" } as { algorithm: string; digest?: string } },
        day: { entries: [] }
      })
    ).toContain("Digest unavailable.");
    const baseReceipt: DeliveryReceipt = {
      id: "receipt-1",
      target: "slack",
      dayKey: "2026-05-04",
      title: "handoff",
      status: "failed",
      requestedAt: "2026-05-04T12:00:00.000Z",
      completedAt: "2026-05-04T12:00:01.000Z",
      correlationId: "corr-1",
      retryCount: 0
    };
    expect(formatReceiptDetails(baseReceipt)).toContain("Attempt 1. Secret ref unavailable.");
    expect(formatReceiptDetails({ ...baseReceipt, id: "receipt-2", retryOfReceiptId: "receipt-1", attemptNumber: 2 })).toContain("Retry of receipt-1 attempt 2.");
    expect(formatReceiptDetails({ ...baseReceipt, id: "receipt-3", correlationId: undefined, retryOfReceiptId: "receipt-1", attemptNumber: undefined })).toContain("Correlation unavailable. Retry of receipt-1 attempt 1.");
    expect(formatIntegrationVerificationReceipt({ ...baseReceipt, id: "verify-1", dryRun: true, deliveryReference: "dry-run", deadLetterReason: "delivery target is not configured" })).toBe(
      "slack dry-run receipt failed. Delivery reference dry-run. Receipt verify-1. delivery target is not configured"
    );
    expect(formatIntegrationVerificationReceipt({ ...baseReceipt, id: "verify-2", status: "sent", deliveryReference: undefined, deadLetterReason: undefined })).toBe(
      "slack dry-run receipt sent. Delivery reference unavailable. Receipt verify-2."
    );
    expect(classifyGatewayErrorCategory("gateway unavailable: Gateway connect.challenge timeout")).toBe("challenge_timeout");
    expect(classifyGatewayErrorCategory("device identity required")).toBe("device_identity");
    expect(classifyGatewayErrorCategory("token mismatch")).toBe("token");
    expect(classifyGatewayErrorCategory("missing required operator scopes")).toBe("scope");
    expect(classifyGatewayErrorCategory("pairing required")).toBe("pairing");
    expect(classifyGatewayErrorCategory(undefined)).toBe("unknown");
    expect(
      describeGeneratedSummaryFreshness(
        generatedSummary,
        []
      )
    ).toEqual({ isStale: false });
  });

  test("adds saved search presets, deduplicates by query, and caps the list", () => {
    expect(addSearchPreset([], "   ")).toEqual([]);
    expect(addSearchPreset([], "Timeout Investigation")).toEqual([
      {
        id: "timeout-investigation",
        label: "Timeout Investigation",
        query: "Timeout Investigation"
      }
    ]);
    expect(
      addSearchPreset(
        [
          { id: "timeout-investigation", label: "Timeout Investigation", query: "Timeout Investigation" },
          { id: "approval-backlog", label: "Approval Backlog", query: "Approval Backlog" }
        ],
        "timeout investigation"
      )
    ).toEqual([
      {
        id: "timeout-investigation",
        label: "timeout investigation",
        query: "timeout investigation"
      },
      { id: "approval-backlog", label: "Approval Backlog", query: "Approval Backlog" }
    ]);
    expect(
      addSearchPreset(
        [
          { id: "one", label: "one", query: "one" },
          { id: "two", label: "two", query: "two" },
          { id: "three", label: "three", query: "three" },
          { id: "four", label: "four", query: "four" },
          { id: "five", label: "five", query: "five" },
          { id: "six", label: "six", query: "six" },
          { id: "seven-old", label: "seven old", query: "seven old" },
          { id: "eight-old", label: "eight old", query: "eight old" }
        ],
        "seven"
      )
    ).toHaveLength(8);
    expect(addSearchPreset([], "!!!")).toEqual([
      {
        id: "preset",
        label: "!!!",
        query: "!!!"
      }
    ]);
  });

  test("ships the top eight investigative search presets as defaults", () => {
    expect(DEFAULT_SEARCH_PRESETS).toHaveLength(9);
    expect(DEFAULT_SEARCH_PRESETS.map((preset) => preset.query)).toEqual([
      "status:failed tool",
      "approval pending",
      "gateway reconnect",
      "sequence gap",
      "adapter failed",
      "summary stale",
      "delivery receipt",
      "plugin run",
      "\"Backfilled from OpenClaw\""
    ]);
    expect(mergeSearchPresets([])).toHaveLength(8);
    expect(mergeSearchPresets([{ id: "custom", label: "Custom", query: "custom" }])[0]).toMatchObject({ query: "custom" });
    expect(mergeSearchPresets([{ id: "dup", label: "Duplicate", query: "gateway reconnect" }])).toHaveLength(8);
  });

  test("formats monitoring imports and capability registry gates without leaking secrets", () => {
    const imported: MonitoringImportResult = {
      batchId: "monitoring-import-1",
      importedAt: "2026-05-08T12:00:00.000Z",
      provenance: {
        sourceWorkflow: ["gmail", "blogwatcher", "openclaw"],
        sourcePath: "/Users/m4/OpenClog/.env",
        sourceHash: "sha256-source",
        importedAt: "2026-05-08T12:00:00.000Z",
        lineNumbers: [2, 4],
        redactionCount: 1,
        redactedPaths: ["$.line"]
      },
      decisions: [],
      notes: [],
      incidents: [],
      handoffPackets: [
        {
          id: "packet-1",
          dayKey: "2026-05-08",
          title: "Authorization: Bearer secret",
          summary: "token=secret",
          body: "body",
          createdAt: "2026-05-08T12:00:00.000Z",
          deliveryTargets: ["github-issue", "slack", "email"],
          provenance: {
            sourceWorkflow: ["gmail"],
            sourceHash: "sha256-source",
            importedAt: "2026-05-08T12:00:00.000Z",
            lineNumbers: [4],
            redactionCount: 1,
            redactedPaths: ["$.line"]
          }
        }
      ]
    };
    const allowed: CapabilityView = {
      id: "delivery:slack",
      kind: "delivery_target",
      label: "Slack",
      purpose: "Send Slack handoffs.",
      version: "2026.05.08",
      permissions: ["delivery:slack"],
      failureModes: ["missing_config"],
      auditProvenance: ["journal_delivery_receipts"],
      approvalSignature: "local-openclog:delivery:slack",
      reviewBy: "2026-06-08",
      source: "local_manifest",
      deliveryTarget: "slack",
      useGate: { capabilityId: "delivery:slack", allowed: true, status: "available", blockers: [], checkedAt: "2026-05-08T12:00:00.000Z" }
    };
    const blocked: CapabilityView = {
      ...allowed,
      id: "delivery:email",
      label: "Email",
      approvalSignature: undefined,
      deliveryTarget: "email",
      useGate: {
        capabilityId: "delivery:email",
        allowed: false,
        status: "blocked",
        blockers: ["approval signature missing"],
        checkedAt: "2026-05-08T12:00:00.000Z"
      }
    };

    expect(formatMonitoringImportSummary(imported)).toBe(
      "Monitoring import monitoring-import-1: 0 operator note(s), 1 handoff packet(s), workflow gmail, blogwatcher, openclaw, source [LOCAL_PATH], redactions 1."
    );
    expect(formatMonitoringImportSummary(null)).toBeNull();
    expect(formatMonitoringImportSummary({ ...imported, provenance: { ...imported.provenance, sourcePath: undefined } })).toContain("source local explicit paste");
    expect(formatMonitoringImportSummary(imported)).not.toMatch(/secret|\.env/);
    expect(formatCapabilitySummary(allowed)).toContain("Slack 2026.05.08 available");
    expect(formatCapabilitySummary({ ...allowed, purpose: "Send Slack handoffs" })).toContain("Purpose: Send Slack handoffs.");
    expect(formatCapabilitySummary({ ...allowed, reviewBy: undefined, expiresAt: "2026-06-08T00:00:00.000Z" })).toContain("Review/expiry: 2026-06-08T00:00:00.000Z.");
    expect(formatCapabilitySummary(blocked)).toContain("blocked: approval signature missing");
    expect(
      formatCapabilitySummary({
        ...blocked,
        permissions: [],
        failureModes: [],
        auditProvenance: [],
        approvalSignature: undefined,
        reviewBy: undefined,
        useGate: {
          capabilityId: "delivery:email",
          allowed: false,
          status: "blocked",
          blockers: [],
          checkedAt: "2026-05-08T12:00:00.000Z"
        }
      })
    ).toContain("blocked. Purpose: Send Slack handoffs. Permissions: none. Failure modes: none. Audit: none. Approval: missing. Review/expiry: missing.");
    expect(capabilityGateAllows([allowed], "delivery:slack")).toBe(true);
    expect(capabilityGateAllows([blocked], "delivery:email")).toBe(false);
    expect(capabilityGateAllows([], "delivery:slack")).toBe(false);
  });

  test("formats attention strips, blocker drawers, exportable views, and closeout readiness safely", () => {
    expect(
      formatAttentionNowItem({
        id: "failed_dry_run_delivery",
        severity: "critical",
        label: "Failed dry-run delivery",
        detail: "Slack failed because Authorization: Bearer secret was missing.",
        evidenceIds: ["receipt-1"],
        action: "Open why blocked drawer."
      })
    ).toBe("critical: Failed dry-run delivery - Slack failed because [REDACTED_SECRET] was missing. Evidence receipt-1. Action: Open why blocked drawer.");
    expect(
      formatWhyBlocked({
        label: "Deliver to Slack",
        blockingReasons: ["missing operator.approvals", "delivery target is not configured"],
        nextSafeActions: ["Copy missing scopes", "Run a fresh dry-run"],
        evidenceIds: ["receipt-1"]
      })
    ).toBe("Deliver to Slack blocked: missing operator.approvals; delivery target is not configured. Next safe actions: Copy missing scopes; Run a fresh dry-run. Evidence: receipt-1.");
    expect(
      formatCloseoutReadiness({
        score: 42,
        label: "blocked",
        blockers: ["stale summary", "failed dry-run"],
        requiredEvidenceFresh: false
      })
    ).toBe("Closeout readiness blocked (42): stale summary; failed dry-run. Required evidence is not fresh.");
    const view = formatExportableOperatorView({
      id: "saved-secret",
      label: "Saved secret view",
      evidenceCount: 3,
      unresolvedEvidenceCount: 1,
      staleSummaryCount: 1,
      redactedJson: "{\"label\":\"Authorization: Bearer secret\",\"redacted\":true}"
    });
    expect(view).toContain("Saved secret view: 3 evidence item(s), 1 unresolved");
    expect(view).toContain("1 stale summary day(s).");
    expect(view).not.toContain("Bearer secret");
    expect(view).toContain("[REDACTED_SECRET]");
    expect(
      formatAttentionNowItem({
        id: "stale_summary",
        severity: "warning",
        label: "Stale summary",
        detail: "Summary is older than the newest receipt",
        evidenceIds: [],
        action: "Refresh summary"
      })
    ).toBe("warning: Stale summary - Summary is older than the newest receipt. Evidence none. Action: Refresh summary");
    expect(
      formatWhyBlocked({
        label: "Plugin action",
        blockingReasons: [],
        nextSafeActions: [],
        evidenceIds: []
      })
    ).toBe("Plugin action blocked: no blocker detail available. Next safe actions: collect fresh local evidence. Evidence: none.");
    expect(
      formatCloseoutReadiness({
        score: 91,
        label: "ready",
        blockers: [],
        requiredEvidenceFresh: true
      })
    ).toBe("Closeout readiness ready (91): no blockers. Required evidence is fresh.");
    expect(
      formatExportableOperatorView({
        id: "token-query",
        label: "Token query",
        evidenceCount: 1,
        unresolvedEvidenceCount: 0,
        staleSummaryCount: 1,
        lastSuccessfulSummaryAt: "2026-05-04T12:00:00.000Z",
        redactedJson: "{\"url\":\"https://example.test/callback?token=secret\"}",
        newerEvidenceExists: true,
        newerEvidenceReason: "A newer receipt landed after the saved view summary was generated."
      })
    ).toContain("token=[REDACTED_SECRET]");
    expect(
      formatExportableOperatorView({
        id: "token-query",
        label: "Token query",
        evidenceCount: 1,
        unresolvedEvidenceCount: 0,
        staleSummaryCount: 1,
        lastSuccessfulSummaryAt: "2026-05-04T12:00:00.000Z",
        redactedJson: "{\"url\":\"https://example.test/callback?token=secret\"}",
        newerEvidenceExists: true,
        newerEvidenceReason: "A newer receipt landed after the saved view summary was generated."
      })
    ).toContain("Warning: newer evidence exists. A newer receipt landed after the saved view summary was generated.");
    expect(
      formatExportableOperatorView({
        id: "token-query",
        label: "Token query",
        evidenceCount: 1,
        unresolvedEvidenceCount: 0,
        staleSummaryCount: 1,
        lastSuccessfulSummaryAt: "2026-05-04T12:00:00.000Z",
        redactedJson: "{\"url\":\"https://example.test/callback?token=secret\"}",
        newerEvidenceExists: true,
        newerEvidenceReason: "A newer receipt landed after the saved view summary was generated."
      })
    ).toContain("Last successful summary 2026-05-04T12:00:00.000Z.");
  });

  test("formats active incident badges, delivery target freshness, timeline sources, and verification comparisons", () => {
    expect(
      buildActiveIncidentBadgeText({
        id: "incident-1",
        title: "Gateway instability",
        summary: "summary",
        dayKeys: ["2026-05-04"],
        entryIds: ["entry-1"],
        createdAt: "2026-05-04T12:00:00.000Z",
        runbookSuggestions: [{ id: "runbook-1", title: "Check readiness", summary: "Check it", reason: "risk" }],
        loopProgress: { detect: true, explain: true, recommend: false, act: false, record: false },
        investigationNoteCount: 2
      })
    ).toBe("Active incident Gateway instability: 2/5 complete, next Recommend, 2 linked notes.");

    expect(
      buildActiveIncidentBadgeText({
        id: "incident-2",
        title: "Recovered incident",
        summary: "summary",
        dayKeys: ["2026-05-04"],
        entryIds: ["entry-1"],
        createdAt: "2026-05-04T12:00:00.000Z",
        runbookSuggestions: [{ id: "runbook-2", title: "Keep attached", summary: "summary", reason: "done" }],
        loopProgress: { detect: true, explain: true, recommend: true, act: true, record: true }
      })
    ).toBe("Active incident Recovered incident: 5/5 complete, next Complete, 0 linked notes.");

    expect(
      buildActiveIncidentBadgeText({
        id: "incident-3",
        title: "Suggested followup",
        summary: "summary",
        dayKeys: ["2026-05-04"],
        entryIds: ["entry-1"],
        createdAt: "2026-05-04T12:00:00.000Z",
        runbookSuggestions: []
      })
    ).toBe("Active incident Suggested followup: 2/5 complete, next Recommend, 0 linked notes.");

    expect(
      formatDeliveryTargetHealthSummary({
        target: "slack",
        status: "blocked",
        detail: "Latest dry-run verification failed closed.",
        dryRunStatus: "failed",
        latestReceiptId: "receipt-1",
        latestDryRunReceiptId: "receipt-verify-1",
        lastVerifiedAt: "2026-05-04T12:00:00.000Z",
        lastVerifiedAgeLabel: "5m",
        lastVerifiedFreshness: "fresh",
        receiptCount24h: 2,
        failedCount24h: 1,
        dryRunFailures24h: 1,
        trend: "degraded"
      })
    ).toBe("slack blocked: Latest dry-run verification failed closed. Last verified 5m ago (fresh). Latest dry-run receipt receipt-verify-1.");

    expect(
      formatTimelineEventSummary({
        id: "timeline-1",
        dayKey: "2026-05-04",
        timestamp: "2026-05-04T12:00:00.000Z",
        kind: "delivery_receipt",
        source: "delivery",
        sourceLabel: "Delivery",
        label: "Slack delivery failed",
        relatedId: "receipt-1"
      })
    ).toBe("2026-05-04T12:00:00.000Z: Delivery delivery receipt Slack delivery failed.");

    expect(
      formatVerificationReceiptComparison({
        latestFailedReceipt: {
          id: "verify-failed-1",
          command: "npm run verify",
          status: "failed",
          startedAt: "2026-05-04T12:00:00.000Z",
          completedAt: "2026-05-04T12:02:00.000Z",
          summary: "verify failed",
          ageLabel: "15m",
          freshness: "aging"
        },
        latestPassingReceipt: {
          id: "verify-pass-1",
          command: "npm run verify",
          status: "passed",
          startedAt: "2026-05-04T12:10:00.000Z",
          completedAt: "2026-05-04T12:12:00.000Z",
          summary: "verify passed",
          ageLabel: "3m",
          freshness: "fresh"
        }
      })
    ).toBe("Latest failed verify-failed-1: failed, 15m, aging. Latest passing verify-pass-1: passed, 3m, fresh.");

    expect(
      formatVerificationReceiptComparison({
        latestFailedReceipt: undefined,
        latestPassingReceipt: undefined
      })
    ).toBe("Latest failed unavailable. Latest passing unavailable.");

    expect(
      formatVerificationReceiptComparison({
        latestFailedReceipt: {
          id: "verify-failed-2",
          command: "npm run verify",
          status: "failed",
          startedAt: "2026-05-04T12:20:00.000Z",
          completedAt: "2026-05-04T12:21:00.000Z",
          summary: "verify failed again"
        },
        latestPassingReceipt: {
          id: "verify-pass-2",
          command: "npm run verify",
          status: "passed",
          startedAt: "2026-05-04T12:22:00.000Z",
          completedAt: "2026-05-04T12:23:00.000Z",
          summary: "verify passed again"
        }
      })
    ).toBe("Latest failed verify-failed-2: failed, age unavailable, unknown. Latest passing verify-pass-2: passed, age unavailable, unknown.");

    expect(
      formatDeliveryTargetHealthSummary({
        target: "email",
        status: "warning",
        detail: "Dry-run verification receipt has not been recorded yet.",
        dryRunStatus: "missing",
        receiptCount24h: 0,
        failedCount24h: 0,
        dryRunFailures24h: 0,
        trend: "steady"
      })
    ).toBe("email warning: Dry-run verification receipt has not been recorded yet. Last verified unavailable.");

    expect(
      formatDeliveryTargetHealthSummary({
        target: "github-issue",
        status: "ok",
        detail: "Dry-run verification receipt is available.",
        dryRunStatus: "passed",
        latestDryRunReceiptId: "receipt-verify-2",
        lastVerifiedAt: "2026-05-04T12:30:00.000Z",
        lastVerifiedAgeLabel: "9m",
        receiptCount24h: 1,
        failedCount24h: 0,
        dryRunFailures24h: 0,
        trend: "improving"
      })
    ).toBe("github-issue ok: Dry-run verification receipt is available. Last verified 9m ago (unknown). Latest dry-run receipt receipt-verify-2.");

    expect(
      formatDeliveryTargetHealthSummary({
        target: "slack",
        status: "ok",
        detail: "Recent live success receipt is available.",
        dryRunStatus: "passed",
        latestReceiptId: "receipt-live-1",
        latestDryRunReceiptId: "receipt-verify-3",
        lastVerifiedAt: "2026-05-04T12:32:00.000Z",
        lastVerifiedAgeLabel: "7m",
        lastVerifiedFreshness: "fresh",
        receiptCount24h: 3,
        failedCount24h: 0,
        dryRunFailures24h: 0,
        trend: "steady"
      })
    ).toBe("slack ok: Recent live success receipt is available. Last verified 7m ago (fresh). Latest dry-run receipt receipt-verify-3. Latest live receipt receipt-live-1.");

    expect(
      formatTimelineEventSummary({
        id: "timeline-2",
        dayKey: "2026-05-04",
        timestamp: "2026-05-04T12:04:00.000Z",
        kind: "verification_receipt",
        source: "gateway",
        sourceLabel: "Gateway verification",
        label: "Gateway verification blocked",
        relatedId: "verify-gateway-1",
        reasonCode: "missing_scopes"
      })
    ).toBe("2026-05-04T12:04:00.000Z: Gateway verification verification receipt Gateway verification blocked. Reason code missing_scopes.");
  });

  test("describes recovered evidence drift and summary change badges", () => {
    expect(describeRecoveredEvidenceDrift(undefined, undefined)).toBeNull();
    expect(
      describeRecoveredEvidenceDrift(
        {
          sourceLabel: "Backfilled from OpenClaw",
          entryCount: 4,
          dayCount: 1,
          dayKeys: ["2026-05-04"],
          latestImportedAt: "2026-05-04T12:30:00.000Z",
          provisionalMetrics: true,
          cacheStateLabel: "Recovered evidence changed after the last successful summary."
        },
        "2026-05-04T12:10:00.000Z"
      )
    ).toBe("Recovered evidence changed after the last successful summary. Latest recovered import 2026-05-04T12:30:00.000Z.");
    expect(
      describeRecoveredEvidenceDrift(
        {
          sourceLabel: "Backfilled from OpenClaw",
          entryCount: 4,
          dayCount: 1,
          dayKeys: ["2026-05-04"],
          latestImportedAt: "2026-05-04T12:30:00.000Z",
          provisionalMetrics: true
        },
        undefined
      )
    ).toBe("Recovered evidence changed after the last successful summary. Latest recovered import 2026-05-04T12:30:00.000Z.");
    expect(
      describeRecoveredEvidenceDrift(
        {
          sourceLabel: "Backfilled from OpenClaw",
          entryCount: 4,
          dayCount: 1,
          dayKeys: ["2026-05-04"],
          latestImportedAt: "2026-05-04T12:30:00.000Z",
          provisionalMetrics: true
        },
        "2026-05-04T12:40:00.000Z"
      )
    ).toBeNull();

    expect(
      describeChangesSinceSummary({
        freshness: {},
        entryCount: 0
      })
    ).toBeNull();
    expect(
      describeChangesSinceSummary({
        freshness: {
          lastEntryIncludedAt: "2026-05-04T12:00:00.000Z",
          latestEntryObservedAt: "2026-05-04T12:15:00.000Z"
        },
        entryCount: 3,
        recoveredEntryCount: 2,
        newerEvidenceExists: true,
        receiptCount: 4
      })
    ).toBe(
      "Changed since last summary: new journal activity observed through 2026-05-04T12:15:00.000Z, 3 visible journal entries, 4 delivery or verification receipt(s), 2 recovered OpenClaw entry(s), newer evidence landed after the saved summary."
    );
    expect(
      describeChangesSinceSummary({
        freshness: {
          lastEntryIncludedAt: "2026-05-04T12:15:00.000Z",
          latestEntryObservedAt: "2026-05-04T12:15:00.000Z"
        },
        entryCount: 1,
        recoveredEntryCount: 0,
        newerEvidenceExists: false,
        receiptCount: 0
      })
    ).toBe("Changed since last summary: 1 visible journal entry.");
    expect(
      describeChangesSinceSummary({
        freshness: {
          lastEntryIncludedAt: "2026-05-04T12:15:00.000Z"
        },
        entryCount: 0,
        recoveredEntryCount: 0,
        newerEvidenceExists: false,
        receiptCount: 0
      })
    ).toBeNull();
  });
});

function buildEntry(timestamp: string, overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: `entry-${timestamp}`,
    dayKey: "2026-05-04",
    source: "gateway",
    kind: "assistant_message",
    title: "Gateway event",
    timestamp,
    redacted: true,
    ...overrides
  };
}
