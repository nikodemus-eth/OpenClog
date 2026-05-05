import type {
  BundleVerificationResult,
  DeliveryReceipt,
  DeliveryRequestOptions,
  PluginExecutionResult,
  PluginManifest,
  ReplayWorkspace
} from "@openclog/core";
import type { ApplicationRepository, PaginatedListResult } from "./contracts.js";
import { buildBundleEntryMetadata, diffRecordKeys, paginateItems, requireMethod, sha256Digest, sortByTimestamp } from "./utils.js";

export function buildDeliveryModule(repo: ApplicationRepository) {
  return {
    buildIntegrationPayload({ target, dayKey }: { target: "github-issue" | "markdown-vault" | "incident-doc" | "slack" | "generic-webhook" | "email"; dayKey: string }) {
      return requireMethod(repo.buildIntegrationPayload, "buildIntegrationPayload")(target, dayKey);
    },
    deliverIntegration({
      target,
      dayKey,
      incidentId,
      idempotencyKey,
      dryRun,
      secretRef
    }: { target: DeliveryReceipt["target"]; dayKey: string } & DeliveryRequestOptions): DeliveryReceipt {
      return requireMethod(repo.deliverIntegration, "deliverIntegration")(target, dayKey, { incidentId, idempotencyKey, dryRun, secretRef });
    },
    createGithubIssue({ dayKey, incidentId, idempotencyKey, dryRun, secretRef }: { dayKey: string } & DeliveryRequestOptions): DeliveryReceipt {
      return requireMethod(repo.createGithubIssue, "createGithubIssue")(dayKey, { incidentId, idempotencyKey, dryRun, secretRef });
    },
    listDeliveryReceipts({
      cursor,
      limit = 20,
      sort = "requestedAt:desc"
    }: {
      cursor?: string;
      limit?: number;
      sort?: "requestedAt:asc" | "requestedAt:desc" | "status:asc" | "status:desc";
    } = {}): PaginatedListResult<DeliveryReceipt> {
      const receipts = requireMethod(repo.listDeliveryReceipts, "listDeliveryReceipts")();
      const sorted =
        sort === "requestedAt:asc"
          ? sortByTimestamp(receipts, "requestedAt", "asc")
          : sort === "status:asc"
            ? [...receipts].sort((left, right) => left.status.localeCompare(right.status) || right.requestedAt.localeCompare(left.requestedAt))
            : sort === "status:desc"
              ? [...receipts].sort((left, right) => right.status.localeCompare(left.status) || right.requestedAt.localeCompare(left.requestedAt))
              : sortByTimestamp(receipts, "requestedAt", "desc");
      return paginateItems(sorted, limit, cursor);
    },
    verifyReplayBundle(bundle: { manifest?: Record<string, unknown>; day?: { dayKey?: string; entries?: unknown[] }; markdown?: string }): BundleVerificationResult {
      const digest = sha256Digest(JSON.stringify(bundle.day ?? {}));
      const manifestDigest = typeof bundle.manifest?.signature === "object" && bundle.manifest?.signature && "digest" in bundle.manifest.signature
        ? String((bundle.manifest.signature as { digest?: unknown }).digest ?? "")
        : "";
      const reasons: string[] = [];
      if (!manifestDigest) reasons.push("manifest signature missing");
      if (manifestDigest && manifestDigest !== digest) reasons.push("manifest digest mismatch");
      return { verified: reasons.length === 0, digest, reasons };
    },
    createReplayWorkspace(dayKey: string): ReplayWorkspace {
      return requireMethod(repo.createReplayWorkspace, "createReplayWorkspace")(dayKey);
    },
    inspectReplayBundle(bundle: { day?: { dayKey?: string; entries?: unknown[] }; markdown?: string }) {
      const verification = requireMethod(repo.verifyReplayBundle, "verifyReplayBundle")({
        ...bundle,
        day: {
          dayKey: bundle.day?.dayKey,
          entries: Array.isArray(bundle.day?.entries)
            ? bundle.day?.entries.filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null)
            : []
        }
      });
      return {
        dayKey: bundle.day?.dayKey ?? "unknown",
        entryCount: Array.isArray(bundle.day?.entries) ? bundle.day.entries.length : 0,
        markdownPreview: typeof bundle.markdown === "string" ? bundle.markdown.slice(0, 500) : "",
        verification
      };
    },
    diffReplayBundles({
      left,
      right
    }: {
      left: { manifest?: Record<string, unknown>; day?: { dayKey?: string; summary?: string; entries?: Array<{ id?: string; [key: string]: unknown }> }; markdown?: string };
      right: { manifest?: Record<string, unknown>; day?: { dayKey?: string; summary?: string; entries?: Array<{ id?: string; [key: string]: unknown }> }; markdown?: string };
    }) {
      const leftEntries = Array.isArray(left.day?.entries) ? left.day.entries : [];
      const rightEntries = Array.isArray(right.day?.entries) ? right.day.entries : [];
      const leftIds = new Set(leftEntries.map((entry) => entry.id).filter((id): id is string => typeof id === "string"));
      const rightIds = new Set(rightEntries.map((entry) => entry.id).filter((id): id is string => typeof id === "string"));
      const addedEntryIds = [...rightIds].filter((id) => !leftIds.has(id));
      const removedEntryIds = [...leftIds].filter((id) => !rightIds.has(id));
      const summaryChanged = (left.day?.summary ?? "") !== (right.day?.summary ?? "");
      const markdownChanged = (left.markdown ?? "") !== (right.markdown ?? "");
      const changedManifestFields = diffRecordKeys(left.manifest, right.manifest);
      const changedMetadataFields = diffRecordKeys(buildBundleEntryMetadata(leftEntries), buildBundleEntryMetadata(rightEntries));
      return {
        changeClass:
          addedEntryIds.length > 0 || removedEntryIds.length > 0
            ? "evidence_shape"
            : changedMetadataFields.length > 0 || changedManifestFields.length > 0
              ? "metadata_only"
              : summaryChanged || markdownChanged
                ? "narrative_only"
                : "unchanged",
        leftDayKey: left.day?.dayKey ?? "unknown",
        rightDayKey: right.day?.dayKey ?? "unknown",
        addedEntryIds,
        removedEntryIds,
        summaryChanged,
        markdownChanged,
        entryCountDelta: rightEntries.length - leftEntries.length,
        changedManifestFields,
        changedMetadataFields
      };
    },
    registerPlugin(plugin: PluginManifest): PluginManifest {
      const normalized: PluginManifest = {
        ...plugin,
        supportsDryRun: plugin.supportsDryRun !== false,
        actionIds: plugin.actionIds ?? ["run_plugin"],
        validationStatus: plugin.capabilities.length > 0 ? "valid" : "blocked",
        validationMessage: plugin.capabilities.length > 0 ? undefined : "Plugin must declare at least one capability."
      };
      return requireMethod(repo.registerPlugin, "registerPlugin")(normalized);
    },
    listPlugins(): PluginManifest[] {
      return requireMethod(repo.listPlugins, "listPlugins")();
    },
    runPlugin({ pluginId, dryRun }: { pluginId: string; dryRun?: boolean }): PluginExecutionResult {
      return requireMethod(repo.runPlugin, "runPlugin")(pluginId, { dryRun });
    }
  };
}
