import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const forbidden = /\b(?:sessions_create|sessions_send|sessions_abort|exec_approval_resolve)\b/;
const roots = ["apps", "packages", "scripts"];
const ignored = new Set(["node_modules", "dist", "coverage", "test", "tests", "dist-types"]);
const offenders: string[] = [];

for (const root of roots) scan(join(process.cwd(), root));

if (offenders.length > 0) {
  console.error(`Forbidden underscore Gateway RPC names found:\n${offenders.join("\n")}`);
  process.exit(1);
}

function scan(path: string): void {
  const stat = statSync(path);
  if (stat.isDirectory()) {
    if (ignored.has(path.split("/").at(-1) ?? "")) return;
    for (const entry of readdirSync(path)) scan(join(path, entry));
    return;
  }
  if (!/\.(?:ts|tsx|js|jsx)$/.test(path)) return;
  if (path.endsWith("scripts/check-forbidden-rpc.ts")) return;
  const text = readFileSync(path, "utf8");
  if (forbidden.test(text)) offenders.push(path);
}
