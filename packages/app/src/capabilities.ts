import type {
  CapabilityManifest,
  CapabilityUseGate,
  CapabilityView,
  DeliveryAdapterTarget,
  IncidentActionKind,
  PluginManifest
} from "@openclog/core";
import type { ApplicationRepository } from "./contracts.js";
import { requireMethod } from "./utils.js";

const manifestVersion = "2026.05.08";
const defaultReviewBy = "2026-06-08";

export function incidentActionCapabilityId(actionId: IncidentActionKind): string {
  return `incident-action:${actionId}`;
}

export function deliveryCapabilityId(target: DeliveryAdapterTarget): string {
  return `delivery:${target}`;
}

export function pluginCapabilityId(pluginId: string): string {
  return `plugin:${pluginId}`;
}

export function buildCapabilitiesModule(repo: ApplicationRepository) {
  return {
    listCapabilities({ now = new Date().toISOString() }: { now?: string } = {}): CapabilityView[] {
      return buildCapabilityViews(repo, now);
    },
    getCapability({ capabilityId, now = new Date().toISOString() }: { capabilityId: string; now?: string }): CapabilityView {
      const capability = buildCapabilityViews(repo, now).find((item) => item.id === capabilityId);
      if (!capability) throw new Error(`capability_not_found:${capabilityId}`);
      return capability;
    },
    assertCapabilityReady({ capabilityId, now = new Date().toISOString() }: { capabilityId: string; now?: string }): CapabilityView {
      const capability = buildCapabilityViews(repo, now).find((item) => item.id === capabilityId);
      if (!capability) throw new Error(`capability_not_found:${capabilityId}`);
      if (!capability.useGate.allowed) throw new Error(`capability_blocked:${capabilityId}:${capability.useGate.blockers.join(",")}`);
      return capability;
    },
    saveCapabilityManifest(manifest: CapabilityManifest): CapabilityManifest {
      return requireMethod(repo.saveCapabilityManifest, "saveCapabilityManifest")(manifest);
    }
  };
}

export function buildCapabilityViews(repo: ApplicationRepository, now: string): CapabilityView[] {
  const stored = repo.listCapabilityManifests ? repo.listCapabilityManifests() : [];
  const plugins = repo.listPlugins ? repo.listPlugins() : [];
  const manifests = mergeCapabilityManifests([...defaultCapabilityManifests(), ...stored, ...plugins.map(pluginToCapabilityManifest)]);
  return manifests.map((manifest) => ({
    ...manifest,
    useGate: assessCapabilityForUse(manifest, now)
  }));
}

export function assessCapabilityForUse(manifest: CapabilityManifest, now: string): CapabilityUseGate {
  const blockers: string[] = [];
  if (!manifest.approvalSignature?.trim()) blockers.push("approval signature missing");
  if (manifest.permissions.length === 0) blockers.push("permissions missing");
  if (manifest.failureModes.length === 0) blockers.push("failure modes missing");
  if (manifest.auditProvenance.length === 0) blockers.push("audit provenance missing");
  if (!manifest.reviewBy && !manifest.expiresAt) blockers.push("review or expiry date missing");
  const reviewByMs = manifest.reviewBy ? Date.parse(manifest.reviewBy) : Number.NaN;
  const expiresAtMs = manifest.expiresAt ? Date.parse(manifest.expiresAt) : Number.NaN;
  const nowMs = Date.parse(now);
  if (Number.isFinite(expiresAtMs) && Number.isFinite(nowMs) && expiresAtMs < nowMs) blockers.push("capability expired");
  if (!Number.isFinite(expiresAtMs) && Number.isFinite(reviewByMs) && Number.isFinite(nowMs) && reviewByMs < nowMs) blockers.push("capability review overdue");
  const status = blockers.includes("capability expired")
    ? "expired"
    : blockers.includes("capability review overdue")
      ? "review_required"
      : blockers.length > 0
        ? "blocked"
        : "available";
  return {
    capabilityId: manifest.id,
    allowed: blockers.length === 0,
    status,
    blockers,
    checkedAt: now
  };
}

function mergeCapabilityManifests(manifests: CapabilityManifest[]): CapabilityManifest[] {
  const byId = new Map<string, CapabilityManifest>();
  for (const manifest of manifests) byId.set(manifest.id, manifest);
  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function pluginToCapabilityManifest(plugin: PluginManifest): CapabilityManifest {
  const blocked = plugin.validationStatus === "blocked";
  return {
    id: pluginCapabilityId(plugin.id),
    kind: "plugin",
    label: plugin.label,
    purpose: plugin.purpose ?? `Run local plugin ${plugin.label} within declared validation metadata.`,
    version: plugin.version,
    permissions: plugin.readScopes.map((scope) => `read:${scope}`),
    failureModes: plugin.failureModes ?? (blocked ? ["validation_blocked"] : ["plugin_failed", "dry_run_required"]),
    auditProvenance: plugin.auditProvenance ?? ["journal_plugins", "journal_plugin_runs"],
    approvalSignature: blocked ? undefined : (plugin.approvalSignature ?? `local-openclog:plugin:${plugin.id}`),
    reviewBy: plugin.reviewBy ?? defaultReviewBy,
    expiresAt: plugin.expiresAt,
    source: "plugin_validation",
    pluginId: plugin.id
  };
}

function defaultCapabilityManifests(): CapabilityManifest[] {
  const incidentActions: Array<{ id: IncidentActionKind; label: string; purpose: string; permissions: string[]; failureModes: string[] }> = [
    { id: "rebuild_visible_state", label: "Rebuild visible state", purpose: "Record a local visible-state rebuild request from persisted evidence.", permissions: ["journal:write"], failureModes: ["evidence_incomplete"] },
    { id: "open_raw_logs", label: "Open raw logs", purpose: "Record that an operator reviewed the raw-log evidence path.", permissions: ["journal:read"], failureModes: ["evidence_unavailable"] },
    { id: "open_replay", label: "Open replay", purpose: "Open local mission replay evidence for incident review.", permissions: ["replay:read"], failureModes: ["replay_unavailable"] },
    { id: "open_correlation", label: "Open correlation", purpose: "Open the local correlation graph for incident review.", permissions: ["correlation:read"], failureModes: ["graph_unavailable"] },
    { id: "copy_incident_packet", label: "Copy incident packet", purpose: "Prepare a redacted incident packet for handoff.", permissions: ["incident:read"], failureModes: ["clipboard_unavailable", "evidence_incomplete"] },
    { id: "deliver_slack", label: "Notify Slack", purpose: "Send incident handoff packets through the Slack delivery target.", permissions: ["delivery:slack"], failureModes: ["missing_config", "network", "authentication"] },
    { id: "deliver_generic_webhook", label: "Notify webhook", purpose: "Send incident handoff packets through the generic webhook delivery target.", permissions: ["delivery:generic-webhook"], failureModes: ["missing_config", "network", "validation"] },
    { id: "deliver_email", label: "Notify email", purpose: "Send incident handoff packets through the email delivery target.", permissions: ["delivery:email"], failureModes: ["missing_config", "network", "authentication"] },
    { id: "create_github_issue", label: "Create GitHub issue", purpose: "Create a GitHub issue from the local incident handoff.", permissions: ["delivery:github-issue"], failureModes: ["missing_config", "authentication", "network"] },
    { id: "run_plugin", label: "Run plugin", purpose: "Run a locally validated plugin through declared boundaries.", permissions: ["plugin:run"], failureModes: ["plugin_not_found", "validation_blocked"] },
    { id: "refresh_summary", label: "Refresh summary", purpose: "Regenerate local summary state from persisted journal evidence.", permissions: ["summary:write"], failureModes: ["summary_failed"] },
    { id: "save_note", label: "Save note", purpose: "Attach an operator investigation note to the incident.", permissions: ["notes:write"], failureModes: ["note_body_required"] },
    { id: "record_closeout", label: "Record closeout", purpose: "Capture a closeout note after incident review.", permissions: ["notes:write", "incident:record"], failureModes: ["note_body_required"] }
  ];
  const deliveryTargets: DeliveryAdapterTarget[] = ["github-issue", "slack", "generic-webhook", "email"];
  return [
    ...incidentActions.map((action) => ({
      id: incidentActionCapabilityId(action.id),
      kind: "incident_action" as const,
      label: action.label,
      purpose: action.purpose,
      version: manifestVersion,
      permissions: action.permissions,
      failureModes: action.failureModes,
      auditProvenance: ["journal_incident_action_records", "journal_audit_log"],
      approvalSignature: `local-openclog:incident-action:${action.id}`,
      reviewBy: defaultReviewBy,
      source: "local_manifest" as const,
      actionId: action.id
    })),
    ...deliveryTargets.map((target) => ({
      id: deliveryCapabilityId(target),
      kind: "delivery_target" as const,
      label: deliveryTargetLabel(target),
      purpose: `Build, verify, and deliver redacted handoff payloads through ${deliveryTargetLabel(target)}.`,
      version: manifestVersion,
      permissions: [`delivery:${target}`],
      failureModes: target === "github-issue" ? ["authentication", "network", "missing_config"] : ["missing_config", "network", "validation"],
      auditProvenance: ["journal_delivery_receipts", "journal_audit_log"],
      approvalSignature: `local-openclog:delivery:${target}`,
      reviewBy: defaultReviewBy,
      source: "local_manifest" as const,
      deliveryTarget: target
    })),
    {
      id: "governance:integrity-monitor",
      kind: "governance_surface",
      label: "Integrity monitor",
      purpose: "Run local integrity checks across redaction, replay, retention, plugin, and delivery evidence.",
      version: manifestVersion,
      permissions: ["integrity:read", "integrity:write"],
      failureModes: ["schema_health", "redaction_invariants", "plugin_capability_boundary"],
      auditProvenance: ["journal_integrity_reports"],
      approvalSignature: "local-openclog:governance:integrity-monitor",
      reviewBy: defaultReviewBy,
      source: "local_manifest"
    },
    {
      id: "governance:closeout",
      kind: "governance_surface",
      label: "Closeout",
      purpose: "Prepare and complete local incident closeout only after evidence, notes, summaries, and exports are ready.",
      version: manifestVersion,
      permissions: ["closeout:write"],
      failureModes: ["summary_stale", "missing_incident", "missing_note", "missing_export_target"],
      auditProvenance: ["journal_closeout_completions", "journal_audit_log"],
      approvalSignature: "local-openclog:governance:closeout",
      reviewBy: defaultReviewBy,
      source: "local_manifest"
    }
  ];
}

function deliveryTargetLabel(target: DeliveryAdapterTarget): string {
  if (target === "github-issue") return "GitHub issue";
  if (target === "generic-webhook") return "Generic webhook";
  return target[0].toUpperCase() + target.slice(1);
}
