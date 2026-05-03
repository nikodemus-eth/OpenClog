import { existsSync, readFileSync } from "node:fs";

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

const api = readFileSync("api_development.md", "utf8");
for (const method of ["sessions.create", "sessions.send", "sessions.abort", "exec.approval.resolve"]) {
  if (!api.includes(method)) {
    console.error(`api_development.md must mention ${method}`);
    process.exit(1);
  }
}

