import { createHash } from "node:crypto";
import type { ReplayBundleDiff } from "@openclog/core";

export function requireMethod<T>(method: T | undefined, name: string): T {
  if (!method) throw new Error(`application_repository_missing:${name}`);
  return method;
}

export function paginateItems<T>(items: T[], limit: number, cursor?: string): { items: T[]; nextCursor?: string } {
  const pageSize = Math.max(1, Math.floor(limit));
  const offset = Number.parseInt(cursor ?? "0", 10);
  const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
  const page = items.slice(safeOffset, safeOffset + pageSize);
  const nextOffset = safeOffset + page.length;
  return {
    items: page,
    nextCursor: nextOffset < items.length ? String(nextOffset) : undefined
  };
}

export function diffRecordKeys(left: Record<string, unknown> | undefined, right: Record<string, unknown> | undefined): string[] {
  const keys = new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})]);
  return [...keys].filter((key) => JSON.stringify(left?.[key]) !== JSON.stringify(right?.[key]));
}

export function buildBundleEntryMetadata(entries: Array<{ id?: string; [key: string]: unknown }>): Record<string, unknown> {
  return Object.fromEntries(entries.map((entry) => [String(entry.id ?? "missing"), Object.keys(entry).sort()]));
}

export function classifyReplayBundleDiff(diff: {
  addedEntryIds: string[];
  removedEntryIds: string[];
  summaryChanged: boolean;
  markdownChanged: boolean;
  changedManifestFields: string[];
  changedMetadataFields: string[];
}): ReplayBundleDiff["changeClass"] {
  if (diff.addedEntryIds.length > 0 || diff.removedEntryIds.length > 0) return "evidence_shape";
  if (diff.changedMetadataFields.length > 0 || diff.changedManifestFields.length > 0) return "metadata_only";
  if (diff.summaryChanged || diff.markdownChanged) return "narrative_only";
  return "unchanged";
}

export function latestEntryAt(entries: Array<{ timestamp: string }>): string {
  return entries.reduce((latest, entry) => (entry.timestamp > latest ? entry.timestamp : latest), "");
}

export function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function sortByTimestamp<T, K extends keyof T>(items: T[], key: K, direction: "asc" | "desc" = "desc"): T[] {
  return [...items].sort((left, right) => {
    const leftValue = String(left[key] ?? "");
    const rightValue = String(right[key] ?? "");
    return direction === "asc" ? leftValue.localeCompare(rightValue) : rightValue.localeCompare(leftValue);
  });
}

export function sha256Digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
