import { execFileSync, spawnSync } from "node:child_process";
import type { VerificationReceipt } from "@openclog/core";
import { createSqliteRepository } from "./repository.js";

export interface VerificationRunnerOptions {
  args: string[];
  cwd?: string;
  dbPath: string;
  env?: NodeJS.ProcessEnv;
  label: string;
  now?: () => Date;
}

export interface VerificationRunnerResult {
  exitCode: number;
  receipt: VerificationReceipt;
}

export function runAndRecordVerification(options: VerificationRunnerOptions): VerificationRunnerResult {
  if (options.args.length === 0) throw new Error("verification_command_required");
  const now = options.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const [command, ...args] = options.args;
  const result = spawnSync(command!, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: "inherit"
  });
  const completedAt = now().toISOString();
  const exitCode = typeof result.status === "number" ? result.status : 1;
  const status: VerificationReceipt["status"] = exitCode === 0 && !result.error && !result.signal ? "passed" : "failed";
  const commitSha = resolveCommitSha(options.cwd);
  const receipt: VerificationReceipt = {
    id: buildVerificationReceiptId(options.label, completedAt),
    command: options.label,
    status,
    startedAt,
    completedAt,
    summary: buildVerificationSummary(options.label, exitCode, result.signal, result.error),
    ...(commitSha ? { commitSha } : {})
  };
  const repo = createSqliteRepository(options.dbPath);
  try {
    repo.saveVerificationReceipt(receipt);
  } finally {
    repo.close();
  }
  return { exitCode, receipt };
}

export function buildVerificationReceiptId(label: string, completedAt: string): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "verification";
  const timestamp = completedAt.replace(/[^0-9TZ]/g, "").replace(/Z$/, "Z");
  return `verification-${slug}-${timestamp}`;
}

function buildVerificationSummary(label: string, exitCode: number, signal: NodeJS.Signals | null, error: Error | undefined): string {
  if (error) return `${label} failed to start: ${error.message}`;
  if (signal) return `${label} terminated by ${signal}`;
  return `${label} exited ${exitCode}`;
}

function resolveCommitSha(cwd: string | undefined): string | undefined {
  try {
    const sha = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return sha || undefined;
  } catch {
    return undefined;
  }
}
