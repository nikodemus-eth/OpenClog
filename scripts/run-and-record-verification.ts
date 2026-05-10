import { runAndRecordVerification } from "../apps/api/src/verification-receipts.js";

const parsed = parseArgs(process.argv.slice(2));

try {
  const result = runAndRecordVerification({
    args: parsed.command,
    cwd: process.cwd(),
    dbPath: parsed.dbPath,
    env: process.env,
    label: parsed.label
  });
  process.exitCode = result.exitCode;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function parseArgs(args: string[]): { command: string[]; dbPath: string; label: string } {
  let label = "";
  let dbPath = process.env.OPENCLOG_DB_PATH ?? "openclog.db";
  const separator = args.indexOf("--");
  const optionArgs = separator === -1 ? args : args.slice(0, separator);
  const command = separator === -1 ? [] : args.slice(separator + 1);
  for (let index = 0; index < optionArgs.length; index += 1) {
    const arg = optionArgs[index];
    if (arg === "--label") {
      label = optionArgs[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--db") {
      dbPath = optionArgs[index + 1] ?? "";
      index += 1;
      continue;
    }
    throw new Error(`unknown_verification_runner_option:${String(arg)}`);
  }
  if (!label) throw new Error("verification_label_required");
  if (!dbPath) throw new Error("verification_db_required");
  if (command.length === 0) throw new Error("verification_command_required");
  return { command, dbPath, label };
}
