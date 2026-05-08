import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const requiredLogs = [
  "development.md",
  "first_person.md",
  "lessons_learned.md",
  "local_llm.md",
  "cloud_llm.md",
  "security.md",
  "testing.md",
  "architecture.md",
  "api_development.md",
  "network.md"
];

const missing = requiredLogs.filter((path) => !existsSync(path));
if (missing.length > 0) {
  console.error(`Missing required logs: ${missing.join(", ")}`);
  process.exit(1);
}

const testing = readFileSync("testing.md", "utf8");
for (const phrase of ["npm run verify", "npm run verify:gateway", "Coverage Exclusions"]) {
  if (!testing.includes(phrase)) {
    console.error(`testing.md must mention ${phrase}`);
    process.exit(1);
  }
}

const visualSnapshotDir = "tests/e2e/visual.spec.ts-snapshots";
if (existsSync(visualSnapshotDir)) {
  const visualSnapshots = walk(visualSnapshotDir).filter((path) => path.endsWith(".png"));
  const totalSnapshotCount = visualSnapshots.length;
  const mobileSnapshotCount = visualSnapshots.filter((path) => path.includes("-mobile-")).length;
  const totalMentions = [...testing.matchAll(/(\d+)\s+visual snapshots/g)].map((match) => Number.parseInt(match[1] ?? "", 10));
  const mobileMentions = [...testing.matchAll(/(\d+)\s+mobile visual snapshots/g)].map((match) => Number.parseInt(match[1] ?? "", 10));
  if (totalMentions.length > 0 && !totalMentions.includes(totalSnapshotCount)) {
    console.error(`testing.md visual snapshot count is stale: expected ${totalSnapshotCount} total snapshots.`);
    process.exit(1);
  }
  if (mobileMentions.length > 0 && !mobileMentions.includes(mobileSnapshotCount)) {
    console.error(`testing.md mobile visual snapshot count is stale: expected ${mobileSnapshotCount} mobile snapshots.`);
    process.exit(1);
  }
}

const api = readFileSync("api_development.md", "utf8");
for (const method of ["sessions.create", "sessions.send", "sessions.abort", "exec.approval.resolve"]) {
  if (!api.includes(method)) {
    console.error(`api_development.md must mention ${method}`);
    process.exit(1);
  }
}

const staleProductCopy = ["OpenClaw", "Journal"].join(" ");

for (const path of walk(".")) {
  if (path === "Instructions.md") continue;
  if (!shouldScan(path)) continue;
  if (readFileSync(path, "utf8").includes(staleProductCopy)) {
    console.error(`Stale product copy outside Instructions.md: ${path}`);
    process.exit(1);
  }
}

function walk(root: string): string[] {
  const ignored = new Set([".git", "coverage", "dist", "node_modules", "output", "playwright-report"]);
  return readdirSync(root).flatMap((entry) => {
    if (ignored.has(entry)) return [];
    const path = join(root, entry).replace(/^\.\//, "");
    const stats = statSync(path);
    return stats.isDirectory() ? walk(path) : [path];
  });
}

function shouldScan(path: string): boolean {
  return [".css", ".html", ".json", ".md", ".svg", ".ts", ".tsx"].some((extension) => path.endsWith(extension));
}
