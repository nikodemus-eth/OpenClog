import { randomUUID } from "node:crypto";
import { createSqliteRepository } from "../apps/api/src/repository.js";

interface RouteBudgetCheck {
  route: string;
  budgetMs: number;
  mode: "fixture" | "live";
  observedMs: number;
  status: "ok" | "breach";
  baselineObservedMs?: number;
  trendDirection?: "improving" | "steady" | "regressing" | "new";
  trendArrow?: "↑" | "→" | "↓" | "•";
  detail: string;
}

interface LoadHarnessOptions {
  baseUrl?: string;
  dbPath?: string;
  dayKey: string;
  incidentId?: string;
  persistHistory: boolean;
  sessionKey: string;
}

const DEFAULT_DAY_KEY = "2026-05-03";
const DEFAULT_SESSION_KEY = "agent:hugin:main";
const ROUTE_BUDGETS = [
  { route: "/api/operations/report", budgetMs: 750 },
  { route: "/api/verification/receipts", budgetMs: 200 },
  { route: "/api/sessions/:key", budgetMs: 300 }
] as const;

function parseArgs(argv: string[]): LoadHarnessOptions {
  const options: LoadHarnessOptions = { dayKey: DEFAULT_DAY_KEY, sessionKey: DEFAULT_SESSION_KEY, persistHistory: true };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];
    if (token === "--base-url" && value) {
      options.baseUrl = value;
      index += 1;
    } else if (token === "--db" && value) {
      options.dbPath = value;
      index += 1;
    } else if (token === "--day-key" && value) {
      options.dayKey = value;
      index += 1;
    } else if (token === "--incident-id" && value) {
      options.incidentId = value;
      index += 1;
    } else if (token === "--session-key" && value) {
      options.sessionKey = value;
      index += 1;
    } else if (token === "--no-persist") {
      options.persistHistory = false;
    }
  }
  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const liveBaseUrl = options.baseUrl ?? process.env.OPENCLOG_LOAD_BASE_URL;
  const dbPath = options.dbPath ?? process.env.OPENCLOG_DB_PATH ?? "openclog.db";
  const repo = createSqliteRepository(dbPath);
  try {
    const routeChecks = liveBaseUrl ? await runLiveChecks(liveBaseUrl, options, repo) : runFixtureChecks(options, repo);
    if (options.persistHistory) persistRouteChecks(repo, routeChecks);
  const breachCount = routeChecks.filter((check) => check.status === "breach").length;
  const summary = {
    generatedAt: new Date().toISOString(),
    mode: liveBaseUrl ? "live" : "fixture",
    dbPath,
    dayKey: options.dayKey,
    incidentId: options.incidentId ?? null,
    persistHistory: options.persistHistory,
    sessionKey: options.sessionKey,
    breachCount,
    checks: routeChecks
  };
  console.log(JSON.stringify(summary, null, 2));
  if (breachCount > 0) process.exitCode = 1;
  } finally {
    repo.close();
  }
}

async function runLiveChecks(baseUrl: string, options: LoadHarnessOptions, repo: ReturnType<typeof createSqliteRepository>): Promise<RouteBudgetCheck[]> {
  const operationsQuery = new URLSearchParams({ dayKey: options.dayKey });
  if (options.incidentId) operationsQuery.set("incidentId", options.incidentId);
  const liveTargets = [
    { route: "/api/operations/report", url: `${baseUrl}/api/operations/report?${operationsQuery.toString()}` },
    { route: "/api/verification/receipts", url: `${baseUrl}/api/verification/receipts` },
    { route: "/api/sessions/:key", url: `${baseUrl}/api/sessions/${encodeURIComponent(options.sessionKey)}` }
  ];
  const checks: RouteBudgetCheck[] = [];
  for (const target of liveTargets) {
    const budget = ROUTE_BUDGETS.find((item) => item.route === target.route);
    if (!budget) continue;
    const startedAt = performance.now();
    const response = await fetch(target.url);
    const observedMs = Math.round(performance.now() - startedAt);
    const body = (await response.text()).slice(0, 120);
    const breached = !response.ok || observedMs > budget.budgetMs;
    checks.push(withTrend(
      repo,
      {
      route: target.route,
      budgetMs: budget.budgetMs,
      mode: "live",
      observedMs,
      status: breached ? "breach" : "ok",
      detail: response.ok ? `HTTP ${response.status}; body preview ${body}` : `HTTP ${response.status}; live route failed closed`
      }
    ));
  }
  return checks;
}

function runFixtureChecks(options: LoadHarnessOptions, repo: ReturnType<typeof createSqliteRepository>): RouteBudgetCheck[] {
  const fixtureObservations: Record<string, number> = {
    "/api/operations/report": 148,
    "/api/verification/receipts": 112,
    "/api/sessions/:key": 164
  };
  return ROUTE_BUDGETS.map((budget) => {
    const observedMs = fixtureObservations[budget.route] ?? budget.budgetMs;
    return withTrend(repo, {
      route: budget.route,
      budgetMs: budget.budgetMs,
      mode: "fixture",
      observedMs,
      status: observedMs > budget.budgetMs ? "breach" : "ok",
      detail: `Fixture-backed route budget rehearsal for ${options.dayKey}${budget.route === "/api/sessions/:key" ? ` session ${options.sessionKey}` : ""}.`
    });
  });
}

function withTrend(repo: ReturnType<typeof createSqliteRepository>, check: RouteBudgetCheck): RouteBudgetCheck {
  const previous = repo.listRouteBudgetObservations().find((item) => item.route === check.route && item.source === check.mode);
  if (!previous) return { ...check, trendDirection: "new", trendArrow: "•" };
  const trendDirection = check.observedMs > previous.observedMs ? "regressing" : check.observedMs < previous.observedMs ? "improving" : "steady";
  const trendArrow = trendDirection === "regressing" ? "↑" : trendDirection === "improving" ? "↓" : "→";
  return { ...check, baselineObservedMs: previous.observedMs, trendDirection, trendArrow };
}

function persistRouteChecks(repo: ReturnType<typeof createSqliteRepository>, checks: RouteBudgetCheck[]): void {
  const recordedAt = new Date().toISOString();
  for (const check of checks) {
    if (check.route !== "/api/operations/report" && check.route !== "/api/verification/receipts") continue;
    repo.saveRouteBudgetObservation({
      id: randomUUID(),
      route: check.route,
      observedMs: check.observedMs,
      budgetMs: check.budgetMs,
      recordedAt,
      source: check.mode
    });
  }
}

void main();
