import { describe, expect, test } from "vitest";
import { classifyComposerInput } from "../src/index.js";

describe("composer classification and blocking", () => {
  test("stores /note locally without Gateway forwarding", () => {
    expect(classifyComposerInput("/note waiting on review")).toMatchObject({
      mode: "note",
      gatewayMethod: null,
      body: "waiting on review",
      blocked: false
    });
  });

  test("uses sessions.create and sessions.send for ask and command flows", () => {
    expect(classifyComposerInput("/ask summarize today")).toMatchObject({
      mode: "ask",
      gatewayMethod: "sessions.send",
      createSessionFirst: true
    });
    expect(classifyComposerInput("/cmd create a PR")).toMatchObject({
      mode: "command",
      gatewayMethod: "sessions.send",
      createSessionFirst: true
    });
  });

  test("infers ask, command, and note colon modes from plain input", () => {
    expect(classifyComposerInput("Summarize today")).toMatchObject({ mode: "ask", body: "Summarize today" });
    expect(classifyComposerInput("Create a PR for this branch")).toMatchObject({ mode: "command" });
    expect(classifyComposerInput("Note: waiting on review")).toMatchObject({ mode: "note", body: "waiting on review" });
  });

  test("blocks admin, pairing, secrets, install, update, and config slash commands", () => {
    for (const input of ["/config set x y", "/secrets list", "/pairing approve 1", "/install plugin", "/update run"]) {
      const classified = classifyComposerInput(input);
      expect(classified.blocked).toBe(true);
      expect(classified.gatewayMethod).toBeNull();
      expect(classified.reason).toContain("requires a scope outside");
    }
  });
});
