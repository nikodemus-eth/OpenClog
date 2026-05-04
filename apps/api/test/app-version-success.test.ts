import { describe, expect, test } from "vitest";
import { buildVersionInfo } from "../src/app.js";

describe("buildVersionInfo success path", () => {
  test("reads repo git metadata when available", () => {
    const info = buildVersionInfo();

    expect(info.version).toBeTypeOf("string");
    expect(info.commitSha.length).toBeGreaterThan(0);
    expect(info.buildTimestamp).toBeTypeOf("string");
  });
});
