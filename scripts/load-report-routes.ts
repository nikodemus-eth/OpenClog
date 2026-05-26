interface RouteBudgetCheck {
  route: string;
  budgetMs: number;
  mode: "fixture" | "live";
  observedMs: number;
  status: "ok" | "breach";
  detail: string;
}

interface LoadHarnessOptions {
  baseUrl?: string;
  dayKey: string;
  incidentId?: string;
  sessionKey: string;
}

const DEFAULT_DAY_KEY = "2026-05-03";
const DEFAULT_SESSION_KEY = "agent:hugin:main";
const ROUTE_BUDGETS = [
  { route: "/api/operations/report", budgetMs: 250 },
  { route: "/api/verification/receipts", budgetMs: 200 },
  { route: "/api/sessions/:key", budgetMs: 300 }
] as const;

function parseArgs(argv: string[]): LoadHarnessOptions {
  const options: LoadHarnessOptions = { dayKey: DEFAULT_DAY_KEY, sessionKey: DEFAULT_SESSION_KEY };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];
    if (token === "--base-url" && value) {
      options.baseUrl = value;
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
    }
  }
  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const liveBaseUrl = options.baseUrl ?? process.env.OPENCLOG_LOAD_BASE_URL;
  const routeChecks = liveBaseUrl ? await runLiveChecks(liveBaseUrl, options) : runFixtureChecks(options);
  const breachCount = routeChecks.filter((check) => check.status === "breach").length;
  const summary = {
    generatedAt: new Date().toISOString(),
    mode: liveBaseUrl ? "live" : "fixture",
    dayKey: options.dayKey,
    incidentId: options.incidentId ?? null,
    sessionKey: options.sessionKey,
    breachCount,
    checks: routeChecks
  };
  console.log(JSON.stringify(summary, null, 2));
  if (breachCount > 0) process.exitCode = 1;
}

async function runLiveChecks(baseUrl: string, options: LoadHarnessOptions): Promise<RouteBudgetCheck[]> {
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
    checks.push({
      route: target.route,
      budgetMs: budget.budgetMs,
      mode: "live",
      observedMs,
      status: breached ? "breach" : "ok",
      detail: response.ok ? `HTTP ${response.status}; body preview ${body}` : `HTTP ${response.status}; live route failed closed`
    });
  }
  return checks;
}

function runFixtureChecks(options: LoadHarnessOptions): RouteBudgetCheck[] {
  const fixtureObservations: Record<string, number> = {
    "/api/operations/report": 148,
    "/api/verification/receipts": 112,
    "/api/sessions/:key": 164
  };
  return ROUTE_BUDGETS.map((budget) => {
    const observedMs = fixtureObservations[budget.route] ?? budget.budgetMs;
    return {
      route: budget.route,
      budgetMs: budget.budgetMs,
      mode: "fixture",
      observedMs,
      status: observedMs > budget.budgetMs ? "breach" : "ok",
      detail: `Fixture-backed route budget rehearsal for ${options.dayKey}${budget.route === "/api/sessions/:key" ? ` session ${options.sessionKey}` : ""}.`
    };
  });
}

void main();
