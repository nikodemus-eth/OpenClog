import { useEffect } from "react";
import type { JournalEntry } from "@openclog/core";

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
      } else if (event.altKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        input.focusShellTarget(input.alertsPanelRef.current, "Alert workspace focused.");
      } else if (event.altKey && event.key.toLowerCase() === "v") {
        event.preventDefault();
        const center = document.querySelector<HTMLElement>('[aria-label="Verification Center"]');
        input.focusShellTarget(center, "Verification Center focused.");
      } else if (event.altKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        const blockedGate = document.querySelector<HTMLElement>('[data-verification-gate-status="blocked"]');
        input.focusShellTarget(blockedGate, "Verification failure focused.");
      } else if (event.altKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        const blockedAction = document.querySelector<HTMLElement>('[data-blocked-action="true"]');
        input.focusShellTarget(blockedAction, "Blocked action focused.");
      } else if (event.altKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        const recoveredEvidence = document.querySelector<HTMLElement>('[data-recovered-evidence-section="true"]');
        if (recoveredEvidence) {
          input.focusShellTarget(recoveredEvidence, "Recovered evidence surfaces focused.");
          return;
        }
        void input.handleApplyOperatorViewById("backfilled-openclaw");
      } else if (event.altKey && event.key.toLowerCase() === "m") {
        event.preventDefault();
        const morningCommand = document.querySelector<HTMLElement>('[aria-label="Morning command"]');
        if (morningCommand) {
          input.focusShellTarget(morningCommand, "Morning command focused.");
          return;
        }
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
    input.searchInputRef,
    input.setApprovalsOpen,
    input.setExpandedEntryId,
    input.setSelectedSessionKey,
    input.setShortcutsOpen
  ]);
}
