import { useEffect } from "react";
import type { JournalEntry } from "@openclog/core";
import { buildVerificationGateFocusSelector } from "../state/operator-workspace.js";

interface UseOperatorKeyboardShortcutsInput {
  composerRef: React.RefObject<HTMLElement | HTMLTextAreaElement | null>;
  entries: JournalEntry[];
  incidentsPanelRef: React.RefObject<HTMLElement | null>;
  alertsPanelRef: React.RefObject<HTMLElement | null>;
  searchInputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  setApprovalsOpen: (value: boolean) => void;
  setExpandedEntryId: (value: string | null) => void;
  setSelectedSessionKey: (value: string) => void;
  setShortcutsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  mainRef: React.RefObject<HTMLElement | null>;
  jumpToNextMatchingEntry: (entries: JournalEntry[], predicate: (entry: JournalEntry) => boolean) => void;
  focusShellTarget: (element: HTMLElement | null | undefined, message: string) => void;
  handleApplyOperatorViewById: (viewId: string) => Promise<void>;
  onShortcutUsed?: (payload: { shortcut: string; action: string; context?: string }) => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");
}

export function useOperatorKeyboardShortcuts(input: UseOperatorKeyboardShortcutsInput) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (event.altKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        input.searchInputRef.current?.focus();
        input.onShortcutUsed?.({ shortcut: "Alt+S", action: "focus_search", context: "keyboard" });
        return;
      }
      if (isEditableTarget(event.target)) return;
      if (event.key === "?" || (event.shiftKey && (event.code === "Slash" || event.key === "/"))) {
        event.preventDefault();
        input.setShortcutsOpen((current) => !current);
      } else if (event.key === "/" || event.code === "Slash") {
        event.preventDefault();
        input.composerRef.current?.focus();
      } else if (event.key === "Escape") {
        input.setShortcutsOpen(false);
        input.setApprovalsOpen(false);
        input.setExpandedEntryId(null);
        input.setSelectedSessionKey("");
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        input.mainRef.current?.focus({ preventScroll: true });
      } else if (event.altKey && event.key.toLowerCase() === "e") {
        event.preventDefault();
        input.jumpToNextMatchingEntry(input.entries, (entry) => entry.severity === "error" || entry.status === "failed");
      } else if (event.altKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        input.jumpToNextMatchingEntry(input.entries, (entry) => entry.kind === "approval_requested" || entry.kind === "approval_resolved");
      } else if (event.altKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        input.jumpToNextMatchingEntry(input.entries, (entry) => entry.kind === "tool_result" || entry.kind === "tool_call");
      } else if (event.altKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        input.composerRef.current?.focus();
      } else if (event.altKey && event.key.toLowerCase() === "i") {
        event.preventDefault();
        input.focusShellTarget(input.incidentsPanelRef.current, "Incident workspace focused.");
        input.onShortcutUsed?.({ shortcut: "Alt+I", action: "focus_incident_workspace", context: "keyboard" });
      } else if (event.altKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        input.focusShellTarget(input.alertsPanelRef.current, "Alert workspace focused.");
        input.onShortcutUsed?.({ shortcut: "Alt+L", action: "focus_alert_workspace", context: "keyboard" });
      } else if (event.altKey && event.key.toLowerCase() === "v") {
        event.preventDefault();
        const center = document.querySelector<HTMLElement>('[aria-label="Verification Center"]');
        input.focusShellTarget(center, "Verification Center focused.");
        input.onShortcutUsed?.({ shortcut: "Alt+V", action: "focus_verification_center", context: "keyboard" });
      } else if (event.altKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        const blockedGate = document.querySelector<HTMLElement>(buildVerificationGateFocusSelector());
        input.focusShellTarget(blockedGate, "Verification failure focused.");
        input.onShortcutUsed?.({ shortcut: "Alt+F", action: "focus_blocked_verification_gate", context: "keyboard" });
      } else if (event.altKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        const blockedAction = document.querySelector<HTMLElement>('[data-blocked-action="true"]');
        input.focusShellTarget(blockedAction, "Blocked action focused.");
        input.onShortcutUsed?.({ shortcut: "Alt+B", action: "focus_blocked_action", context: "keyboard" });
      } else if (event.altKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        const recoveredEvidence = document.querySelector<HTMLElement>('[data-recovered-evidence-section="true"]');
        if (recoveredEvidence) {
          input.focusShellTarget(recoveredEvidence, "Recovered evidence surfaces focused.");
          input.onShortcutUsed?.({ shortcut: "Alt+R", action: "focus_recovered_evidence", context: "keyboard" });
          return;
        }
        input.onShortcutUsed?.({ shortcut: "Alt+R", action: "open_recovered_evidence_view", context: "keyboard" });
        void input.handleApplyOperatorViewById("backfilled-openclaw");
      } else if (event.altKey && event.key.toLowerCase() === "m") {
        event.preventDefault();
        const morningCommand = document.querySelector<HTMLElement>('[aria-label="Morning command"]');
        if (morningCommand) {
          input.focusShellTarget(morningCommand, "Morning command focused.");
          input.onShortcutUsed?.({ shortcut: "Alt+M", action: "focus_morning_command", context: "keyboard" });
          return;
        }
        input.onShortcutUsed?.({ shortcut: "Alt+M", action: "open_morning_command_view", context: "keyboard" });
        void input.handleApplyOperatorViewById("stale-summaries");
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    input.alertsPanelRef,
    input.composerRef,
    input.entries,
    input.focusShellTarget,
    input.handleApplyOperatorViewById,
    input.incidentsPanelRef,
    input.jumpToNextMatchingEntry,
    input.mainRef,
    input.onShortcutUsed,
    input.searchInputRef,
    input.setApprovalsOpen,
    input.setExpandedEntryId,
    input.setSelectedSessionKey,
    input.setShortcutsOpen
  ]);
}
